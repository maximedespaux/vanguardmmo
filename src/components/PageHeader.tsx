import React from "react";
import { Icon, type IconName } from "@/components/Icon";

/** En-tête de page designé : icône SVG en tuile + titre + sous-titre.
 *
 *  `banner` NE POSE PLUS D'IMAGE (GENESIS, 2026-10-20). Les bannières de
 *  /assets/site/banners/ portaient la chauve-souris de Vanguard et le mot de la
 *  page DESSINÉ en orange dans l'image : neuf pages affichaient donc l'ancienne
 *  identité, et chaque page nouvelle aurait exigé une image de plus. Le titre est
 *  désormais toujours du TEXTE — un vrai `h1`, lisible par les moteurs et les
 *  lecteurs d'écran — et `banner` ne fait plus que le dire « d'apparat » : plus
 *  grand, en métal (`.is-apparat` dans genesis.css). La valeur de la prop est
 *  ignorée ; les pages qui la passent n'ont pas à changer.
 *
 *  `art` — un artwork du jeu en FOND de l'en-tête, derrière le titre : on gagne
 *  l'aspect du jeu sans perdre le `h1`, ni annoncer autre chose que ce qu'on lit.
 *
 *  Le recadrage de l'image se joue dans `globals.css` (.vg-pagehead-art), et il
 *  n'est pas décoratif : les écrans de chargement du client portent le logo de
 *  l'éditeur et une barre de progression incrustés dans leur tiers bas. */
export function PageHeader({ icon, title, subtitle, banner, art, right }: { icon?: IconName; title: string; subtitle?: string; banner?: string; art?: string; right?: React.ReactNode }) {
  return (
    <div className={`vg-pagehead${art ? " has-art" : ""}${banner ? " is-apparat" : ""}`}>
      {art && (
        <>
          {/* `alt=""` et non le titre : l'image est un décor, et le titre est déjà
              porté par le h1 juste en dessous — l'annoncer deux fois ferait
              répéter la même phrase à un lecteur d'écran. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={art} alt="" aria-hidden="true" className="vg-pagehead-art" />
          <span aria-hidden="true" className="vg-pagehead-artveil" />
        </>
      )}
      <div className="vg-pagehead-row">
        {icon && <span className="vg-pagehead-ic"><Icon name={icon} size={26} style={{ color: "var(--gn-accent)" }} /></span>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="vg-pagehead-title">{title}</h1>
          {subtitle && <p className="vg-pagehead-sub">{subtitle}</p>}
        </div>
        {right}
      </div>
    </div>
  );
}
