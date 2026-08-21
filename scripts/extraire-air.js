// Extracteur complet des archives .air d'Airborn.
//
// Deux couches :
//  1. L'INDEX est brouille par echange des quartets de chaque octet puis XOR 0xF7.
//     Structure : "V0.01", [u16 nombre de fichiers], puis par entree
//     [u16 longueur du nom][nom][u32 taille][u32 horodatage][u32 offset].
//  2. Chaque CHARGE UTILE est en AES-256-CBC, son IV place en tete (16 octets),
//     padding PKCS#7. La cle est globale a tout le client — c'est, litteralement,
//     le vecteur de test AES-256 de la documentation du NIST.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const CLE = Buffer.from('603deb1015ca71be2b73aef0857d77811f352c073b6108d72d9810a30914dff4', 'hex');
const debrouille = b => { const o = Buffer.allocUnsafe(b.length); for (let i = 0; i < b.length; i++) o[i] = (((b[i] << 4) | (b[i] >> 4)) & 0xff) ^ 0xf7; return o; };

function ouvrir(chemin) {
  const brut = fs.readFileSync(chemin);
  const index = debrouille(brut);
  const d = index.indexOf('"V0.01"');
  if (d < 0) throw new Error('signature absente : ' + chemin);
  const nb = index.readUInt16LE(d + 7);
  let p = d + 9;
  const entrees = [];
  for (let i = 0; i < nb; i++) {
    const n = index.readUInt16LE(p);
    const nom = index.toString('latin1', p + 2, p + 2 + n);
    const q = p + 2 + n;
    entrees.push({ nom, taille: index.readUInt32LE(q), offset: index.readUInt32LE(q + 8) });
    p = q + 12;
  }
  return { brut, entrees };
}
function dechiffrer(charge) {
  const x = crypto.createDecipheriv('aes-256-cbc', CLE, charge.subarray(0, 16));
  x.setAutoPadding(true);                       // PKCS#7
  return Buffer.concat([x.update(charge.subarray(16)), x.final()]);
}
const [, , cmd, archive, dest] = process.argv;
const { brut, entrees } = ouvrir(archive);
if (cmd === 'l') {
  console.log(entrees.length + ' fichiers dans ' + path.basename(archive));
  entrees.forEach(e => console.log(String(e.taille).padStart(10) + '  ' + e.nom));
} else {
  fs.mkdirSync(dest, { recursive: true });
  let ok = 0, ko = [];
  for (const e of entrees) {
    try {
      fs.writeFileSync(path.join(dest, e.nom.replace(/[\/\\]/g, '_')), dechiffrer(brut.subarray(e.offset, e.offset + e.taille)));
      ok++;
    } catch (err) { ko.push(e.nom); }
  }
  console.log(path.basename(archive) + ' : ' + ok + ' extraits' + (ko.length ? ', ' + ko.length + ' en echec (' + ko.slice(0, 3).join(', ') + ')' : ''));
}
