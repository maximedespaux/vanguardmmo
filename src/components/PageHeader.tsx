import React from "react";
import { Icon, type IconName } from "@/components/Icon";

/** En-tête de page designé. Si `banner` est fourni, affiche l'image de titre (bannière)
 *  à la place du titre texte. Sinon : icône SVG en tuile + titre + sous-titre. */
export function PageHeader({ icon, title, subtitle, banner, right }: { icon?: IconName; title: string; subtitle?: string; banner?: string; right?: React.ReactNode }) {
  return (
    <div className="vg-pagehead">
      {banner ? (
        <div className="vg-pagehead-bannerwrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={banner} alt={title} className="vg-pagehead-banner" />
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
