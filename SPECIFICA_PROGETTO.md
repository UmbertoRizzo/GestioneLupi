# GestioneLupi - Specifica di progetto

Versione: 1.0  
Lingua iniziale: italiano  
Destinazione: Render, PostgreSQL e Google Drive

## 1. Obiettivo

GestioneLupi e un gestionale multi-gruppo per semplificare la raccolta di moduli,
documenti, conferme e bonifici nelle unita scout. Il sito conserva nel database
solo utenti, permessi, richieste, stati e riferimenti tecnici. I documenti restano
nel Google Drive della singola branca.

La prima schermata e il prodotto reale: login unico e, dopo l'accesso, dashboard
diversa in base al ruolo. L'interfaccia deve essere semplice per un uso raro,
veloce da telefono e predisposta per diventare una PWA installabile.

## 2. Principi non negoziabili

- Multi-gruppo fin dalla prima versione.
- Un account operativo condiviso per ogni branca, con possibilita tecnica di
  aggiungere altri amministratori in futuro.
- Nessuna funzionalita dipende dalla presenza di un capo gruppo.
- I file non vengono conservati sul filesystem di Render o nel database.
- Ogni operazione importante produce una voce di log.
- Il super admin puo intervenire su ogni dato e configurazione.
- Un admin di branca controlla interamente la propria branca, ma non apre
  documenti o richieste delle altre branche.
- Un genitore non opera su un figlio finche l'iscrizione alla branca non viene
  approvata.

## 3. Ruoli e permessi

### Super admin

Puo creare, approvare, modificare, sospendere, unire ed eliminare gruppi,
branche, utenti, ragazzi, richieste, consegne e collegamenti Google. Vede tutti i
log, gli errori, le statistiche e puo entrare in qualsiasi vista amministrativa.

### Admin di branca

Gestisce ragazzi, genitori collegati, contatti, anni, note, richieste, consegne,
file, modelli, esportazioni, tema, Drive ed email della propria branca. Puo
spostare un ragazzo verso un'altra branca e vede l'elenco e i contatti delle
altre branche del gruppo, senza accedere alle loro richieste e ai loro file.

Lo status opzionale `capo gruppo` e solo un'etichetta informativa e non concede
permessi aggiuntivi.

### Genitore o nucleo

Gestisce uno o piu figli e puo essere collegato allo stesso figlio insieme a un
altro account. Vede richieste, scadenze, modelli e documenti dei figli approvati.
Puo caricare o correggere una consegna; la sostituzione di un documento gia
approvato deve essere accettata dall'admin.

## 4. Registrazione e accesso

- Login unico con email e password e reindirizzamento per ruolo.
- Registrazione genitore: nome, cognome, email, telefono, password, tipo
  `genitore singolo` o `nucleo familiare`, consensi privacy.
- Il genitore aggiunge il figlio indicando nome, cognome, codice persona
  obbligatorio, data di nascita, sesso, gruppo, branca e anno.
- Il codice persona e unico globalmente. Un duplicato richiede un collegamento al
  profilo esistente, non crea un secondo ragazzo.
- Registrazione branca separata raggiungibile da "Sei un capo? Aggiungi la tua
  branca": gruppo, nome branca, tipo, email di branca, credenziali e cartella
  Drive. La branca resta in attesa del super admin.
- Recupero password tramite token monouso inviato per email.

## 5. Gruppi, branche e anni

Branche iniziali: Lupi, Reparto, Noviziato, Clan e Comunita Capi. Sono ammessi
nomi e tipi personalizzati, creazione manuale, spostamenti e fusione. Tutte le
operazioni restano possibili senza un account del capo gruppo.

I ragazzi hanno un anno numerico da 1 a 5, modificabile in massa o singolarmente.
L'anno vive nel database: le cartelle Drive non sono divise fisicamente per anno,
quindi il passaggio annuale non richiede spostamenti di file.

## 6. Richieste flessibili

Una richiesta puo contenere uno o piu elementi:

- caricamento file;
- risposta testuale;
- conferma si/no;
- modello da scaricare, compilare e ricaricare;
- combinazioni dei precedenti.

Ogni richiesta supporta titolo, descrizione, attivita/argomento, scadenza,
destinatari (tutta la branca, anni o ragazzi scelti), bozza/pubblicazione,
visibilita ai genitori, approvazione, email, promemoria, limite dimensione e tipi
file. Gli stati possono essere semplici (`mancante`, `consegnato`) o completi
(`mancante`, `caricato`, `da correggere`, `approvato`).

Le richieste possono essere duplicate per un nuovo anno, archiviate e cancellate
definitivamente con conferma. Alla pubblicazione vengono create assegnazioni
individuali, cosi i destinatari storici non cambiano per errore.

## 7. Google Drive per branca

Ogni branca autorizza il proprio account Google con OAuth 2.0 e accesso offline.
Il flusso preferito usa lo scope `drive.file` e Google Picker: l'admin seleziona
una cartella esplicitamente oppure lascia che GestioneLupi ne crei una. Questa
scelta evita l'accesso generale a tutto il Drive.

Struttura consigliata:

```text
Cartella branca/
  Ragazzi/
    Mario Rossi - CODICEPERSONA/
      Documento di Identita.pdf
      Bonifico Prima Rata.pdf
  Modelli/
  Attivita/
```

