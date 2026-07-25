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
