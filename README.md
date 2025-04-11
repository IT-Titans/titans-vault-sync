# TitansVaultSync

Das Tool kann dafür verwendet werden, Secrets aus einem Azure Key Vault in einen anderen zu kopieren.

**Aktuell handelt es sich noch um ein POC, welches eventuell die ein oder andere Macke noch hat. Dies sollte vorallem das Auth betreffen, da dies sehr komplex ist und eventuell nochmal überarbeitet werden muss.**

## Aktuelle Features
Implemtiert:
- [x] Log-in mit Microsoft Account
- [x] Client Auth Flow
- [x] Laden von Secrets aus zwei Azure Key Vaults anhand deren Namen
- [x] Übertragen von einem Secret in den anderen Key Vault
Nicht Implementiert:
- [ ] Auth sollt verbessert werden und die App als Enterprise App hinterlegt werden. Dabei sollte dann auch ein Access Key austausch vom User erfolgen, so dass anhand der Userberechtigungen die Key Vault zugriffe erfolgen
- [ ] Auswahl der Key Vaults mittels Drop Down
- [ ] Anzeigen des Secrets auf Verlangen
- [ ] Verbesserung der Oberfläche (mehr Platz)
- [ ] Backup Button, so das man das Backup nicht händisch machen muss.
- [ ] Merg Konflickte mit Dialog handhaben.

