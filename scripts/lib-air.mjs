// ════════════════════════════════════════════════════════════════════════
//  LIRE UNE ARCHIVE .air DU CLIENT AIRFLYFF
// ════════════════════════════════════════════════════════════════════════
//
// Même serrure que `scripts/extraire-air.js`, mais en module : les scripts
// d'extraction lisent l'archive EN MÉMOIRE au lieu de déposer des fichiers sur
// le disque. On ne recopie donc plus le client dans un dossier de travail, et un
// relevé se refait d'une seule commande.
//
// Deux couches, dans cet ordre :
//   1. L'INDEX est brouillé par échange des quartets de chaque octet puis XOR
//      0xF7. Structure : "V0.01", [u16 nombre de fichiers], puis par entrée
//      [u16 longueur du nom][nom][u32 taille][u32 horodatage][u32 offset].
//   2. Chaque CHARGE UTILE est en AES-256-CBC, son IV en tête (16 octets),
//      remplissage PKCS#7. La clé est globale à tout le client — c'est,
//      littéralement, le vecteur de test AES-256 de la documentation du NIST.
//
// Les fichiers du client n'ont pas tous le même encodage :
//   · `*.txt.txt`  → UTF-16LE (avec marque d'ordre des octets)
//   · `*.inc`      → UTF-16LE pour certains, Windows-1252 pour d'autres
//   · `*.h`, `*.txt`, `*.json`, `*.csv` → Windows-1252, parfois UTF-8
// D'où `texte()` : il regarde les octets au lieu de croire l'extension.

import fs from "node:fs";
import crypto from "node:crypto";

const CLE = Buffer.from("603deb1015ca71be2b73aef0857d77811f352c073b6108d72d9810a30914dff4", "hex");

const debrouille = (b) => {
  const o = Buffer.allocUnsafe(b.length);
  for (let i = 0; i < b.length; i++) o[i] = (((b[i] << 4) | (b[i] >> 4)) & 0xff) ^ 0xf7;
  return o;
};

/** Rend une Map nom de fichier → contenu déchiffré. */
export function lireArchive(chemin) {
  const brut = fs.readFileSync(chemin);
  const index = debrouille(brut);
  const d = index.indexOf('"V0.01"');
  if (d < 0) throw new Error("signature absente : " + chemin);
  const nb = index.readUInt16LE(d + 7);
  const sortie = new Map();
  let p = d + 9;
  for (let i = 0; i < nb; i++) {
    const n = index.readUInt16LE(p);
    const nom = index.toString("latin1", p + 2, p + 2 + n);
    const q = p + 2 + n;
    const taille = index.readUInt32LE(q);
    const offset = index.readUInt32LE(q + 8);
    p = q + 12;
    const charge = brut.subarray(offset, offset + taille);
    try {
      const x = crypto.createDecipheriv("aes-256-cbc", CLE, charge.subarray(0, 16));
      x.setAutoPadding(true);
      sortie.set(nom, Buffer.concat([x.update(charge.subarray(16)), x.final()]));
    } catch {
      // Une entrée illisible n'arrête pas la lecture : elle est simplement absente.
    }
  }
  return sortie;
}

/** Décode un contenu en texte, en reconnaissant l'encodage sur les octets. */
export function texte(buf) {
  if (buf[0] === 0xff && buf[1] === 0xfe) return buf.toString("utf16le").replace(/^﻿/, "");
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) return buf.toString("utf8").replace(/^﻿/, "");
  // Un fichier UTF-16LE sans marque : un octet sur deux est nul.
  let nuls = 0;
  const n = Math.min(buf.length, 2000);
  for (let i = 1; i < n; i += 2) if (buf[i] === 0) nuls++;
  if (nuls > n / 4) return buf.toString("utf16le");
  const u8 = buf.toString("utf8");
  return u8.includes("�") ? buf.toString("latin1") : u8;
}

/** Lit un fichier dans une archive, en texte. Lève si l'entrée manque. */
export function fichier(archive, nom) {
  const b = archive.get(nom);
  if (!b) throw new Error("entrée absente de l'archive : " + nom + " (présentes : " + [...archive.keys()].slice(0, 8).join(", ") + "…)");
  return texte(b);
}
