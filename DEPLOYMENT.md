# Deploy su Fly.io con Turso

Il deploy usa un unico processo persistente che serve sia Next.js sia Socket.IO
sulla porta `3000`. Il [Caddyfile](./Caddyfile) resta utile solo per l'ambiente
locale e non viene usato su Fly.io.

## Prerequisiti

- account Fly.io e `flyctl` autenticato;
- account Turso e CLI `turso` autenticata;
- repository GitHub remoto da collegare dopo la preparazione locale.

## Creare e inizializzare Turso

```bash
turso db create indovina-chi
turso db show indovina-chi
turso db tokens create indovina-chi
turso db shell indovina-chi < scripts/turso-schema.sql
```

Conservare URL e token come segreti: non inserirli in `.env.example`, Git o
nell'immagine Docker.

Per migrare le board locali, inclusa la board predefinita:

```bash
export TURSO_DATABASE_URL='libsql://...'
export TURSO_AUTH_TOKEN='...'
export LOCAL_DATABASE_URL='file:./db/custom.db'
npm run db:turso:migrate-boards
```

La migrazione usa gli ID esistenti e fa `upsert`, quindi può essere rieseguita
senza creare duplicati.

## Deploy Fly.io

Il file [fly.toml](./fly.toml) configura una macchina sempre attiva con porta
HTTP interna `3000`. Il Dockerfile imposta `NEXT_PUBLIC_SOCKET_MODE=same-origin`,
quindi il browser collega Socket.IO allo stesso dominio pubblico di Next.js.

```bash
fly launch --no-deploy
fly secrets set \
  DATABASE_URL='file:./db/custom.db' \
  TURSO_DATABASE_URL='libsql://...' \
  TURSO_AUTH_TOKEN='...'
fly deploy
fly logs
```

`TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN` attivano automaticamente l'adapter
libSQL in [src/lib/db.ts](./src/lib/db.ts). In assenza di questi valori, lo
sviluppo locale usa SQLite.

## GitHub

Il remote GitHub non viene configurato automaticamente. Dopo aver creato il
repository remoto e fornito il suo URL:

```bash
git remote add origin <URL_REPOSITORY>
git push -u origin main
```

Successivamente il deploy può essere eseguito manualmente con `fly deploy` o
automatizzato tramite GitHub Actions usando un `FLY_API_TOKEN` come secret.
