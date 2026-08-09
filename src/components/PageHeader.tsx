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
 *  d'écran, et rien ne bouge à l'écran. */
export function PageHeader({ icon, title, subtitle, banner, right }: { icon?: IconName; title: string; subtitle?: string; banner?: string; right?: React.ReactNode }) {
  return (
    <div className="vg-pagehead">
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
