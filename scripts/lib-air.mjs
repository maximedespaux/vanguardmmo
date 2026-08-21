// ════════════════════════════════════════════════════════════════════════
//  LIRE UNE ARCHIVE .air DU CLIENT AIRBORN
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
import path from "node:path";
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

// ════════════════════════════════════════════════════════════════════════
//  OÙ EST LE CLIENT — UN SEUL ENDROIT
// ════════════════════════════════════════════════════════════════════════
//
// Le client change d'adresse à chaque livraison : le relevé du site est né d'un
// client d'octobre 2025 (`Desktop/source/AirflyffClient_Octobre_2025/Client`),
// remplacé en août 2026 par `Desktop/Airborn Client`. Trois scripts citaient ce
// chemin chacun de leur côté, et les trois sont tombés le même jour. Il ne se
// cite donc plus qu'ICI.
//
// Ordre de résolution :
//   1. AIRBORN_CLIENT dans l'environnement — le prochain client n'a alors
//      RIEN à changer dans le dépôt : `AIRBORN_CLIENT=… node scripts/…`.
//   2. AIRFLYFF_CLIENT, l'ancien nom de la même variable, encore accepté.
//   3. les emplacements connus, du plus récent au plus ancien.
// Un candidat n'est retenu que s'il porte `data-00.air` : un dossier qui existe
// n'est pas un client, et un chemin faux doit se voir tout de suite plutôt que
// de produire un relevé vide.
const CANDIDATS_CLIENT = [
  process.env.AIRBORN_CLIENT,
  process.env.AIRFLYFF_CLIENT,
  path.join(process.env.HOME ?? "", "Desktop/Airborn Client"),
  path.join(process.env.HOME ?? "", "Desktop/source/AirflyffClient_Octobre_2025/Client"),
].filter(Boolean);

const trouve = CANDIDATS_CLIENT.find((c) => fs.existsSync(path.join(c, "data-00.air")));
if (!trouve) {
  throw new Error(
    "client introuvable — aucun de ces dossiers ne porte data-00.air :\n  " +
      CANDIDATS_CLIENT.join("\n  ") +
      "\nPose AIRBORN_CLIENT sur le dossier du client.",
  );
}

/** Le dossier du client Airborn : celui qui porte `data-00.air` et `FSDATA/`. */
export const CLIENT = trouve;

/** Lit une archive du client par son chemin RELATIF (« data-02.air »). */
export const archive = (relatif) => lireArchive(path.join(CLIENT, relatif));

/**
 * La SIGNATURE du client lu : son dossier, et la date de la plus récente de ses
 * six archives. Un relevé qui la porte dit de quel client il vient — c'est ce
 * qui a manqué en août 2026, quand le client d'octobre 2025 avait disparu du
 * disque et qu'aucune comparaison archive contre archive n'était plus possible.
 * On ne compare alors plus que des relevés, et encore faut-il savoir lesquels.
 */
export function signatureClient() {
  const archives = [];
  for (let i = 0; i <= 5; i++) {
    const p = path.join(CLIENT, "data-0" + i + ".air");
    if (fs.existsSync(p)) { const s = fs.statSync(p); archives.push({ nom: "data-0" + i + ".air", octets: s.size, date: s.mtime.toISOString().slice(0, 10) }); }
  }
  return {
    dossier: path.basename(CLIENT),
    archives: archives.length,
    octets: archives.reduce((n, a) => n + a.octets, 0),
    laPlusRecente: archives.map((a) => a.date).sort().at(-1) ?? null,
    detail: archives,
  };
}
