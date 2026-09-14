# Cloth & Care

Laundry management app for a small business, designed to run on the client's own
PC and be used from any device on their private network. No cloud hosting.

## Architecture

- **Backend** (`ClothNCare/`): Spring Boot 4 (Java 17+) + SQLite + JWT auth.
  REST API for auth, customers, orders, services, dashboard analytics, and PDF
  invoice generation. Serves the built React frontend from static resources.
- **Frontend** (`ClothNCareFrontend/cloth-n-care-ui/`): React 19 + Vite +
  TypeScript. Single-page app with login, dashboard, orders (invoice
  download/print, order tag printing), customers, and services.
- The whole app is one JAR; frontend is bundled into it at build time.

## Development

Frontend (dev, port 5173, talks directly to the backend on port 8080):

```
cd ClothNCareFrontend/cloth-n-care-ui
npm install
npm run dev
```

Backend:

```
cd ClothNCare/ClothNCare
$env:JWT_SECRET_KEY = "some-secret-at-least-32-chars"
.\mvnw.cmd spring-boot:run
```

Set a `JWT_SECRET_KEY` environment variable (min 32 chars). The app will refuse
to start without one.

## Build for the client (LAN deployment)

Run once on a dev machine:

```
powershell -ExecutionPolicy Bypass -File scripts\build.ps1
```

This builds the frontend, copies it into the backend static resources, packages
the JAR, and assembles `release/`:

```
release/
  ClothNCare.jar        # the whole app
  start.bat             # double-click launcher (generates JWT secret on first run)
  README-CLIENT.txt     # plain-English instructions for the client
  data/                 # SQLite database (seeded from dev DB if present)
  invoices/             # generated PDFs land here
```

Copy the `release/` folder to the client PC (Java 17+ installed), and the client
double-clicks `start.bat`. The app listens on port 8080 and is reachable from
other devices on the same network at `http://<PC-IP>:8080`.

## Security notes (why things are the way they are)

- The JWT secret is **never** in the repository. `start.bat` generates a random
  one on first run and keeps it in `jwt-secret.txt` next to the JAR. Changing it
  invalidates all logins.
- The SQLite database (customer/order data) and generated invoices are
  git-ignored and stay on the client machine.
- Public registration cannot create `ADMIN` accounts.
- Invoice PDFs require authentication (browser downloads them via the signed-in
  session).
- WhatsApp auto-delivery was intentionally removed for v1 because it relied on
  an unofficial WhatsApp API that can break or get a number banned. Invoices are
  delivered by download/print instead.

## Backups

The only data store is `data/clothncare.db` next to the JAR. Back it up by
copying the `data` folder while the app is stopped (or occasionally while
running — SQLite is safe to copy in WAL-off mode).
