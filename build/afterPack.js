'use strict';

const fs = require('fs');
const path = require('path');

// Linux : l'exécutable Electron devient « <nom>.bin » et build/linux-launcher.sh prend sa place,
// pour choisir au lancement si Chromium doit démarrer sans sandbox (voir ce script).
// Les paquets (.deb, AppImage) continuent de pointer sur le nom d'origine.
exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'linux') return;
  const exe = path.join(context.appOutDir, context.packager.executableName);
  fs.renameSync(exe, `${exe}.bin`);
  fs.copyFileSync(path.join(__dirname, 'linux-launcher.sh'), exe);
  fs.chmodSync(exe, 0o755);
};
