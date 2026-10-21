# Manual production deployment through Systems Manager

CD is **manual only** (`workflow_dispatch`) on the latest `master` commit whose
latest push CI has succeeded. The workflow builds a **linux/amd64** image on
GitHub Actions, publishes it to GHCR, then deploys its **digest**, not a tag.
The existing CI workflow, application, migrations and development Compose are
unchanged. No seed is run automatically.

Target: `tennis-api-server`, instance `i-066749c37a26e8556`, region `eu-west-3`.
Public URL: https://tennis-api.duckdns.org.

## Execution and security boundary

1. Check manual event, master HEAD and successful CI for that exact SHA.
2. Build/publish `ghcr.io/sabriner/tennis-api:sha-<SHA>` and collect the digest.
3. Request temporary AWS credentials through GitHub OIDC; no permanent AWS keys.
4. Recheck master/CI and invoke only `TennisApiDeployProductionV1`, version `1`,
   pinned to the administrator-approved AWS document SHA-256 hash.
5. SSM Agent runs the fixed document as root. Only `CommitSha` and `ImageDigest`
   are accepted, with strict patterns and `ENV_VAR` interpolation. No `commands`,
   path, repository, script body or Compose options are accepted from the caller.
6. The document calls `/usr/local/sbin/tennis-api-deploy` with a cleaned environment.
   That script independently rechecks master/CI and uses only protected Compose.
7. Actions polls the actual plugin result until `Success` **and response code 0**.
   Only then does it GET `/api/players` and `/api/stats` through verified HTTPS.

The document uses the `aws:runShellScript` **plugin** with fixed commands; it does
not invoke or authorize the generic `AWS-RunShellScript` **document**. GitHub
cannot replace the installed script, upload shell commands or edit the document.
No SSH key, deployment SSH user, sudo rule or inbound SSH access is needed by CD.
Do not automatically remove existing administrator SSH access during migration.

## Local files

| File | Purpose / administrative destination |
| --- | --- |
| `.github/workflows/cd.yml` | Manual build, GHCR publication, OIDC, SSM polling, HTTPS |
| `scripts/deploy-production.sh` | Reviewed template for `/usr/local/sbin/tennis-api-deploy` |
| `scripts/production/compose.yml` | Reviewed template for `/etc/tennis-api/compose.yml` |
| `scripts/production/ssm-document.json` | Custom Command document, schema 2.2 |
| `scripts/production/iam-trust-policy.json` | Exact GitHub repository/environment OIDC trust |
| `scripts/production/iam-deploy-policy.json` | Restricted Run Command and result-reading permissions |

The old SSH wrapper and sudoers templates have been removed locally. CD never
installs these templates on EC2; an administrator must review and install them.

## IAM and SSM prerequisites — manual setup only

### EC2 managed node

- Instance is Online in SSM, with SSM Agent **3.3.2746.0 or newer** to support
  `ENV_VAR` parameter interpolation. Older agents fail parameter validation;
  there is deliberately no unsafe raw-substitution fallback.
- Keep the instance's own managed-node IAM role separate from the GitHub role.
  Verify its existing SSM permissions (typically `AmazonSSMManagedInstanceCore`)
  and outbound access required by SSM. Do not grant the GitHub deployment role
  to the instance or attach administrator permissions.
- Docker/Compose with `--wait`, `/usr/bin/docker`, Bash, Python 3, `flock`,
  SHA-256 tools and enough disk for images, logs and a full dump.
- Outbound HTTPS to GitHub and GHCR. Server CI checks use the public GitHub API;
  network failure or rate limiting refuses deployment.
- GHCR package accessible to EC2. Prefer a public package for this public test
  project; its first publication may be private until an administrator changes
  visibility. Private packages require a separately managed read-only registry
  credential for root; never send it as an SSM parameter.

### GitHub OIDC role

Replace every `ACCOUNT_ID` placeholder in the two IAM templates with your actual
12-digit AWS account ID before using them. No account ID is assumed here.

Create/reuse the IAM OIDC provider `https://token.actions.githubusercontent.com`
with audience `sts.amazonaws.com`. Create a **dedicated** GitHub role using the
trust template and only the deployment policy; no broader attached policy.

Trust requires exactly:

```text
aud = sts.amazonaws.com
sub = repo:sabrineR/tennis-api:environment:production
```

With a GitHub environment, `sub` identifies the environment rather than a branch.
Restrict environment `production` to master, protect master and require reviewers
where available. Both workflow and root script also check master and CI; the
trust policy alone does not prove the trigger is manual or CI succeeded.

Permissions granted:

- `ssm:SendCommand` only for the exact custom-document ARN and the exact EC2
  instance ARN in `eu-west-3`.
- `ssm:GetCommandInvocation` only, for result tracking, with a region condition.
  This action does not support resource-level scoping, so its resource is `*`:
  the role could read other known command invocations in that region. It has no
  command-listing permission. Treat this unavoidable read scope as a limitation.

