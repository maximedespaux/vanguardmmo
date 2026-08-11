"use client";
import { findClass, BOUTON_JEU } from "@/data/classes";
import { Icon } from "./Icon";

// Affiche le logo d'une classe (avec fallback emoji). Usage: <ClassLogo name="Primat" size={28} />
//
// `officiel` bascule sur l'emblème 64x64 du client au lieu du visuel maison.
// Pourquoi une option et pas un remplacement : ce composant est posé dans une
// dizaine d'endroits (compositions, dossier membre, candidature…) calés sur le
// rendu actuel. Changer la source pour tout le monde d'un coup, c'est repeindre
// le site sans l'avoir demandé.
export function ClassLogo({ name, size = 28, showLabel = false, officiel = false }: { name: string; size?: number; showLabel?: boolean; officiel?: boolean }) {
  const c = findClass(name);
  if (!c) return <span style={{ display: "inline-flex", color: "var(--text-muted)" }} title="Classe inconnue"><Icon name="help" size={size * 0.8} /></span>;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={officiel ? c.embleme : c.logo} alt={c.label} title={c.label} width={size} height={size} style={{ objectFit: "contain", verticalAlign: "middle" }} />
      {showLabel && <span>{c.label}</span>}
    </span>
  );
}

// Le bouton de sélection de classe du jeu, dans l'état voulu.
//
// La planche de 216x54 est un sprite de quatre cases de 54x54 : au repos,
// survol, choisi (cerné de jaune), inactif (gris). Affichée entière, elle montre
// donc le même dessin quatre fois de suite — c'est ce qu'on a vu à l'écran avant
// de l'ouvrir. On la pose en fond et on décale de -54 px par case.
//
// Pas de `<img>` : rogner une image, ça se fait en fond, pas en attribut. D'où
// le `role="img"` + `aria-label` pour que la classe garde un nom énoncé.
export function ClassBouton({ name, etat = "repos", size = BOUTON_JEU.case }: {
  name: string;
  etat?: keyof typeof BOUTON_JEU.etats;
  size?: number;
}) {
  const c = findClass(name);
  if (!c) return <span style={{ fontWeight: 700 }}>{name}</span>;
  const ech = size / BOUTON_JEU.case; // la planche se met à l'échelle en bloc, pas case par case
  return (
    <span role="img" aria-label={c.label} title={c.label}
      style={{
        display: "block", width: size, height: size, flexShrink: 0,
        backgroundImage: `url(${c.boutonJeu})`,
        backgroundSize: `${BOUTON_JEU.case * 4 * ech}px ${size}px`,
        backgroundPosition: `-${BOUTON_JEU.etats[etat] * size}px 0`,
        backgroundRepeat: "no-repeat",
        imageRendering: "pixelated", // 54 px agrandis : mieux vaut net que flou
      }} />
  );
}
