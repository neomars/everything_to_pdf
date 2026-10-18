#!/bin/sh
# Teste la décision du lanceur Linux (build/linux-launcher.sh) : sandbox gardée ou désactivée.
# Un faux « unshare » simule des espaces de noms utilisateur utilisables ou refusés (AppArmor).
set -u
ROOT=$(cd "$(dirname "$0")/.." && pwd)
T=$(mktemp -d)
trap 'rm -rf "${T:?}"' EXIT
fail=0

cp "$ROOT/build/linux-launcher.sh" "$T/app"
printf '#!/bin/sh\nprintf "%%s\\n" "$@"\n' > "$T/app.bin"
: > "$T/chrome-sandbox"
chmod 755 "$T/app" "$T/app.bin"
mkdir "$T/fake"

fake_unshare() { printf '#!/bin/sh\nexit %s\n' "$1" > "$T/fake/unshare"; chmod 755 "$T/fake/unshare"; }
run() { PATH="$T/fake:$PATH" "$@"; }
check() { # check <nom> <attendu> <obtenu>
  if [ "$2" = "$3" ]; then echo "OK   $1"; else echo "FAIL $1"; echo "  attendu: $(echo "$2" | tr '\n' '|')"; echo "  obtenu : $(echo "$3" | tr '\n' '|')"; fail=1; fi
}

fake_unshare 1
check "aucune sandbox possible -> --no-sandbox ajouté, arguments conservés" \
  "$(printf -- '--no-sandbox\nmon fichier.docx\nb.txt')" "$(run "$T/app" "mon fichier.docx" b.txt)"
check "--no-sandbox explicite -> pas de doublon" \
  "$(printf -- '--no-sandbox\na.txt')" "$(run "$T/app" --no-sandbox a.txt)"

fake_unshare 0
check "espaces de noms utilisateur utilisables -> sandbox gardée" \
  "a.txt" "$(run "$T/app" a.txt)"

ln -s "$T/app" "$T/lien"
fake_unshare 1
check "lancé via un lien symbolique (/usr/bin) -> trouve .bin" \
  "$(printf -- '--no-sandbox\na.txt')" "$(run "$T/lien" a.txt)"

if [ "$(id -u)" = 0 ]; then
  chown root:root "$T/chrome-sandbox" && chmod 4755 "$T/chrome-sandbox"
  fake_unshare 1
  check "helper setuid root valide -> sandbox gardée même sans espaces de noms" \
    "a.txt" "$(run "$T/app" a.txt)"
  chmod 0755 "$T/chrome-sandbox"
  check "helper sans bit setuid -> --no-sandbox" \
    "$(printf -- '--no-sandbox\na.txt')" "$(run "$T/app" a.txt)"
else
  echo "SKIP cas du helper setuid (nécessite root pour chown)"
fi

[ "$fail" = 0 ] && echo "launcher OK"
exit "$fail"
