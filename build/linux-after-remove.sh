#!/bin/bash
# Remplace le script par défaut d'electron-builder. Différences :
#  - l'alternative est retirée avec son vrai chemin (le modèle par défaut lui passe le lien /usr/bin,
#    ce qui ne retire rien et laisse un lien cassé) ;
#  - le lien de compatibilité /opt/Everything to PDF, créé par linux-after-install.sh, est supprimé ;
#  - rien n'est touché lors d'une mise à jour : le nouveau paquet réinstalle ces éléments.

case "$1" in
    remove|purge)
        if type update-alternatives >/dev/null 2>&1; then
            update-alternatives --remove 'everything-to-pdf' '/opt/EverythingToPDF/everything-to-pdf'
        else
            rm -f '/usr/bin/everything-to-pdf'
        fi
        if [ -L '/opt/Everything to PDF' ]; then
            rm -f '/opt/Everything to PDF'
        fi
        ;;
esac
