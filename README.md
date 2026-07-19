# GestioneLupi

Gestionale multi-gruppo per richieste, moduli e documenti scout. I dati
applicativi vivono in PostgreSQL; i file restano nel Google Drive della singola
branca.

La specifica completa e in [SPECIFICA_PROGETTO.md](./SPECIFICA_PROGETTO.md).
La procedura passo passo per pubblicare il servizio e in
[GUIDA_DEPLOY.md](./GUIDA_DEPLOY.md).

## Avvio locale

Requisiti: Node.js 22 o 24 e PostgreSQL.

```bash
cp .env.example .env
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Aprire `http://localhost:3000`.

Per aggiungere i dati dimostrativi impostare `SEED_DEMO=true` prima del seed.

Controlli disponibili:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Deploy su Render

Il file `render.yaml` crea un Web Service Node e un database PostgreSQL. Dopo la
creazione vanno valorizzate almeno `SUPER_ADMIN_EMAIL` e
`SUPER_ADMIN_PASSWORD`; Drive e Gmail richiedono inoltre le credenziali OAuth di
Google Cloud indicate in `.env.example`.

Il filesystem di Render non viene usato per conservare documenti.

Il piano gratuito va bene per prove e uso sporadico, ma il PostgreSQL gratuito
di Render scade dopo 30 giorni. Per un archivio reale bisogna quindi usare un
database persistente a pagamento o esterno e predisporre backup regolari. La
procedura e le limitazioni sono spiegate nella guida di deploy.
