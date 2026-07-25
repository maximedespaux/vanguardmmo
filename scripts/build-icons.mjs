/**
 * Génère public/icons/vg-icons.js à partir de src/lib/vg-icon-paths.ts.
 *
 * Pourquoi : les deux apps « vanilla » (public/airbuilder/airbuilder.js et
 * public/airguild/airguild.js) construisent leur HTML sous forme de chaînes et
 * ne peuvent donc pas utiliser le composant React <Icon>. Ce fichier leur
 * expose la MÊME source d'icônes via window.VGI(name, opts) -> chaîne <svg>.
 *
 * Lancer :  npm run icons      (à refaire après tout ajout d'icône)
 */
import fs from "node:fs";
import path from "node:path";

const SRC = "src/lib/vg-icon-paths.ts";
const OUT = "public/icons/vg-icons.js";

const ts = fs.readFileSync(SRC, "utf8");

// Le fichier source est généré et a une forme stable :   "nom": "<markup>",
const re = /^\s*"([a-z0-9-]+)":\s*"((?:[^"\\]|\\.)*)",\s*$/gm;
const icons = {};
let m;
while ((m = re.exec(ts)) !== null) {
  icons[m[1]] = m[2].replace(/\\"/g, '"').replace(/\\\\/g, "\\");
}

const count = Object.keys(icons).length;
if (count === 0) {
  console.error("✗ Aucune icône extraite de " + SRC + " — format inattendu, génération annulée.");
  process.exit(1);
}
// Garde-fou : le nombre d'entrées doit correspondre aux clés déclarées dans le source.
const declared = (ts.match(/^\s*"[a-z0-9-]+":\s*"/gm) || []).length;
if (declared !== count) {
  console.error(`✗ Incohérence : ${declared} clés dans le source, ${count} extraites. Génération annulée.`);
  process.exit(1);
}

const banner = `/* FICHIER GÉNÉRÉ — NE PAS ÉDITER À LA MAIN.
 * Source : ${SRC}  ·  Régénérer : npm run icons
 * Expose window.VGI(name, opts) -> chaîne SVG, pour airbuilder.js / airguild.js.
 */`;

const body = `${banner}
(function (g) {
  var P = ${JSON.stringify(icons, null, 0)};

  /**
   * VGI("cart")                     -> svg 24px, couleur héritée (currentColor)
   * VGI("cart", 16)                 -> svg 16px
   * VGI("cart", {size:16, cls:"x"}) -> classe CSS en plus
   * VGI("cart", {framed:true, tone:"gold"}) -> cadre RPG doré
   */
  function VGI(name, opts) {
    var d = P[name];
    if (!d) return "";
    if (typeof opts === "number") opts = { size: opts };
    opts = opts || {};
    var framed = !!opts.framed;
    var frameSize = opts.frameSize || 28;
    var size = opts.size || (framed ? Math.round(frameSize * 0.62) : 24);
    var sw = opts.strokeWidth || 1.9;
    var cls = opts.cls ? " " + opts.cls : "";
    var svg =
      '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true" focusable="false" style="flex-shrink:0;display:block"' +
      (framed ? "" : ' class="vgi' + cls + '"') + ">" + d + "</svg>";
    if (!framed) return svg;
    var tone = opts.tone ? " vgi-" + opts.tone : "";
    return (
      '<span class="vgi-frame' + tone + cls + '" style="width:' + frameSize + "px;height:" + frameSize + 'px">' +
      svg +
      "</span>"
    );
  }

  VGI.has = function (name) { return !!P[name]; };
  VGI.names = function () { return Object.keys(P); };

  g.VGI = VGI;
  g.VG_ICON_PATHS = P;
})(typeof window !== "undefined" ? window : globalThis);
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, body);
console.log(`✓ ${OUT} — ${count} icônes générées depuis ${SRC}`);

/* ── Variante CSS : <i class=vgi-nom></i> ─────────────────────────────────────
   Pourquoi une deuxième forme : dans airbuilder.js / airguild.js les emojis sont
   noyés dans des chaînes aux guillemets mêlés (simples, doubles, gabarits).
   Insérer du SVG ou une concaténation y serait cassant selon le contexte.
   Cette balise ne contient AUCUN guillemet (attribut HTML5 non quoté) : elle est
   donc insérable telle quelle dans n'importe quelle chaîne JS.
   Le tracé passe par `mask`, la couleur par background-color:currentColor —
   l'icône hérite donc la couleur du texte, exactement comme <Icon>.          */
const OUT_CSS = "public/icons/vg-icons.css";
const svgDataUri = (d) => {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" ` +
    `stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  // encodeURIComponent est sûr dans url("…") ; on garde quelques caractères lisibles.
  return encodeURIComponent(svg).replace(/%20/g, " ").replace(/%3D/g, "=").replace(/%3A/g, ":").replace(/%2F/g, "/");
};
let css = `/* FICHIER GÉNÉRÉ — NE PAS ÉDITER À LA MAIN.
 * Source : ${SRC}  ·  Régénérer : npm run icons
 * Usage : <i class=vgi-nom></i>  (attribut non quoté = insérable dans toute chaîne JS)
 * L'icône prend la taille de la police (1em) et la couleur du texte.
 */
[class^="vgi-"]{display:inline-block;width:1em;height:1em;vertical-align:-.14em;flex-shrink:0;
  background-color:currentColor;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;
  -webkit-mask-position:center;mask-position:center;-webkit-mask-size:contain;mask-size:contain}
/* Icone SEULE dans son conteneur : en inline elle est alignee sur la ligne de
   base, donc le parent prend la hauteur de sa line-height (ex. 24px d'icone dans
   une boite de 36px) et l'icone apparait decentree verticalement. En display:block
   le parent n'a plus de contenu inline : sa hauteur devient celle de l'icone.
   margin:auto la recentre horizontalement dans un parent plus large. */
[class^="vgi-"]:only-child{display:block;margin-left:auto;margin-right:auto;vertical-align:top}
/* .vgi-frame est un conteneur stylé (globals.css), pas un masque : on l'exclut. */
.vgi-frame{background-color:transparent;-webkit-mask:none;mask:none;width:auto;height:auto}
`;
for (const [n, d] of Object.entries(icons)) {
  const u = `url("data:image/svg+xml,${svgDataUri(d)}")`;
  css += `.vgi-${n}{-webkit-mask-image:${u};mask-image:${u}}\n`;
}
fs.writeFileSync(OUT_CSS, css);
console.log(`✓ ${OUT_CSS} — ${count} classes générées (${Math.round(css.length / 1024)} Ko)`);
