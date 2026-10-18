#!/bin/sh
# Lanceur Linux (installé à la place de l'exécutable Electron, renommé « <nom>.bin » par afterPack.js).
#
# Chromium abandonne au démarrage (« The SUID sandbox helper binary was found, but is not configured
# correctly ») quand il n'a aucune sandbox utilisable : ni helper chrome-sandbox setuid root, ni
# espaces de noms utilisateur. C'est le cas d'un AppImage (le helper ne peut pas y être setuid) sur
# Ubuntu 24.04 et dérivés, où AppArmor restreint ces espaces de noms aux applications non déclarées.
# Ce lanceur garde la sandbox quand l'une des deux est utilisable et ne la désactive qu'en dernier recours.
# Le paquet .deb installe chrome-sandbox en setuid root (build/linux-after-install.sh) et la garde donc.

SELF=$(readlink -f "$0")
HERE=$(dirname "$SELF")
BIN="$SELF.bin"
HELPER="$HERE/chrome-sandbox"

# Choix explicite de l'utilisateur : on ne touche à rien.
for arg in "$@"; do
  if [ "$arg" = "--no-sandbox" ]; then exec "$BIN" "$@"; fi
done

# 1) Helper setuid root valide.
if [ -u "$HELPER" ] && [ "$(stat -c %u "$HELPER" 2>/dev/null)" = 0 ]; then
  exec "$BIN" "$@"
fi

# 2) Espaces de noms utilisateur réellement utilisables. La création d'un espace PID est ce que
#    demande Chromium ; AppArmor la refuse alors que la simple création de l'espace utilisateur passe.
if unshare --user --map-root-user --pid --fork true >/dev/null 2>&1; then
  exec "$BIN" "$@"
fi

# 3) Aucune sandbox possible : démarrer sans plutôt que planter.
exec "$BIN" --no-sandbox "$@"
