# Tennis API

REST API for listing tennis players, retrieving a player by ID, creating players, and calculating country win ratios, average BMI, and median player height.

## Stack and architecture

- NestJS 12 and TypeScript 6.
- PostgreSQL 17, Sequelize 6, and Umzug migrations.
- Jest and Supertest.
- Swagger / OpenAPI, class-validator, and class-transformer.
- Docker and Docker Compose for local PostgreSQL, isolated E2E PostgreSQL, and a production application image.

The project follows a feature-first, lightweight Clean Architecture:

```text
src/
├── players/
│   ├── domain/           # Entity, input types, repository contract
│   ├── application/      # List, get, and create use cases
│   ├── infrastructure/   # Sequelize model, repository, persistence mapper
│   └── presentation/     # HTTP controller, DTOs, response mapper
├── stats/
│   ├── domain/           # Pure statistics calculations
│   ├── application/      # Statistics use case
│   └── presentation/     # HTTP controller and response DTO
├── database/             # Connection, migrations, initial data
└── shared/               # Application errors and HTTP configuration
```

Domain and application logic remain independent of NestJS and Sequelize. NestJS modules assemble dependencies through factory providers. Schema changes use migrations, never `sequelize.sync()`.

## Prerequisites

- Node.js 22.22.3+ in the 22.x release line, or 24.15+ in the 24.x release line (recommended), with npm.
- Docker Desktop with Linux containers, or Docker Engine with Docker Compose.
- Available application and PostgreSQL ports.

**Windows PowerShell:** If npm commands are blocked by the PowerShell execution policy, use `npm.cmd` instead of `npm`.

Run commands from the project root. Examples use PowerShell; on macOS/Linux, use the equivalent file-copy command.

## Installation and environment

```powershell
npm ci
Copy-Item .env.example .env
```

Edit `.env` and replace the example password. The Windows development environment uses:

```dotenv
DB_HOST=127.0.0.1
DB_PORT=15432
DB_NAME=tennis
DB_USER=tennis
DB_PASSWORD=<choose-a-local-password>
DB_SSL=false
```

`.env.example` defaults to port `5432`. Change it in your local `.env` when needed. **The PostgreSQL host port setting `DB_PORT` must match the Docker Compose published PostgreSQL port.** With `DB_PORT=15432`, the mapping is `127.0.0.1:15432 → container:5432`.

NestJS currently runs on the host. Keep `DB_HOST=127.0.0.1` for this setup. Environment files containing passwords must remain local.

## Start the project

Start PostgreSQL and wait for its healthcheck:

Development uses `docker-compose.yml`, which Docker Compose discovers automatically. The project name and persistent volume remain unchanged by the filename rename.

```powershell
docker compose up -d --wait db
docker compose ps
```

Compile before running migrations or the seed, which execute JavaScript from `dist/`:

```powershell
npm run build
npm run db:migrate
npm run db:seed
npm run start:dev
```

The API is available at `http://localhost:3000/api` by default. The optional `PORT` environment variable changes the HTTP port.

The seed initializes the five original players from `src/database/seeders/players.json`, preserves their original IDs, skips existing IDs without overwriting their data, and aligns the PostgreSQL ID sequence. **Run it for initial setup; do not rerun it unnecessarily.** Migrations apply only pending changes.

To run the compiled application instead of watch mode:

```powershell
npm run start:prod
```

## Endpoints

| Method | Path | Response |
| --- | --- | --- |
| GET | `/api/players` | `200`, `{ "players": [...] }`, ordered by rank ascending, then ID ascending |
| GET | `/api/players/:id` | `200` with the player, or `404` if absent |
| POST | `/api/players` | `201` with the created player and generated ID |
| GET | `/api/stats` | `200` with country win ratio, average BMI, and median height |

`GET /api/players/` is also accepted as the list route. Player IDs must be positive integers; invalid IDs return `400`.

### Swagger