There is no permission to create/update/delete/share documents, use generic
documents, start sessions, cancel commands, modify EC2/IAM, read Secrets Manager
or access S3/CloudWatch Logs. Keep document administration in a separate trusted
administrator role. Do not attach policies that widen these permissions.

### GitHub environment variables

Set these non-secret variables under environment **production**:

| Variable | Value |
| --- | --- |
| `AWS_ACCOUNT_ID` | Your AWS account ID |
| `AWS_DEPLOY_ROLE_ARN` | ARN of the dedicated OIDC deployment role |
| `SSM_DEPLOY_DOCUMENT_SHA256` | AWS-reported Sha256 hash of approved document version 1 |

Actions requests `contents: read`, `actions: read`, `packages: write` and
`id-token: write`. The GitHub token publishes GHCR; AWS credentials are temporary
(1800 seconds). No AWS access-key secrets or SSH secrets are used. Existing SSH
secrets may be removed manually after confirming the transition.

## EC2 installation commands — review before executing

No command below has been run by this preparation. Use a trusted administrative
session, not the CD role. Transfer individually reviewed files to the root-only
staging directory `/root/tennis-api-cd-install/`. Never install directly from an
automatically updated checkout, and never run `sudo` on the repository script.

Confirmed resources, reused without recreation:

```text
project: tennis-api-prod
db: tennis-api-prod-db-1
api: tennis-api-prod-api-1
volume: tennis-api-prod_postgres_data
networks: tennis-api-prod_backend, tennis-api-prod_frontend
database: tennis
```

The protected Compose declares both networks and the volume as **external**.
Missing resources cause failure rather than creation of an empty database.
Confirm Caddy reaches the host's `127.0.0.1:3000`. If its upstream differs, review
the protected Compose before installing; this preparation never edits Caddy.

```bash
sudo install -d -o root -g root -m 0700 /etc/tennis-api \
  /var/lib/tennis-api-deploy /var/backups/tennis-api
sudo install -o root -g root -m 0755 \
  /root/tennis-api-cd-install/deploy-production.sh /usr/local/sbin/tennis-api-deploy
sudo install -o root -g root -m 0600 \
  /root/tennis-api-cd-install/compose.yml /etc/tennis-api/compose.yml

# First installation only: copy without printing or overwriting existing secrets.
sudo test ! -e /etc/tennis-api/.env.production
sudo install -o root -g root -m 0600 \
  /home/ubuntu/tennis-api/.env.production /etc/tennis-api/.env.production

sudo bash -n /usr/local/sbin/tennis-api-deploy
sudo namei -l /usr/local/sbin/tennis-api-deploy
sudo namei -l /etc/tennis-api/compose.yml
```

Run the `test` guard separately and proceed with copying only if it succeeds.
If the protected environment file already exists, preserve it and verify it
privately instead. The original checkout `.env.production` remains untouched;
the protected copy becomes the source used by CD. Keep it root-owned, mode 600.
All installed scripts/configuration and parent directories must be non-writable
by repository editors or unprivileged accounts. Ensure scripts have LF endings.

This setup needs no Docker-group membership for `ubuntu`. SSM Agent already
executes the approved script as root; no deployment sudoers rule is needed.
If the previous SSH mechanism was installed, separately review disabling its
deployment key, wrapper and sudo rule. Do not alter administrator access blindly.

## Create the approved SSM document — administrator only

Using a trusted AWS administrator session, after reviewing the JSON:

```bash
aws ssm create-document --region eu-west-3 \
  --name TennisApiDeployProductionV1 --document-type Command \
  --document-format JSON --content file://scripts/production/ssm-document.json

aws ssm describe-document --region eu-west-3 \
  --name TennisApiDeployProductionV1 --document-version 1 \
  --query 'Document.{Version:DocumentVersion,Hash:Hash,HashType:HashType}'
```

Confirm `HashType` is `Sha256`, then store the returned hash in the GitHub
environment variable. Do not substitute an unverified local file checksum for
the AWS-reported hash. Version `1` and the hash are both pinned in SendCommand.
Only trusted administrators may edit/delete/recreate/share this document.
For a future approved change, prefer a newly named document and an explicit
review of IAM/workflow/hash changes instead of silently replacing defaults.

Creating the OIDC provider, role/policy and document are manual AWS changes that
require approval; this preparation performs none of them. No example Run Command
is supplied as an installation test because it would trigger a real deployment.

## Data protection and execution order

The installed script:

1. Locks deployment, checks master/CI, healthy existing services, database identity,
   expected PostgreSQL volume and presence of IDs `17,52,65,95,102`.
2. Records the five players, environment checksum and previous image; retains a
   rollback image tag, then pulls and verifies the requested digest/revision.
3. Takes `pg_dump -Fc`, requires a nonempty archive, reads its catalog using
   `pg_restore --list`, and calculates/verifies SHA-256 **before migrations**.
