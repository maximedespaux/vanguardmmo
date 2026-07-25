/**
 * Rend une icône Vanguard sous forme de CHAÎNE HTML, pour les endroits qui
 * construisent du markup au lieu de faire du JSX (ex. builder/markup.ts, injecté
 * via dangerouslySetInnerHTML). Même source de tracés que <Icon> : aucune copie.
 */
import { ICON_PATHS } from "./vg-icon-paths";

export interface VgIconHtmlOptions {
  size?: number;
  strokeWidth?: number;
  /** Cadre RPG doré (cf. .vgi-frame dans globals.css). */
  framed?: boolean;
  frameSize?: number;
  tone?: "orange" | "gold" | "green" | "red" | "blue" | "purple" | "muted";
  cls?: string;
  /** Style inline additionnel (ex. alignement vertical au fil du texte). */
  style?: string;
}

export function vgIconHtml(name: keyof typeof ICON_PATHS, opts: VgIconHtmlOptions = {}): string {
  const d = ICON_PATHS[name];
  if (!d) return "";
  const framed = !!opts.framed;
  const frameSize = opts.frameSize ?? 28;
  const size = opts.size ?? (framed ? Math.round(frameSize * 0.62) : 24);
  const sw = opts.strokeWidth ?? 1.9;
  const cls = opts.cls ? ` ${opts.cls}` : "";
  const style = opts.style ? `;${opts.style}` : "";
  const svg =
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" ` +
    `stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" ` +
    `style="flex-shrink:0;display:block${style}"${framed ? "" : ` class="vgi${cls}"`}>${d}</svg>`;
  if (!framed) return svg;
  const tone = opts.tone ? ` vgi-${opts.tone}` : "";
  return `<span class="vgi-frame${tone}${cls}" style="width:${frameSize}px;height:${frameSize}px">${svg}</span>`;
}
