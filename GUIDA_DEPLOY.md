# Guida deploy GestioneLupi

Questa guida porta dalla repository a un'installazione funzionante su Render,
con un account Google separato per ogni branca. I file rimangono su Google
Drive; PostgreSQL conserva solo utenti, richieste, stati, riferimenti ai file e
cronologia.

## 1. Prima di iniziare

Servono:

- la repository GitHub aggiornata;
- un account Render;
- un progetto Google Cloud;
- un account Google per ciascuna branca che vuole collegare Drive;
- un indirizzo e una password iniziale per il super admin.

Per dati reali non usare il PostgreSQL gratuito di Render come archivio
definitivo: attualmente viene eliminato dopo 30 giorni. Anche il Web Service
gratuito si sospende dopo un periodo di inattivita e il primo accesso successivo
puo essere lento. Per l'esercizio stabile scegliere un database persistente e
attivare backup periodici.

## 2. Creare il servizio su Render

1. Pubblicare la repository su GitHub.
2. In Render scegliere **New > Blueprint** e collegare la repository.
3. Render leggera `render.yaml` e proporra il Web Service `gestionelupi` e il
   database `gestionelupi-db`.
4. Inserire i valori richiesti:
   - `SUPER_ADMIN_EMAIL`: email del proprietario della piattaforma;
   - `SUPER_ADMIN_PASSWORD`: password iniziale robusta;
   - le variabili Google descritte nella sezione seguente.
5. Avviare il Blueprint. Il comando di partenza applica le migrazioni e crea o
   aggiorna il super admin.
6. Controllare `https://gestionelupi.onrender.com/api/health`: con database
   disponibile deve restituire uno stato positivo.
7. Accedere da `https://gestionelupi.onrender.com/login` e cambiare la password
   iniziale prima di invitare altre persone.

`APP_ENCRYPTION_KEY` viene generata da Render e cifra i token Google. Non va
cambiata dopo aver collegato le branche; se viene ruotata, ogni branca dovra
ricollegare il proprio account Google.

## 3. Configurare Google Cloud

Nel progetto Google Cloud:

1. Abilitare **Google Drive API**, **Gmail API** e **Google Picker API**.
2. Configurare la schermata consenso OAuth. In fase di prova si puo lasciare
   l'app in modalita test e aggiungere come utenti di prova gli account delle
   branche.
3. Aggiungere gli scope:
   - `https://www.googleapis.com/auth/drive`;
   - `https://www.googleapis.com/auth/userinfo.email`;
   - `https://www.googleapis.com/auth/gmail.send`, solo per l'invio dalla mail
     della branca.
4. Creare un client OAuth di tipo **Web application**.
5. Impostare come origine JavaScript autorizzata:
   `https://gestionelupi.onrender.com`.
6. Impostare come URI di reindirizzamento autorizzato:
   `https://gestionelupi.onrender.com/api/google/callback`.
7. Creare una API key per Google Picker, limitandola al dominio del sito e alla
   Picker API.

Inserire poi in Render:

| Variabile | Valore |
| --- | --- |
| `GOOGLE_CLIENT_ID` | Client ID OAuth della Web application |
| `GOOGLE_CLIENT_SECRET` | Client secret OAuth |
| `GOOGLE_REDIRECT_URI` | `https://gestionelupi.onrender.com/api/google/callback` |
| `NEXT_PUBLIC_GOOGLE_API_KEY` | API key usata da Google Picker |
| `NEXT_PUBLIC_GOOGLE_APP_ID` | Numero del progetto Google Cloud |

Le variabili `NEXT_PUBLIC_*` servono durante la build: dopo averle aggiunte,
eseguire un nuovo deploy completo su Render.

Lo scope `drive` permette al portale di riconoscere anche le sottocartelle gia
esistenti nella cartella della branca, evitando doppioni come due cartelle con lo
stesso nome del ragazzo. Per una cartella Drive gia esistente usare il pulsante
**Scegli da Drive** oppure incollare il link della cartella.

## 4. Collegare una branca

1. Il capo registra la branca dal collegamento presente nella pagina di login.
2. Il super admin la approva dalla propria dashboard.
3. L'account condiviso della branca accede e apre **Impostazioni**.
4. Seleziona **Collega Google**, autorizza Drive e, se desiderato, Gmail.
5. Sceglie la cartella principale della branca con Google Picker.

Quando viene caricato il primo documento di un ragazzo, il portale crea
automaticamente la sua cartella. Il nome del file viene sostituito con quello
stabilito nella richiesta, mantenendo l'estensione originale.

## 5. Email

La modalita consigliata su Render e Gmail API: usa HTTPS e permette di inviare
dall'account della branca. Gli scope `drive` e `gmail.send` possono richiedere la
verifica OAuth prima di rendere l'app disponibile a utenti esterni alla lista di test.

L'alternativa SMTP usa `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` e
`SMTP_FROM`. I servizi gratuiti Render bloccano le comuni porte SMTP, quindi su
quel piano questa alternativa normalmente non e utilizzabile.

## 6. Verifica prima dell'uso reale

- Creare una branca di prova e approvarla.
- Collegare un Drive di prova tramite Picker.
- Registrare una famiglia e aggiungere un ragazzo con codice persona.
- Approvare il collegamento dalla branca.
- Pubblicare una richiesta con file, testo e conferma si/no.
- Caricare e sostituire un documento, poi aprirlo dal portale.
- Inviare un promemoria e controllare il log.
- Esportare contatti e stato di un'attivita in Excel.
- Verificare cancellazione singola e cancellazione collettiva su dati di prova.

Prima di trattare documenti reali vanno inoltre definite informativa privacy,
tempi di conservazione, persone autorizzate e procedura di backup/ripristino.

## 7. Aggiornamenti

Per ogni nuova versione:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

Dopo il push, Render ricompila il servizio. Le migrazioni presenti in
`prisma/migrations` vengono applicate automaticamente all'avvio.
