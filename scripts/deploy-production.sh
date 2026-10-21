#!/bin/bash
# Administrative template; install manually as /usr/local/sbin/tennis-api-deploy.
# Never sudo the repository copy or update the installed script from CD.
set -Eeuo pipefail
set +x
export PATH=/usr/sbin:/usr/bin:/sbin:/bin
export HOME=/root DOCKER_CONFIG=/root/.docker
unset DOCKER_HOST DOCKER_CONTEXT COMPOSE_FILE COMPOSE_PROJECT_NAME BASH_ENV ENV
umask 077
cd /etc/tennis-api
fail() { printf 'Deployment refused: %s\n' "$*" >&2; exit 1; }
[[ $EUID == 0 && $# == 2 ]] || fail 'Expected root, SHA and digest.'
sha=$1
digest=$2
[[ "$sha" =~ ^[0-9a-f]{40}$ && "$digest" =~ ^sha256:[0-9a-f]{64}$ ]] || fail 'Invalid release.'
# Keep Docker/migration output out of SSM. Only root may read the detailed log.
log_file=$(mktemp /var/lib/tennis-api-deploy/deploy.XXXXXXXX.log)
exec 3>&1
exec > "$log_file" 2>&1
on_exit() {
  local status=$?
  if (( status == 0 )); then
    printf 'Deployment completed successfully.\n' >&3
  else
    printf 'Deployment failed. Inspect the root-only deployment log on EC2; no automatic restore.\n' >&3
  fi
}
trap on_exit EXIT
image="ghcr.io/sabriner/tennis-api@$digest"
export API_IMAGE="$image"
exec 9>/var/lib/tennis-api-deploy/deploy.lock
flock -n 9 || fail 'Another deployment holds the lock.'

# Public repository: fail closed if GitHub is unavailable or rate-limited.
check_ci() {
  /usr/bin/python3 - "$sha" <<'PY'
import json, sys, urllib.request
sha = sys.argv[1]
base = 'https://api.github.com/repos/sabrineR/tennis-api/'
def get(path):
    request = urllib.request.Request(base + path, headers={
        'Accept': 'application/vnd.github+json', 'User-Agent': 'tennis-api-deploy'})
    with urllib.request.urlopen(request, timeout=20) as response:
        return json.load(response)
if get('git/ref/heads/master')['object']['sha'] != sha:
    sys.exit('Master changed')
runs = get('actions/workflows/ci.yml/runs?branch=master&event=push&head_sha=' + sha)['workflow_runs']
runs = [r for r in runs if r['head_sha'] == sha and r['head_branch'] == 'master']
if not runs:
    sys.exit('No CI run')
latest = max(runs, key=lambda r: r['id'])
if latest['status'] != 'completed' or latest['conclusion'] != 'success':
    sys.exit('CI not successful')
PY
}
compose() { /usr/bin/docker compose --env-file /etc/tennis-api/.env.production -p tennis-api-prod -f /etc/tennis-api/compose.yml "$@"; }
check_ci
compose config --quiet
db_id=$(compose ps -q db)
api_id=$(compose ps -q api)
[[ -n "$db_id" && -n "$api_id" ]] || fail 'Existing production services required.'
[[ "$(docker inspect -f '{{.State.Health.Status}}' "$db_id")" == healthy ]] || fail 'Database unhealthy.'
[[ "$(docker inspect -f '{{.State.Health.Status}}' "$api_id")" == healthy ]] || fail 'API unhealthy.'
volume=$(docker inspect -f '{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql/data"}}{{.Name}}{{end}}{{end}}' "$db_id")
[[ "$volume" == tennis-api-prod_postgres_data ]] || fail 'Unexpected PostgreSQL volume.'
query() { docker exec -i "$db_id" sh -c 'exec psql -X -v ON_ERROR_STOP=1 -At -U "$POSTGRES_USER" -d "$POSTGRES_DB"'; }
[[ "$(query <<'SQL'
SELECT current_database();
SQL
)" == tennis ]] || fail 'Unexpected database.'
[[ "$(query <<'SQL'
SELECT count(*) FROM players WHERE id IN (17,52,65,95,102);
SQL
)" == 5 ]] || fail 'Original players missing.'
snapshot() {
  query <<'SQL'
SELECT jsonb_agg(to_jsonb(p) ORDER BY p.id) FROM (
 SELECT id, firstname, lastname, shortname, sex, "countryCode", "countryPicture",
 picture, rank, points, weight, height, age, last FROM players WHERE id IN (17,52,65,95,102)
) p;
SQL
}
release="/var/backups/tennis-api/$(date -u +%Y%m%dT%H%M%SZ)-${sha:0:12}"
mkdir "$release"
snapshot > "$release/players.before.json"
env_hash=$(sha256sum /etc/tennis-api/.env.production)
previous_image=$(docker inspect -f '{{.Image}}' "$api_id")
docker image tag "$previous_image" "tennis-api:rollback-$(basename "$release")"
printf '%s\n' "previous_image=$previous_image" "target=$image" "sha=$sha" "db=$db_id" "volume=$volume" > "$release/release.txt"

# Never build or mount repository files, host paths or the Docker socket.
docker pull "$image"
[[ "$(docker image inspect -f '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$image")" == "$sha" ]] || fail 'Image revision mismatch.'
docker pull "ghcr.io/sabriner/tennis-api:sha-$sha"
docker image inspect -f '{{range .RepoDigests}}{{println .}}{{end}}' "ghcr.io/sabriner/tennis-api:sha-$sha" \
  | grep -Fx -- "$image" > /dev/null || fail 'SHA tag and digest mismatch.'
check_ci
docker exec "$db_id" sh -c 'exec pg_dump -Fc -U "$POSTGRES_USER" -d "$POSTGRES_DB"' > "$release/database.dump"
[[ -s "$release/database.dump" ]] || fail 'Empty backup.'
docker exec -i "$db_id" pg_restore --list < "$release/database.dump" > "$release/archive.list"
[[ -s "$release/archive.list" ]] || fail 'Unreadable archive.'
(cd "$release" && sha256sum database.dump > database.dump.sha256 && sha256sum --check database.dump.sha256)
check_ci
# Keep the old API until migrations succeed. A failed migration may change schema.
compose run --rm --no-deps -T --entrypoint node api dist/database/migrate.js up
snapshot > "$release/players.after-migration.json"
cmp -s "$release/players.before.json" "$release/players.after-migration.json" || fail 'Original data changed.'
compose up -d --no-deps --no-build --force-recreate --wait --wait-timeout 180 api
new_api=$(compose ps -q api)
[[ "$(docker inspect -f '{{.Image}}' "$new_api")" == "$(docker image inspect -f '{{.Id}}' "$image")" ]] || fail 'Wrong image running.'
[[ "$(compose ps -q db)" == "$db_id" ]] || fail 'Database container changed.'
snapshot > "$release/players.after.json"
cmp -s "$release/players.before.json" "$release/players.after.json" || fail 'Original data changed.'
[[ "$(sha256sum /etc/tennis-api/.env.production)" == "$env_hash" ]] || fail 'Environment changed.'
printf '%s\n' "$sha" > "$release/healthy.sha"
printf 'API healthy. Backup retained at %s; HTTPS check follows in Actions.\n' "$release"
