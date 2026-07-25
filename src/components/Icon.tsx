/**
 * <Icon> — jeu d'icônes SVG maison de Vanguard (remplace les emojis).
 *
 * Les tracés vivent dans src/lib/vg-icon-paths.ts : c'est la SOURCE UNIQUE,
 * partagée avec les apps vanilla (airbuilder.js / airguild.js) via le fichier
 * généré public/icons/vg-icons.js. Ajouter une icône = éditer vg-icon-paths.ts
 * puis relancer `npm run icons`.
 *
 * Style : line-art 24×24, stroke = currentColor (hérite la couleur → charte orange).
 *
 * Usage :
 *   <Icon name="vault" size={22} />              icône nue, prend la couleur du parent
 *   <Icon name="vault" framed />                 cadre RPG doré (titres, boutons, slots)
 *   <Icon name="vault" framed tone="gold" />     cadre teinté (gold | green | red | blue | purple)
 */
import * as React from "react";
import { ICON_PATHS } from "@/lib/vg-icon-paths";

export type IconName = keyof typeof ICON_PATHS;

/** Teintes disponibles pour la variante encadrée (mappées sur les tokens de globals.css). */
export type IconTone = "orange" | "gold" | "green" | "red" | "blue" | "purple" | "muted";

export interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  size?: number | string;
  strokeWidth?: number;
  /** Enveloppe l'icône dans un cadre RPG (fond sombre + liseré doré). */
  framed?: boolean;
  /** Taille du cadre extérieur quand `framed` (défaut 28). */
  frameSize?: number;
  /** Teinte du tracé et du liseré quand `framed`. */
  tone?: IconTone;
}

export function Icon({
  name,
  size,
  strokeWidth = 1.9,
  framed = false,
  frameSize = 28,
  tone,
  style,
  className,
  ...rest
}: IconProps) {
  const paths = ICON_PATHS[name];
  if (!paths) return null;

  // Dans un cadre, le pictogramme occupe ~62 % du cadre pour garder de l'air autour.
  const glyphSize = size ?? (framed ? Math.round(frameSize * 0.62) : 24);

  const svg = (
    <svg
      width={glyphSize}
      height={glyphSize}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={framed ? undefined : className}
      // `display:block` cassait tous les usages au fil du texte : le libellé qui
      // suivait l'icône passait à la ligne (« ♥ » au-dessus de « 3 000 » au lieu
      // d'être à côté). `inline-block` + vertical-align aligne l'icône sur la
      // ligne de base du texte, et reste correct dans un conteneur flex, où le
      // display de l'enfant est de toute façon neutralisé.
      style={framed
        ? { flexShrink: 0, display: "block" }
        : { flexShrink: 0, display: "inline-block", verticalAlign: "-0.14em", ...style }}
      dangerouslySetInnerHTML={{ __html: paths }}
      {...rest}
    />
  );

  if (!framed) return svg;

  return (
    <span
      className={["vgi-frame", tone ? `vgi-${tone}` : "", className || ""].filter(Boolean).join(" ")}
      style={{ width: frameSize, height: frameSize, ...style }}
    >
      {svg}
    </span>
  );
}

export default Icon;