La cartella del ragazzo viene creata al primo caricamento. Il nome del file viene
normalizzato secondo la richiesta, mantenendo l'estensione. Il database salva
Drive file ID, nome, tipo, dimensione e stato, mai il contenuto.

Se un file viene eliminato direttamente da Drive, il sito lo segnala come non
disponibile. L'admin puo collegare manualmente un file esistente. Le eliminazioni
singole o massive agiscono su Drive, richiedono conferma e vengono registrate.

Dimensione predefinita: 10 MB, modificabile dalla branca e sovrascrivibile nella
singola richiesta. Formati iniziali: PDF, JPG, PNG, HEIC, DOC, DOCX e XLSX; i video
sono attivabili alzando esplicitamente limite e tipi consentiti.

## 8. Email

L'invio e facoltativo. Se la branca autorizza Gmail, i messaggi partono dalla sua
casella; altrimenti viene usato il server SMTP di sistema con `reply-to` della
branca. Prima dell'invio l'admin vede un testo standard, puo modificarlo o non
inviarlo.

Messaggi previsti: nuova richiesta, promemoria ai mancanti, correzione richiesta,
approvazione o rifiuto del figlio e recupero password. Ogni tentativo e loggato.
SMS e WhatsApp non fanno parte della prima versione.

## 9. Dashboard e viste

### Admin di branca

- scadenze vicine e attivita aperte;
- ragazzi in attesa;
- consegne mancanti o da correggere;
- ultimi caricamenti;
- stato Drive e Gmail;
- azioni rapide per richiesta, promemoria, tabella, approvazioni ed export;
- vista tabellare `ragazzo / anno / contatti / richieste`, con versione mobile a
  lista compatta.

### Genitore

Mostra figli, stato approvazione, richieste da completare, scadenze, documenti
gia inviati, modelli e cronologia essenziale.

### Super admin

Mostra gruppi e branche attivi o in attesa, connessioni Google, utenti, richieste,
file mancanti, errori, email e attivita recenti, con accesso alle gestioni globali.

## 10. Export Excel

L'export produce file `.xlsx` adatti al contesto:

- attivita: righe per ragazzo e colonne per ogni richiesta;
- contatti: ragazzo, anno, genitori, email e telefoni;
- mancanti: ragazzo, contatti, richiesta, stato e scadenza;
- attivita complesse: fogli `Riepilogo`, `Tutti`, `Mancanti`, `Contatti`.

## 11. Log e privacy

Il log registra accessi rilevanti, registrazioni, consensi, approvazioni, modifiche
anagrafiche, cambi anno/branca, richieste, upload, sostituzioni, cancellazioni,
email, collegamenti Google ed errori. Super admin: tutto; admin: propria branca;
genitore: cronologia personale semplificata.

La registrazione richiede accettazione dell'informativa e del trattamento dati.
Il testo informa che i documenti vengono conservati sul Drive della branca e
permette una richiesta di cancellazione. I testi legali forniti dall'app sono una
base operativa e devono essere verificati da una persona competente in GDPR.

## 12. Aspetto e accessibilita

- Interfaccia moderna, sobria e orientata al lavoro.
- Controlli touch da almeno 44 px, focus visibile e contrasto adeguato.
- Navigazione laterale su desktop e inferiore/compatta su mobile.
- Tabelle dense su desktop, liste leggibili su telefono.
- Colore principale, secondario e logo configurabili per branca e copiabili da
  un'altra branca.
- Nessuna informazione secondaria del gruppo deve dominare la schermata.

## 13. Architettura

- Next.js App Router e TypeScript.
- PostgreSQL con Prisma.
- Sessioni server-side con cookie `HttpOnly`, token casuale salvato come hash e
  password con bcrypt.
- Google Drive API, Google Picker e Gmail API opzionale.
- ExcelJS per gli export.
- Deploy come servizio Node.js su Render; PostgreSQL gestito da Render.
- Filesystem del server considerato effimero.
- Token Google cifrati nel database con AES-256-GCM.

## 14. Configurazione e rilascio

Variabili minime:

```text
DATABASE_URL
APP_URL
SESSION_SECRET
APP_ENCRYPTION_KEY
SUPER_ADMIN_EMAIL
SUPER_ADMIN_PASSWORD
```

Per Google:

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI
NEXT_PUBLIC_GOOGLE_API_KEY
NEXT_PUBLIC_GOOGLE_APP_ID
```

Per il fallback email:

```text
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASSWORD
SMTP_FROM
```

Il build esegue la generazione del client Prisma; il comando di avvio applica le
migrazioni gia versionate e avvia Next.js. Nessun file persistente dipende dal
disco di Render.

## 15. Criteri di accettazione della prima versione

- I tre ruoli accedono a viste e dati coerenti con i permessi.
- Una branca puo essere registrata, approvata, configurata e collegata a Google.
- Un genitore puo registrarsi, aggiungere piu figli e attendere approvazione.
- Un admin puo creare e pubblicare una richiesta mista per destinatari scelti.
- Il genitore puo completarla e il file arriva nella cartella Drive corretta con
  il nome previsto.
- L'admin puo approvare, chiedere correzioni, inviare promemoria ed esportare.
- Un file rimosso da Drive risulta non disponibile nel sito.
- Le operazioni critiche sono autorizzate lato server e presenti nel log.
- L'interfaccia e usabile a 360 px e su desktop senza sovrapposizioni.

