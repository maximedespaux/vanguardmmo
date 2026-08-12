import React from "react";
import { Icon, type IconName } from "@/components/Icon";

/** En-tête de page designé. Si `banner` est fourni, affiche l'image de titre (bannière)
 *  à la place du titre texte. Sinon : icône SVG en tuile + titre + sous-titre.
 *
 *  Ce qui ne marchait pas : la branche « bannière » ne posait AUCUN titre. Le nom
 *  de la page n'existait que dans le `alt` de l'image, donc les pages publiques
 *  (donjons, guide, prestige) — celles qu'on veut justement voir remonter dans un
 *  moteur de recherche — n'avaient pas un seul `h1`. La bannière est désormais
 *  enveloppée dans le `h1` : le titre existe pour les moteurs et les lecteurs
 *  d'écran, et rien ne bouge à l'écran.
 *
 *  `art` — un artwork du jeu en FOND de l'en-tête, derrière le titre. C'est la
 *  troisième voie, et celle des pages récentes :
 *
 *   · `banner` ne convient pas à une page neuve. Nos bannières sont des logos avec
 *     le mot DÉJÀ DESSINÉ dedans (banner-pve.webp dit « PvE ») — il n'en existe
 *     pas pour « Monstres » ou « Compétences », et réutiliser celle du PvE
 *     mettrait un mot faux au-dessus de la page.
 *   · `art` garde le titre en TEXTE et met l'image derrière. On gagne l'aspect du
 *     jeu sans perdre le `h1`, ni annoncer autre chose que ce qu'on lit.
 *
 *  Le recadrage de l'image se joue dans `globals.css` (.vg-pagehead-art), et il
 *  n'est pas décoratif : les écrans de chargement du client portent le logo de
 *  l'éditeur et une barre de progression incrustés dans leur tiers bas. */
export function PageHeader({ icon, title, subtitle, banner, art, right }: { icon?: IconName; title: string; subtitle?: string; banner?: string; art?: string; right?: React.ReactNode }) {
  return (
    <div className={`vg-pagehead${art ? " has-art" : ""}`}>
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
      {banner ? (
        <div className="vg-pagehead-bannerwrap">
          <h1 className="vg-pagehead-bannerh1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={banner} alt={title} className="vg-pagehead-banner" />
          </h1>
          {subtitle && <p className="vg-pagehead-sub">{subtitle}</p>}
        </div>
      ) : (
        <div className="vg-pagehead-row">
          {icon && <span className="vg-pagehead-ic"><Icon name={icon} size={26} style={{ color: "var(--orange)" }} /></span>}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 className="vg-pagehead-title">{title}</h1>
            {subtitle && <p className="vg-pagehead-sub">{subtitle}</p>}
          </div>
          {right}
        </div>
      )}
    </div>
  );
}