## Wichtige Resourcen
- die [Resourcen Gruppe](https://portal.azure.com/#@it-titans.de/resource/subscriptions/59f816f8-68c1-4bb5-a430-0d0c2670c5f9/resourceGroups/rg_az_key_vault_tool/overview) in der die Test Key Vaults welche zum Entwickeln verwendet wurden und die Web App liegen
- die [App Registration in Entra Id](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/~/Overview/appId/142ad772-ba91-405f-aebe-8586f054919e/isMSAApp~/false). Sollte der Weg mit den herankommen an die Key Vaults nicht gehen, müssen hier evenutell noch weitere Settings erfolgen, oder die App muss als eigene [Enterprise applications](https://portal.azure.com/#view/Microsoft_AAD_IAM/StartboardApplicationsMenuBlade/~/AppAppsPreview/menuId~/null) registriert werden. (Hatte kein Berechtigungen dazu)

## Steps, die vor der Nutzung des Tools erfolgen müssen (beim Kunden)
- Aktuell ist dies über RBAC für die Anwendung (ClientCredentials) implementiert. Angesichts dessen erfolgt keine Prüfung, ob der User, der in der Anwendung angemeldet ist, auch die Rechte hat, die Aktion auszuführen. Das User-Log-in ist aktuell alleinig dazu da, um zu verhindern, dass jemand ohne Log-in einfach auf der Seite einen beliebigen Key Vault ändern kann.
- die Anwendung muss mindestens die Rolle `Key Vault Secrets Officer` in den Access Controls des Key Vaults haben.
- es muss sichergestellt werden, dass die Anwendung Zugriff auf die Vaults hat. 
### Berechtigungen im Key Vault erteilen
Hierzu muss man in die jeweiligen Key Vault gehen und die Berechtigung der Anwendung hinterlegen. Folgende Schritte müssen von einem User mit Berechtigungen, zum Hinzufügen von Berechtigungen, oder durch einen Admin, für jeden Key Vault vorgenommen werden:
    1. In Azure zum Key Vault navigieren, welchen man mergen will.
    2. Im Key Vault in den Reiter `Access control (IAM)` wechseln.
    ![AzureDokuAccessKeyVaults](https://github.com/user-attachments/assets/27719649-f148-4f8b-b42e-bec5e25d0eba)
    3. Im unteren Bereich im Abschnitt `Grant access to this resource` auf den Button `Add role assignment` klicken.
    ![AzureDokuAccessKeyVaults_2](https://github.com/user-attachments/assets/900fb440-74f7-489d-b2d3-08bbb93f414a)
    4. Man wechselt daraufhin zu dem `Add role assignment`. In der Suche gibt man dann `Key Vault Secrets Officer` ein. Alternativ kann der Anwendung auch die Rolle `Contributor` gegeben werden. Dies ist aber nicht immer möglich und hängt von den Berechtigungen des Users, der die Rolle hinzufügen will, ab. Anschließend klickt man auf den Button Next.
    ![AzureDokuAccessKeyVaults_3](https://github.com/user-attachments/assets/462dd977-54b1-4083-9897-27d9050cd689)
    5. Im nächsten Tab klickt man unter `Members` -> `+ Select members`
    ![AzureDokuAccessKeyVaults5](https://github.com/user-attachments/assets/3e56dd43-503d-4fa3-8b76-c8c1c3e4203c)
    6. Es öffnet sich daraufhin ein Sheet auf der rechten Seite. Dort gibt man in der Suche `Azure KeyVault Tool` ein. Wählt diese dann aus und klickt auf den Button `Select`
    ![AzureDokuAccessKeyVaults6](https://github.com/user-attachments/assets/8f635c19-a029-4afc-8e34-8554848a1c33)
    7. Das Sheet schließt sich daraufhin und man kann auf den Button `Review + assign` klicken, man wechselt dann in den Tab `Review + assign`.
    ![AzureDokuAccessKeyVaults7](https://github.com/user-attachments/assets/29accfba-5ec7-4329-9dc2-faa16bd56d12)
    8. Im Tab `Review + assign` muss erneut auf den Button `Review + assign` geklickt werden
    ![AzureDokuAccessKeyVaults8](https://github.com/user-attachments/assets/a08dc318-e079-474e-8119-c71c3b37ac67)
    9. Anschließend wird man auf die Übersichtsseite des Key Vaults oder dem Home Bildschirm von Azure zurückgeleitet.

## Bedingung der Anwendung
1. Auf die Website gehen [TitansVaultSync](https://titansvaultsync-bhfzaqf2hxf4ekhq.germanywestcentral-01.azurewebsites.net/)
2. Anschließend meldet man sich mit einem Organisations Account von Microsoft an. Hierbei wird man zu Microsoft weitergeleitet. Wenn man sich zum ersten mal anmeldet, muss man Bedingungen akzeptieren.
![bedinungStep2](https://github.com/user-attachments/assets/051992e9-a843-407b-8440-2299f1be0941)
3. Nach dem Log-in kommt man in den Anwendungsbereich:
    1. Hier gibt es zwei Bereiche. Der erste Bereich ist das Formular, in dem man die Vault-Namen angibt. Im unteren Bereich wird dann die Tabelle, in der die zu mergenden Vaults angezeigt, wenn diese geladen wurden.
       ![bedinungStep3-1](https://github.com/user-attachments/assets/1dfbeafb-8c76-4545-967b-2f5883ce4462)
4. Man kann nun den Namen des linken Vaults eintragen. Es darf nicht die URL des Key Vaults eingegeben werden.
![bedinungStep4](https://github.com/user-attachments/assets/4af8fa2a-ee3f-4241-9929-a1c1b9ee62d0)

6. Man trägt den Namen des rechten Vaults ein. Es darf nicht die URL des Key Vaults eingegeben werden.
![bedinungStep5](https://github.com/user-attachments/assets/f9a124fd-901a-4843-abcd-8f69f8706c5e)

7. Auf den Button Load Vaults klicken. Dann beginnt das laden der Vaults.
![bedinungStep6](https://github.com/user-attachments/assets/d0cc3c8e-e53e-4ef9-863b-decc752d5279)

9. Wenn die Vaults geladen sind, wird eine Zusammenfassung der Menge an Secrets im jeweiligen Vault angezeigt, und die Tabelle ist mit Daten gefüllt. Es wird außerdem eine Erfolgsnachricht angezeigt.
![bedinungStep7](https://github.com/user-attachments/assets/bf6fc292-8e8b-4fc3-b106-132501223b46)

10. In der Tabelle wird folgendess angezeigt:
    - der Name des Vaults
    - in welchem Vault das Secret vorkommt, 
    - ob das Secret im Vault aktiv ist,
    - ob ein Conflict der Secrets vorliegt, wenn die Secrets nicht denselben Wert haben
    - der Status:
         - `Merged`: Hier kann nicht mehr gemerged werden, da beide Secretes in den Vaults schonidentisch sind.
         - `Mergeable`: Hier kann gemergt werden, dabei kann entweder von links nach rechts, oder von rechts nach links das Secret kopiert/gemerged werden. 
         - `Conflict`: Hier ist in beiden Vaults dasselbe Secret mit dem selben Namen vorhanden, aber der Wert ist verschieden. Es muss deshalb entschieden werden, welches Secret kopiert werden soll. 
         - `Disabled`: Hier kann nicht gemerged werden, da dieses Secret deaktiviert ist und damit kein Merge möglich ist. 
    - eine Spalte mit Copy Aktionen.
![bedinungStep8](https://github.com/user-attachments/assets/02809bdf-2cdf-4633-8187-397b5563ea9a)

6. Mergen eines Secrets:
   - Man klickt auf den Button mit den drei Punkten. Es öffnet sich dann ein Menü mit Aktionen die man ausführen kann.
![bedinungStep9](https://github.com/user-attachments/assets/90b82cd4-7d90-48b5-88a6-eac955592ac0)

   - Je nachdem, in welchen Vault das Secret vorliegt, kann dann in den jeweiligen andern Vault kopiert werden. Das wird anhand des Icons in der Spalte Left Vault / Right Vault identifiziert. Wenn ein Konflikt vorliegt, dann sind beide Aktionen möglich. Wenn die Vaults schon als Merged gekennzeichnet sind, dann sind die Aktionen deaktiviert. 
![bedinungStep10](https://github.com/user-attachments/assets/2fa227f9-b53f-44ff-8bdd-5b8a7fd9733a)

   - Wenn das mergen erfolgreich war, dann wird hier eine Erfolgsnachricht angezeigt und die Tabelle neu geladen. Ansonsten wird eine Error-Message angezeigt.
![bedinungStep11](https://github.com/user-attachments/assets/fbfe1087-9c8c-47a5-8e71-b65a04b03800)
7. Wenn alle Vaults gemerged sind, wird bei allen der Status `Merged` angezeigt.

## Setup für Development
1. Es muss sichergestellt sein, dass mindestens Node > `18.x` installiert ist. Es sollte außerdem `pnpm` aktiv/installiert sein. Sofern das nicht der Fall ist, muss mittels `npm install --global corepack@latest` und anschließend `corepack enable pnpm` installiert werden. Im Anschluss kann `pnpm` verwendet werden. Sollte es zu Problemen kommen, bitte unter der offiziellen Doku von [pnpm](https://pnpm.io/installation) nachschauen.
2. Nach dem Clonen muss `pnpm install` ausgeführtwerden, damit alle Dependencies im Projekt geladen sind.
3. Es muss eine `.env` Datei angelegt werden, welche folgende Keys enthält:
```
# Azure Service Prinzipales
AZURE_CLIENT_ID=
AZURE_CLIENT_SECRET=
AZURE_TENANT_ID=
# OAuth stuff
NUXT_SESSION_PASSWORD=
NUXT_OAUTH_MICROSOFT_CLIENT_ID=
NUXT_OAUTH_MICROSOFT_CLIENT_SECRET=
NUXT_OAUTH_MICROSOFT_TENANT=
NUXT_OAUTH_MICROSOFT_REDIRECT_URL=http://localhost:3000/api/auth/microsoft
```
Der Key `NUXT_SESSION_PASSWORD` sollte nach dem Ausführen von `pnpm install` automatisch gesetzt werden. Sollte dies nicht der Fall sein, muss eine zufällige Zeichenfolge mit einer Mindestlänge von 32 Zeichen hinterlegt werden.
4. Mit `pnpm dev` wird dann der Development Server gestartet und die Anwendung läuft auf `localhost:3000/`

## Deployment
Aktuell muss das Deployment noch per Hand gemacht werden. Hierfür muss einmal `az acr build --file Dockerfile --registry acrtitans --image az-key-vault-tools-nuxt .` ausgeführt werden. Dies erstellt in unserem Azure ACR einen neuen Container, welcher dann automatisch von Web-App Service genutzt wird. 