4. Runs `node dist/database/migrate.js up` in a temporary constrained API container
   while the existing API stays running. It compares the original players again.
5. Recreates only `api` using `--no-deps --no-build`, waits for health, verifies
   image identity and unchanged DB container, players and protected environment.

No `db` up/recreation, volume deletion, seed, migration undo or automatic restore
is performed. The five original players are compared field-for-field. This detects
damage but cannot prevent destructive SQL inside an approved migration.

Docker compatibility: the production Dockerfile copies `dist` and runtime
dependencies. Nest's build root is `src`, so `src/database/migrate.ts` becomes
`dist/database/migrate.js`; Umzug imports the existing compiled migration and
tracks `SequelizeMeta`. The protected Compose overrides the Dockerfile's default
startup command with `node dist/main.js`, so migration runs only in the explicit
migration step. It also overrides entrypoint, healthcheck and numeric UID/GID
1000, uses read-only rootfs, drops capabilities, and mounts no host directory or
Docker socket into the application. The existing manual production Compose and
Dockerfile defaults are unchanged.

## Logs, backups and command completion

SSM parameters contain only SHA and digest. No password, token, environment file
or command text is submitted from Actions. There is no shell tracing or raw
`compose config`, environment dump or container log export.

The script redirects detailed Docker, Python and migration output to root-only
`/var/lib/tennis-api-deploy/deploy.*.log` (umask 077). These files may contain
sensitive technical errors and must not be uploaded or pasted into Actions.
SSM output receives only a generic success/failure message. Actions queries only
status/response code and never prints StandardOutputContent/StandardErrorContent.
CloudWatch output is disabled and no S3 output destination is configured; SSM
still retains its normal invocation output/agent execution records. Restrict
administrator access to them. Future script/document changes must retain this
output discipline; it cannot sanitize deliberately malicious application code.

Backups and metadata remain root-only under:

```text
/var/backups/tennis-api/<UTC timestamp>-<short SHA>/
  release.txt
  database.dump
  database.dump.sha256
  archive.list
  players.before.json
  players.after-migration.json
  players.after.json
  healthy.sha
```

Archive inspection is **not a complete restoration test**. No rotation, deletion
or automatic restore is configured. Monitor disk space and arrange a manually
approved protected off-instance copy; backups on the same instance do not cover
its loss. The dump covers the database, not cluster roles/global objects.

SSM has a 60-second delivery timeout and a 900-second plugin execution timeout.
Actions polls up to 1200 seconds, retrying initial `InvocationDoesNotExist`
(eventual consistency); other tracking errors fail closed. All non-success final
statuses stop the workflow before HTTPS. The command ID is recorded for diagnosis.
If Actions is cancelled, loses tracking or times out, the remote deployment can
continue. Inspect that command before retrying; no automatic cancellation or
restore is attempted. The root-owned lock prevents concurrent script execution.
An execution timeout can also leave a Docker-managed migration container running
after its client exits. An administrator must inspect both the SSM command and
any migration container before retrying; the lock alone cannot cover an orphaned
container after the script has terminated.

## Remaining risks and first-run checks

- An image's SHA tag/label is a consistency check, not signed build provenance.
  Protect GHCR publishers, master, workflows, migrations and production approvals.
- Migrations use the existing DB account. They can change data/schema and must be
  reviewed and backward-compatible with the old API, which runs during migration.
- Review container access to EC2 instance metadata/instance-role credentials.
  Rootfs/capability restrictions do not block metadata by themselves. Consider
  IMDSv2 and network restrictions in a separately approved AWS/host change.
- Replacement briefly interrupts service. A failed new API is not automatically
  reverted. Review schema compatibility before an operator-driven image rollback;
  database recovery is a separate approved action that may lose later writes.
- IAM's invocation-read wildcard and environment-based OIDC subject are documented
  limitations, not reasons to widen SendCommand or grant generic shell access.
- Master can advance after the final check; the selected digest remains fixed.
- Account ID, IAM permissions, actual SSM document validation, agent version,
  GHCR access, Caddy upstream and first deployment must still be verified manually.

No live AWS call, image publication, deployment, commit or push is performed by
preparing these files. Only dispatch the published workflow after explicit approval
and the above administrative setup.

Local preparation checks passed: Actionlint, Bash syntax for the root script and
fixed SSM command block, Compose configuration with fictitious credentials, JSON
parsing and 11 parameter-pattern checks. The existing local production-check
image contains `dist/main.js`, `dist/database/migrate.js`, the compiled migration,
Sequelize and Umzug. This is not a fresh image build or a live AWS/IAM validation.

References:
[GitHub OIDC on AWS](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws),
[SSM secure parameter handling](https://docs.aws.amazon.com/systems-manager/latest/userguide/documents-creating-content.html),
[SendCommand options](https://docs.aws.amazon.com/cli/latest/reference/ssm/send-command.html),
[GetCommandInvocation](https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_GetCommandInvocation.html).
