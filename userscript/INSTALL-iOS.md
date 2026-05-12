# EN→DE Translator – Userscript für iPhone

Diese Anleitung führt dich durch die Installation des Übersetzungs-Userscripts
in Safari auf dem iPhone. **Du brauchst weder Mac noch Xcode**, und es
gibt **keine 7-Tage-Ablauffrist**.

## Was du brauchst

- iPhone mit **iOS 15 oder neuer**
- Die kostenlose App **„Userscripts"** von Justin Wasack (quoid) aus dem
  App Store: <https://apps.apple.com/app/userscripts/id1463298887>
- Diese eine Datei: [`translator.user.js`](./translator.user.js)

> Die App ist Open Source, kostenlos, ohne Werbung und ohne In-App-Käufe.
> GitHub: <https://github.com/quoid/userscripts>

---

## Schritt 1 – „Userscripts"-App installieren

1. Öffne den App Store auf deinem iPhone.
2. Suche nach **„Userscripts"** (das mit dem schwarz-weißen `< >`-Symbol).
3. Lade sie kostenlos herunter.

## Schritt 2 – In Safari aktivieren

1. **Einstellungen → Apps → Safari → Erweiterungen**
   (auf älterem iOS: **Einstellungen → Safari → Erweiterungen**).
2. Tippe **Userscripts** an → **Aktivieren**.
3. Erlaube den Zugriff auf **Alle Websites**.

## Schritt 3 – Speicherort einrichten

Die Userscripts-App speichert alle Skripte in einem Ordner deiner Wahl:

1. Öffne die **Userscripts**-App.
2. Sie fragt nach einem Speicherort. Wähle einen Ordner in **iCloud Drive**
   oder **Auf meinem iPhone** (z. B. neuen Ordner `Userscripts` anlegen).
3. Bestätige.

## Schritt 4 – Das Übersetzungs-Skript hinzufügen

Du hast zwei Wege:

### Weg A: Direkt aus Safari (am einfachsten)

1. Öffne in Safari diese URL (Raw-Datei auf GitHub):
   ```
   https://raw.githubusercontent.com/Onkeldeno/translator/claude/ios-translation-extension-8PjGF/userscript/translator.user.js
   ```
2. Tippe oben links in Safari auf das **🧩-Puzzle-Icon** → **Userscripts**.
3. Tippe im Popup auf **„Install"** (oder „Skript installieren").
4. Bestätige.

### Weg B: Manuell kopieren

1. Kopiere den kompletten Inhalt von `translator.user.js`.
2. Öffne die Userscripts-App → **+** (oben rechts) → **New Userscript**.
3. Lösche das Beispiel und füge unseren Code ein.
4. Tippe **Save**.

---

## Schritt 5 – Benutzen

1. Gehe in Safari auf eine englische Webseite (z. B. bbc.com, nytimes.com).
2. **Doppeltippe** auf ein Wort → die deutsche Übersetzung erscheint als Popup.
3. Für einen Satz: doppeltippe, **zieh die blauen Auswahl-Griffe** über
   den Satz. Sobald du loslässt, übersetzt das Skript den ganzen Satz.
4. Antippen außerhalb des Popups schließt es.

> Beim ersten Aufruf auf einer neuen Domain fragt das Userscripts-System
> ggf. nach Erlaubnis für `translate.googleapis.com` – bestätige das.

---

## Probleme & Lösungen

| Problem | Lösung |
|---|---|
| Popup erscheint nicht | Userscripts-Erweiterung in Safari-Einstellungen aktiviert? Zugriff auf „Alle Websites" erteilt? In der Userscripts-App: ist das Skript eingeschaltet (grüner Schalter)? |
| „Fehler bei der Übersetzung" / „Netzwerkfehler" | Google hat dich kurz wegen zu vieler Anfragen blockiert. Ein paar Minuten warten. |
| Doppeltippen zoomt rein | iOS-Standardverhalten auf Seiten ohne `viewport`-Tag. Auf modernen Seiten passiert das nicht. |
| Popup deckt iOS-Auswahlmenü | Tippe einmal kurz neben die Auswahl, dann erscheint nur unser Popup. |
| Popup falsch positioniert nach Scrollen | Einmal kurz antippen, neu auswählen. |

---

## Updates

Wenn ich am Skript etwas ändere, kannst du es in der Userscripts-App
einfach wieder per **Edit** aktualisieren oder neu installieren – der
Speicherort und alle anderen Skripte bleiben erhalten.

---

## Wie es technisch funktioniert

```
Safari (iPhone)
   │
   ├── englische Webseite mit Text
   │
   ├── Userscripts-Erweiterung injiziert translator.user.js
   │       │
   │       ▼  selectionchange / dblclick
   │
   ├── translator.user.js sammelt markierten Text
   │       │
   │       ▼  GM.xmlHttpRequest()
   │
   ├── translate.googleapis.com (inoffizieller gtx-Endpoint)
   │       │
   │       ▼  JSON-Antwort
   │
   └── Floating Popup mit Übersetzung
```

- **Inoffizieller Google-Translate-Endpoint** – kein API-Key, kann jederzeit
  blockieren oder kaputtgehen.
- **In-Memory-LRU-Cache** (max. 500 Einträge), damit wiederholte Wörter
  sofort übersetzt sind.
- **Trigger**: `dblclick` (schnell) + `selectionchange` debounced 450 ms
  (für längere Selektionen per Finger).
- **CORS umgehen**: `GM.xmlHttpRequest` mit `@connect translate.googleapis.com`
  im Userscript-Header.
