# ERPNext v16 (local, demo machine only)

Runs the judges-visible ERPNext behind the Cloudflare tunnel. First-run
verification is still pending: this box has no Docker daemon, so bring-up +
seed have been written and reviewed but never executed. The demo machine
needs Docker with sudo before rehearsal.

## 1. Bring-up (official frappe_docker, pinned app image)

```bash
git clone https://github.com/frappe/frappe_docker
cd frappe_docker
cp /path/to/erp-fish/infra/erpnext/.env.example .env   # then fill secrets
docker compose \
  --env-file .env \
  -f compose.yaml \
  -f overrides/compose.mariadb.yaml \
  -f overrides/compose.redis.yaml \
  up -d
```

`ERPNEXT_VERSION=v16.52.1` is pinned in our `.env.example` (tag verified on
Docker Hub 2026-10-24, amd64+arm64). Follow the frappe_docker README if their
override filenames drift — ours are the documented set at time of writing.

## 2. Create the demo site

```bash
docker compose exec backend bench new-site erp.demo.local \
  --mariadb-user-host-login-scope=% \
  --db-root-password "$DB_ROOT_PASSWORD" \
  --admin-password "$ADMIN_PASSWORD" \
  --install-app erpnext
```

Open `http://localhost:8080`, log in as `Administrator`. The site must show
Setup Wizard completion before seeding (Company creation needs a set-up site;
if the wizard blocks REST company creation, finish it in the browser first).

## 3. Seed demo masters (idempotent, check-then-create)

```bash
cd /path/to/erp-fish/apps/api
cp ../../infra/erpnext/seed.env.example .env.seed   # fill password
SEED_ERP_BASE_URL=http://localhost:8080 \
SEED_ADMIN_PASSWORD="$ADMIN_PASSWORD" \
bun scripts/seed-erpnext.ts
```

Seeds Company (`Demo Fish Company`), Supplier `DEMO-SUP-001`, Customer
`DEMO-CUST-001`, Items `DEMO-ITEM-01/02`, Warehouse `Main Warehouse` —
matching `packages/shared` DEMO fixtures and `tests/fixtures/demo-invoice.pdf`.
Re-running creates nothing new (search by name first). If ERPNext renames the
warehouse (`Main Warehouse - DFC`), answer the demo Q&A with the real full
name once — memory stores it per host from then on.

## 4. Point the tunnel

See `../tunnel/README.md`. Tunnel target is `http://localhost:8080`.
Freeze one stable `https://…` URL and never restart it mid-demo.
