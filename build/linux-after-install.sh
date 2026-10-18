#!/bin/bash
# Remplace le script par défaut d'electron-builder, qui laisse chrome-sandbox sans bit setuid dès que
# `unshare --user` réussit en root. Sur Ubuntu 24.04 et dérivés (AppArmor), les espaces de noms
# utilisateur sont pourtant refusés aux applications normales : Chromium n'avait alors plus aucune
# sandbox et abandonnait au démarrage. La sandbox SUID fonctionne partout.
# Le dossier d'installation ne doit PAS contenir d'espace : Chromium découpe le chemin du helper setuid
# aux espaces (« LaunchProcess: failed to execvp: /opt/Everything ») et plante. Il découle de
# productName, fixé à « EverythingToPDF » pour Linux par le script dist:linux (package.json).
# Les noms ci-dessous sont en dur : l'étape « Lancer le .deb installé » de la CI échoue en cas d'écart.

APP_DIR='/opt/EverythingToPDF'
EXE='everything-to-pdf'

if type update-alternatives 2>/dev/null >&1; then
    # Supprime l'ancien lien s'il n'utilise pas update-alternatives
    if [ -L "/usr/bin/$EXE" ] && [ -e "/usr/bin/$EXE" ] && [ "$(readlink "/usr/bin/$EXE")" != "/etc/alternatives/$EXE" ]; then
        rm -f "/usr/bin/$EXE"
    fi
    update-alternatives --install "/usr/bin/$EXE" "$EXE" "$APP_DIR/$EXE" 100 || ln -sf "$APP_DIR/$EXE" "/usr/bin/$EXE"
else
    ln -sf "$APP_DIR/$EXE" "/usr/bin/$EXE"
fi

# Compatibilité : jusqu'à la 1.0.0 l'application s'installait dans « /opt/Everything to PDF » (avec
# espaces, ce qui casse la sandbox setuid de Chromium). Un lanceur resté sur l'ancien chemin (menu,
# favoris, raccourci) continue de fonctionner grâce à ce lien, retiré à la désinstallation
# (linux-after-remove.sh).
if [ ! -e '/opt/Everything to PDF' ] && [ ! -L '/opt/Everything to PDF' ]; then
    ln -s EverythingToPDF '/opt/Everything to PDF' || true
fi

chown root:root "$APP_DIR/chrome-sandbox" || true
chmod 4755 "$APP_DIR/chrome-sandbox" || true

if hash update-mime-database 2>/dev/null; then
    update-mime-database /usr/share/mime || true
fi

if hash update-desktop-database 2>/dev/null; then
    update-desktop-database /usr/share/applications || true
fi
