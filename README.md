# TitansVaultSync

Das Tool kann dafür verwendet werden Secrets aus einen Azure Key Vault in eine anderen zu kopieren.

## Aktuelle Features
- [x] Login mit Microsoft Account
- [x] Laden von Secrets aus zwei Azure Key Vaults anhand deren Namen
- [x] Übertragen von einem Secret in den anderen Key Vault

## Steps die vor der Nutzung des Tools erfolgen müssen
- Akutell ist dies über RBAC für die Anwendung (ClientCredentials) implementiert. Aus diesem Grund erfolgt keine Prüfung ob der User, der in der Anwendung angemeldet ist, auch die Rechte hat, die aktion auszuführen. Das User Login ist alleinig im Moment dazu da, zu verhindern, dass jemand ohen Login einfach auf der Seite ein belibigen Key Vault zu ändern.
- die Anwendung muss mindestens die Rolle
- Es muss sicher gestellt werden, dass die Anwendung Zugriff auf die Vaults hat. Hierzu muss man in die jeweiligen Key Vault gehen und die Berechtigung der Anwendung hinterlegen. Folgende Schritte müssen von einem User mit Berechtigungen, zum hinzufügen von Brechtigungen, oder druch einen Admin, für jeden Key Vault vorgenommen werden:
    1. In Azure zum Key Vault Navigieren, welchen man mergen will.
    2. Im Key Vault in den Reiter `Access control (IAM)` wechseln.
    ![AzureDokuAccessKeyVaults](https://github.com/user-attachments/assets/27719649-f148-4f8b-b42e-bec5e25d0eba)

    3. Im unteren Berreich im Abschnitt `Grant access to this resource` auf den Button `Add role assignment` klicken.
    ![AzureDokuAccessKeyVaults_2](https://github.com/user-attachments/assets/900fb440-74f7-489d-b2d3-08bbb93f414a)

    4. Man wechselt daraufhin zu dem `Add role assignment` in der Suche gibt man dann `Key Vault Secrets Officer` ein. Alternativ kann der Anwendung auch die Rolle `Contributor` gegeben werden, die ist aber nicht immer möglich und hängt von den Berechtigungen des Users, der die Rolle hinzufügen will ab. ein und wählt diesen aus. Anschließend klickt man auf den Button Next. Dies Berechtigung wird benötigt, dammit die Anwendung die Möglichkeit bekommt Secrets im Key Vault zu lesen und Aktions auszuführen.
    ![AzureDokuAccessKeyVaults_3](https://github.com/user-attachments/assets/462dd977-54b1-4083-9897-27d9050cd689)

    5. Im nächsten Tab, klickt man unter `Members` -> `+ Select members`
    ![AzureDokuAccessKeyVaults5](https://github.com/user-attachments/assets/3e56dd43-503d-4fa3-8b76-c8c1c3e4203c)

    6. Es öffnet sich drauf hin ein Sheet auf der rechten Seite. Dort gibt man in der Suche `Azure KeyVault Tool` ein. Wählt diese dann aus und klickt auf den Button `Select`
    ![AzureDokuAccessKeyVaults6](https://github.com/user-attachments/assets/8f635c19-a029-4afc-8e34-8554848a1c33)

    7. Das Sheet schließt sich darauf hin und man kann auf den Button `Review + assign` klicken, man wechselt dann in den Tab `Review + assign`.
    ![AzureDokuAccessKeyVaults7](https://github.com/user-attachments/assets/29accfba-5ec7-4329-9dc2-faa16bd56d12)

    8. Im Tab `Review + assign` muss erneut auf den Button `Review + assign` geklickt werden
    ![AzureDokuAccessKeyVaults8](https://github.com/user-attachments/assets/a08dc318-e079-474e-8119-c71c3b37ac67)

    9. Anschließend wird man auf die Übersichtsseite des Key Vaults oder dem Home Bildschirm von Azure zurück geleitet.

## Bedinung der Anwendung
1. Auf die Website gehen 
2. Anschließend sich mit einem Account von Microsoft Organisations Konto anmelden.Hierbei wird man zu Microsoft weiter geleitet. Wenn man sich da erste mal anmeldet, muss man Bedingungen akzeptieren.
![bedinungStep2](https://github.com/user-attachments/assets/051992e9-a843-407b-8440-2299f1be0941)
3. Nach dem Login kommt man in den Anwendungsberreich:
    1. Hier gibt es zwei Bereiche. Bereich eins das Formular in dem man die Vaultnamen angibt und die Tabelle in der die zu mergenden Vaults angezeigt werden.
       ![bedinungStep3-1](https://github.com/user-attachments/assets/1dfbeafb-8c76-4545-967b-2f5883ce4462)

4. Eintragen des Namens des linken Vaults. Es darf nicht die URL des Key Vaults eingegeben werden.
![bedinungStep4](https://github.com/user-attachments/assets/4af8fa2a-ee3f-4241-9929-a1c1b9ee62d0)

6. Eintragen des Namens des rechten Vaults. Es darf nicht die URL des Key Vaults eingegeben werden.
![bedinungStep5](https://github.com/user-attachments/assets/f9a124fd-901a-4843-abcd-8f69f8706c5e)

7. Drücken auf den Button Load Vaults
![bedinungStep6](https://github.com/user-attachments/assets/d0cc3c8e-e53e-4ef9-863b-decc752d5279)

9. Wenn das laden der Vaults fertig ist, wird eine Zusammenfassung der Menge an Secrets im jeweiligen Vault angezeigt und eine Tabelle mit den Vaults und eine Erfolgsnachricht vom laden der Faults.
![bedinungStep7](https://github.com/user-attachments/assets/bf6fc292-8e8b-4fc3-b106-132501223b46)

10. In der Tabelle wird dann folgendes angezeigt:
    - der Name des Vaults
    - in welchem Vault das Secret vorkommt, 
    - ob das Secret im Vault aktiv ist,
    - ob ein Conflict der Secret vorliegt, wenn der Name des Secrets gleich ist
    - der Status:
         - `Merged`: Hier kann nicht mehr gemerged werden, da beide Secretes in den Vaults schon Identisch ist.
         - `Mergeable`: Hier kann gemergt werden, dabei kann entweder von links nach rechts, oder von rechts nach links das Secret kopiert/gemerged werden. 
         - `Conflict`: Hier ist in beiden Vaults das selbe Secret vorhanden und es muss entschieden werden, welches Secret copiert werden soll. 
         - `Disabled`: Hier kann nicht gemerged werden, da diese Secret deaktiviert ist und damit kein Merge möglich ist. 
    - eine Spalte mit Copy Actions.
![bedinungStep8](https://github.com/user-attachments/assets/02809bdf-2cdf-4633-8187-397b5563ea9a)

6. Mergen eines Secrets:
   - Man klickt auf den Button mit den drei Punkten. Es öffnet sich dann ein Menüe mit Actions die man Ausführen kann.
![bedinungStep9](https://github.com/user-attachments/assets/90b82cd4-7d90-48b5-88a6-eac955592ac0)

   - Jenach dem in welchen Vault das Secret vorliegt, kann dann in den jeweiligen Vault kopieren. Das wird anhand des Icons in der Spalte Left Vault / Right Vault identifiziert werden. Wenn ein Konflickt vorliegt, dann sind beide Aktionen möglich. Wenn die Vaults schon Merged sind, dann sind die Actionen deaktiviert. 
![bedinungStep10](https://github.com/user-attachments/assets/2fa227f9-b53f-44ff-8bdd-5b8a7fd9733a)

   - Wenn das mergen erfolgreich war, dann wird hier eine Erfolgsnachricht angezeigt. Ansonsten eine error message.
![bedinungStep11](https://github.com/user-attachments/assets/fbfe1087-9c8c-47a5-8e71-b65a04b03800)
7. Wenn alle Vaults gemerged sind, werden bei allen der Status `Merged` angezeigt.

## Setup für Development
1. Es muss sicher gestellt sein, dass mindestens eine Node > `18.x` installiert sein. Es sollte außerdem `pnpm` aktiv/installier sein. Wenn das nicht der Fall ist muss mittels `npm install --global corepack@latest` und anschließend `corepack enable pnpm` installiert werden. Im Anschluss kann `pnpm` verwendet werden, sollte es zu Problemen kommen, bitte unter der offiziellen Doku von [pnpm](https://pnpm.io/installation) nachschauen.
2. Nach dem Clonen muss `pnpm i` ausgeführt werden dammit alle Dependencies im Projekt geladen sind.
3. Es muss eine `.env` Datei angelegt werden welche folgenden Keys enthält:
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
Der Key `NUXT_SESSION_PASSWORD` sollte nach dem ausƒühren von `pnpm i` automatisch gesetzt werden. Sollte dies nicht der Fall sein, muss eine Zufällige Zeichenfolge mit einer Mindestlänge von 32 Zeichen hinterlegt werden.
4. Mit `pnpm dev` wird dann der Development Server gestartet und die Anwendung läuft auf `localhost:3000/`

## Deployment
Aktuell muss das Deployment noch per Hand gemacht werden. Hierfür muss einmal `az acr build --file Dockerfile --registry acrtitans --image az-key-vault-tools-nuxt .` ausgeführt werden. Dies erstellt in der unserem Azure ACR ein neuen Container welcher dann von Automatisch von Web App Service genutzt wird. 
