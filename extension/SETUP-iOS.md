# EN→DE Translator – Installation auf dem iPhone

Diese Anleitung führt dich Schritt für Schritt durch die Installation der
Safari-Erweiterung auf deinem iPhone.

## Was du brauchst

- **Mac** mit macOS 13 (Ventura) oder neuer
- **Xcode 15** oder neuer (kostenlos im Mac App Store)
- **iPhone mit iOS 15.4 oder neuer**
- **USB-Kabel** Lightning/USB-C, um das iPhone mit dem Mac zu verbinden
- Eine **Apple-ID** (eine kostenlose reicht – aber siehe „Hinweis 7 Tage" unten)

> **Hinweis 7 Tage**: Ohne kostenpflichtiges Apple-Developer-Programm
> ($99/Jahr) läuft die App nach 7 Tagen ab und du musst sie neu auf das
> iPhone laden. Mit Developer-Account hält sie ein Jahr.

> **Chrome auf iOS unterstützt keine Erweiterungen** – Apple lässt das
> nicht zu. Diese Erweiterung läuft ausschließlich in Safari.

---

## Schritt 1 – Xcode-Projekt anlegen

1. Öffne **Xcode** auf deinem Mac.
2. Wähle **File → New → Project…**
3. Wechsle oben auf den Tab **iOS**.
4. Wähle die Vorlage **Safari Extension App** und klicke **Next**.
   (Wenn du sie nicht siehst: such nach „Safari" im oberen Filterfeld.)
5. Fülle die Felder so aus:
   - **Product Name**: `EnDeTranslator`
   - **Team**: deine Apple-ID
   - **Organization Identifier**: irgendwas eindeutiges, z. B. `com.deinname.endetr`
   - **Language**: Swift
   - **Interface**: Storyboard (Standard)
6. Klicke **Next** und wähle einen Speicherort für das Projekt.

Xcode legt jetzt zwei Targets an:
- `EnDeTranslator` (die App, die im Home-Screen erscheint)
- `EnDeTranslator Extension` (die Safari-Erweiterung selbst)

---

## Schritt 2 – Erweiterungs-Dateien austauschen

Im neuen Xcode-Projekt findest du im Project Navigator einen Ordner
`EnDeTranslator Extension/Resources`. Darin liegen Beispieldateien, die
Apple automatisch erzeugt hat (`manifest.json`, `content.js`,
`background.js`, `popup.html`, `images/`).

**Diese Beispieldateien musst du durch die Dateien aus diesem Repository
ersetzen:**

1. Wähle in Xcode den Ordner `Resources` aus, markiere alle Dateien
   darin (`Cmd+A`) und drücke `Delete` → **Move to Trash**.
2. Öffne im Finder den Ordner `extension/` aus diesem Repo.
3. Ziehe folgende Dateien per Drag-&-Drop in den `Resources`-Ordner in Xcode:
   - `manifest.json`
   - `content.js`
   - `content.css`
   - `background.js`
   - der Ordner `icons/` (komplett mit den 5 PNGs)
4. Im Dialog „Choose options for adding these files":
   - ☑️ **Copy items if needed**
   - ☑️ **Create groups**
   - bei **Add to targets**: nur `EnDeTranslator Extension` ankreuzen
   - klicke **Finish**

---

## Schritt 3 – App-Icon der Container-App setzen (optional)

Damit auch die App, die im Home-Screen liegt, ein hübsches Icon hat:

1. Wähle im Project Navigator `EnDeTranslator → Assets.xcassets → AppIcon`.
2. Ziehe `icons/icon-512.png` auf das 1024-Feld (Xcode skaliert automatisch).
   Ist das nicht groß genug, generiere ein 1024×1024-PNG nach Bedarf.

---

## Schritt 4 – iPhone vorbereiten

1. Verbinde dein iPhone per Kabel mit dem Mac.
2. Auf dem iPhone: **Einstellungen → Datenschutz & Sicherheit → Entwicklermodus
   → an**. Das iPhone startet einmal neu.
3. Entsperre das iPhone und klicke nach dem Neustart auf
   **Entwicklermodus einschalten**.

---

## Schritt 5 – App auf dem iPhone starten

1. Wähle in Xcode oben in der Toolbar dein iPhone als Ziel-Gerät aus.
2. Wähle als Scheme `EnDeTranslator` (nicht die Extension).
3. Drücke **Cmd+R** (oder den Play-Button).
4. Beim ersten Mal verlangt Xcode, dass du das **Signing Team** auswählst:
   - klicke das Projekt im Project Navigator an
   - wähle Target `EnDeTranslator`, Tab **Signing & Capabilities**
   - bei **Team**: deine Apple-ID
   - dasselbe für das Target `EnDeTranslator Extension` wiederholen
5. Drücke noch mal **Cmd+R**.

Beim ersten Start auf dem iPhone wird angemeckert, dass der Entwickler nicht
vertraut ist:
- Auf dem iPhone: **Einstellungen → Allgemein → VPN & Geräteverwaltung →
  Entwickler-App** → deine Apple-ID → **Vertrauen**.
- Starte die App auf dem iPhone manuell.

---

## Schritt 6 – Erweiterung in Safari aktivieren

1. Auf dem iPhone: **Einstellungen → Apps → Safari → Erweiterungen**
   (auf älterem iOS: **Einstellungen → Safari → Erweiterungen**).
2. Tippe `EN→DE Translator` an → **Aktivieren**.
3. Erlaube den Zugriff auf **Alle Websites** (du brauchst das, damit die
   Erweiterung englische Webseiten lesen kann).

---

## Schritt 7 – Benutzen

1. Öffne Safari, gehe auf eine englische Webseite.
2. **Doppeltippe** auf ein Wort → die Übersetzung erscheint als Popup.
3. Für einen Satz: doppeltippe, dann **zieh die blauen Auswahl-Griffe** über
   den Satz. Sobald du loslässt, übersetzt die Erweiterung den ganzen Satz.

---

## Probleme & Lösungen

| Problem | Lösung |
|---|---|
| Popup erscheint nicht | Erweiterung in Safari-Einstellungen aktiviert? Zugriff auf „Alle Websites" erteilt? |
| „Fehler bei der Übersetzung" | Google-Translate-Endpoint hat dich kurz blockiert (Rate-Limit). Ein paar Minuten warten. |
| App ist nach 7 Tagen weg | Stecke das iPhone wieder an den Mac und drücke in Xcode erneut **Cmd+R**, das verlängert um weitere 7 Tage. |
| Popup deckt iOS-Auswahlmenü | Tippe einmal kurz neben die Auswahl, dann erscheint nur unser Popup. |

---

## Architektur (kurz)

```
Safari iOS
   │
   ├── content.js   ← hört auf selectionchange + dblclick
   │       │
   │       ▼  sendMessage({action: 'translate', text})
   │
   ├── background.js (Service Worker)
   │       │
   │       ▼  fetch('https://translate.googleapis.com/translate_a/single?…')
   │
   └── content.js   ← rendert Popup mit Übersetzung
```

- **Inoffizieller Google-Translate-Endpoint** `translate.googleapis.com/translate_a/single`
  – kein API-Key, kann jederzeit kaputtgehen.
- **In-Memory-LRU-Cache** (max. 500 Einträge) im Service Worker, damit
  wiederholte Wörter sofort übersetzt sind.
- **Trigger**: `dblclick` (schnell) + `selectionchange` debounced 450 ms
  (für längere Selektionen per Finger).
