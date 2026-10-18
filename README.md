# Everything to PDF

Application de bureau (Windows `.exe` et Linux) : **glissez-déposez ou ouvrez un lot de fichiers**
(Word, Excel, PowerPoint, OpenDocument, RTF, txt, html, images…) et ils sont **convertis en PDF
automatiquement, sans autre action**. Chaque PDF est enregistré **à côté du fichier d'origine**
(`rapport.docx` → `rapport.pdf`). Un PDF existant n'est jamais écrasé : le nouveau s'appelle
`rapport (1).pdf`. Si le dossier d'origine est en lecture seule, le PDF va dans `Documents/PDF`.

- Glisser-déposer de fichiers **ou de dossiers** (parcours récursif).
- Bouton « Ajouter des fichiers… / un dossier… ».
- « Ouvrir avec » / ligne de commande : `EverythingToPDF fichier1.docx fichier2.odt …`
  (les fichiers sont convertis dès le lancement).
- Les fichiers `.pdf` sont ignorés.

## Moteurs de conversion

| Formats | Moteur | Prérequis |
|---|---|---|
| Office : doc, docx, docm, dot(x/m), xls, xlsx, xlsm, xlsb, ppt, pptx, pptm, pps(x), pot(x), pub, vsd(x), rtf, wps, wpd ; OpenDocument : odt, ods, odp… ; tout format inconnu | LibreOffice (mode headless) | **LibreOffice installé** |
| txt, log, md, csv, json, xml…, html, png/jpg/gif/bmp/webp/svg | Chromium intégré à l'application | aucun |

LibreOffice est détecté automatiquement (`Program Files\LibreOffice` sous Windows,
`/usr/bin/soffice`, `/opt/libreoffice*`… sous Linux, ou la variable `LIBREOFFICE_PATH`).
S'il manque, l'application l'indique et reste utilisable pour les formats du second tableau.
Il n'est pas embarqué (≈ 350 Mo) : <https://www.libreoffice.org/download/download-libreoffice/>.
Sous Linux : `sudo apt install libreoffice-writer libreoffice-calc libreoffice-impress`.

## Obtenir les exécutables

Le `.exe` est produit par GitHub Actions (runner Windows) :
onglet **Actions → Build → dernier run → Artifacts** (`windows` : installeur NSIS et version
portable `.exe`, `linux` : `AppImage` et `.deb`). Un tag `vX.Y.Z` publie aussi une Release.

En local :

```bash
npm install
npm start            # lancer l'application
npm test             # file de conversion (nécessite LibreOffice) + lanceur Linux
npm run dist:linux   # AppImage + deb  -> dist/
npm run dist:win     # sur une machine Windows -> dist/*.exe
```

Les exécutables ne sont pas signés : Windows SmartScreen affichera un avertissement
(« Informations complémentaires » → « Exécuter quand même »).

## Dépannage Linux

**`The SUID sandbox helper binary was found, but is not configured correctly`** au lancement :
Chromium n'a aucune sandbox utilisable. Cela touche Ubuntu 24.04 et dérivés, où AppArmor restreint
les espaces de noms utilisateur.

- **`.deb`** : le paquet installe `chrome-sandbox` en setuid root à l'installation et garde la sandbox.
  Réinstallez la dernière version (`sudo apt install ./EverythingToPDF-*.deb`) ou, sur une
  installation plus ancienne : `sudo chmod 4755 "/opt/Everything to PDF/chrome-sandbox"`.
- **AppImage** : un AppImage ne peut pas porter de bit setuid. Un lanceur intégré
  (`build/linux-launcher.sh`) garde la sandbox quand elle est utilisable et ne démarre sans qu'en
  dernier recours. `--no-sandbox` en argument force ce choix.

## Structure

- `build/` : icône, lanceur Linux (`linux-launcher.sh`, installé par `afterPack.js`),
  script de post-installation du `.deb` (`linux-after-install.sh`)
- `src/main.js` : fenêtre, IPC, instance unique, fichiers passés en argument
- `src/queue.js` : file séquentielle, expansion des dossiers, nommage de sortie
- `src/libreoffice.js` : détection et pilotage de LibreOffice
- `src/chromium.js` : texte/HTML/images → PDF via `printToPDF`
- `src/renderer/` : interface
