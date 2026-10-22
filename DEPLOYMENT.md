# Deploy su Render con Turso

Il deploy usa un unico Web Service Docker che serve Next.js e Socket.IO
sulla stessa porta `3000`. I dati persistenti delle board sono conservati su
Turso; il filesystem del servizio Render resta effimero.

## Turso

La tabella `Board` viene creata usando [scripts/turso-schema.sql](./scripts/turso-schema.sql).
Per importare le board dal database SQLite locale, imposta temporaneamente:

```bash
export TURSO_DATABASE_URL='libsql://...'
export TURSO_AUTH_TOKEN='...'
export LOCAL_DATABASE_URL='file:./db/custom.db'
npm run db:turso:migrate-boards
```

La migrazione usa gli ID esistenti e fa `upsert`, quindi può essere rieseguita
senza creare duplicati.

## Render

Nel dashboard Render crea un **Web Service** collegato al repository GitHub:

- branch: `main`;
- environment: `Docker`;
- instance type: `Free`;
- Dockerfile: `Dockerfile`.

Configura queste variabili d'ambiente nel servizio:

```text
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
NODE_ENV=production
```

Render usa il comando definito nel Dockerfile:

```dockerfile
CMD ["npx", "tsx", "server.ts"]
```

Il servizio Free può andare in sleep dopo un periodo senza traffico; il primo
accesso successivo può quindi richiedere più tempo. Turso mantiene comunque
persistenti le board e le immagini.

## Sviluppo locale

In assenza delle variabili Turso, [src/lib/db.ts](./src/lib/db.ts) usa SQLite
locale tramite `DATABASE_URL`. Per avviare il server persistente:

```bash
npm run build
npm start
```