- Interactive documentation: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
- OpenAPI JSON: [http://localhost:3000/api/docs-json](http://localhost:3000/api/docs-json)

Swagger documents request validation, nested objects, examples, and HTTP responses. **POST, including Swagger's “Try it out”, creates a real player in the connected database.**

## Request and response examples

Read players:

```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/players
Invoke-RestMethod -Uri http://localhost:3000/api/players/17
```

Example POST body, also illustrating the nested player format. Do not include an `id`:

```json
{
  "firstname": "Alex",
  "lastname": "Example",
  "shortname": "A.EXA",
  "sex": "M",
  "country": {
    "picture": "https://example.com/country.png",
    "code": "FRA"
  },
  "picture": "https://example.com/player.png",
  "data": {
    "rank": 100,
    "points": 500,
    "weight": 80000,
    "height": 185,
    "age": 25,
    "last": [1, 0, 1]
  }
}
```

A successful POST returns this structure with an additional generated `id`. All properties are required. Unknown properties, including `id`, are rejected. Weight is in grams, height in centimetres, and `last` contains only `0` (loss) or `1` (win).

Statistics for the five original players:

```json
{
  "bestCountry": { "code": "SRB", "winRatio": 1 },
  "averageBmi": 23.36,
  "medianHeightCm": 185
}
```

Country ratios use total wins divided by total matches. Countries without matches are ignored; ties use alphabetical country-code order. Average BMI is the mean of individual BMIs after unit conversion. For an even player count, median height is the mean of the two middle heights.

Only HTTP presentation rounds BMI to two decimal places and win ratios to four. An empty player list produces three `null` statistics; when no matches exist, only `bestCountry` is `null`.

Example missing-player response:

```json
{
  "statusCode": 404,
  "code": "PLAYER_NOT_FOUND",
  "message": "Player with ID 999 not found"
}
```

Invalid requests return `400`. Unexpected technical errors return `500` with a generic message, without SQL, credentials, stack traces, or internal causes.

## Tests

Run unit tests without PostgreSQL:

```powershell
npm test
```

E2E tests use a separate Compose project, `tennis-api-test`, and exclusively the `tennis_test` database. They use the real Sequelize repository, check connection identity before writes, and apply existing migrations automatically. Development data and the development seed are not used.

Prepare the test environment:

```powershell
Copy-Item .env.test.example .env.test
```

Set `TEST_DB_PORT=25432` and choose a dedicated `TEST_DB_PASSWORD`. Keep this port available and distinct from development PostgreSQL. The test bootstrap ignores the development `.env`.

Run tests sequentially and always remove the temporary environment:

```powershell
npm run test:db:up
try {
    npm run test:e2e -- --runInBand
} finally {
    npm run test:db:down
}
```

Test PostgreSQL uses temporary storage; its data is discarded when the container is removed. NestJS and Sequelize are closed by test cleanup.

## Stop the project

Stop NestJS with `Ctrl+C` in its terminal.

Stop development PostgreSQL:

```powershell
docker compose down
```

This preserves the development database volume. To stop and remove only the test environment:

```powershell
npm run test:db:down
```

## Production Docker setup (EC2 Ubuntu 24.04)

The production configuration is prepared for a manual deployment; no AWS deployment or CD pipeline is configured here. Use `docker-compose.prod.yml` explicitly to keep its `tennis-api-prod` project and volume separate from development and tests.

On the server, create the environment file and set a strong, unique `DB_PASSWORD`:

```bash
cp .env.production.example .env.production
chmod 600 .env.production
```

`API_HTTP_PORT` selects the EC2 host port; `PORT` selects the API container port. `API_BIND_ADDRESS` defaults to `0.0.0.0`; use `127.0.0.1` with a host reverse proxy. Restrict inbound traffic with the EC2 security group. PostgreSQL has no published port: only the API reaches `db:5432` over the private Docker backend network. The API also has a separate frontend network for its published HTTP port.

Validate and start only after reviewing the target environment:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml config --quiet
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build --wait
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

The multi-stage image contains compiled output and production dependencies, runs as a non-root user, and excludes environment files from the build context. Both services restart unless explicitly stopped. PostgreSQL must become healthy before the API starts; the API applies pending Umzug migrations and then starts NestJS. A failed migration prevents HTTP startup. The API healthcheck reads `/api/players`, checking HTTP and database access without writes.

Startup migrations assume a single API instance on this EC2 host. For multiple concurrent instances, use a separate migration step before starting them. The seed is never run automatically. Initial data loading, if required, must be explicitly approved and performed once against the intended production database.

Check logs or stop the production stack without deleting its persistent database volume:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=100 api
docker compose --env-file .env.production -f docker-compose.prod.yml down
```

Do not use `down -v` on a database that must be retained. Keep database backups outside the instance. Configure HTTPS through a reverse proxy or load balancer before exposing real traffic; this Compose file exposes HTTP only. Changing initialization credentials in `.env.production` does not update an already initialized PostgreSQL volume.
