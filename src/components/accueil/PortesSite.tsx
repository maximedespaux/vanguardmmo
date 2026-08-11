"use client";
import Link from "next/link";
import { Icon, type IconName } from "@/components/Icon";

/**
 * Les quatre choses qu'on vient faire ici sans être encore membre.
 *
 * Toutes les destinations sont PUBLIQUES : elles vivent dans le groupe `(public)`
 * et le middleware ne les protège pas. C'est la contrainte de cette page — un
 * visiteur qui clique et tombe sur `/login` aurait été renvoyé par la porte
 * qu'on venait de lui ouvrir.
 */
const PORTES: { href: string; icon: IconName; titre: string; texte: string; chiffre: string }[] = [
  {
    href: "/donjons", icon: "skull", titre: "Les donjons",
    texte: "Le niveau, l'élément, le prestige exigé et le butin de chaque instance — plus la vidéo du run quand elle existe.",
    chiffre: "23 instances",
  },
  {
    href: "/builder", icon: "shirt", titre: "AirBuilder",
    texte: "Monte ton stuff pièce par pièce : perçage, sertissage, runes, sets, fée et familier. Tu composes sans compte.",
    chiffre: "sans connexion",
  },
  {
    href: "/prestige", icon: "star", titre: "Prestige",
    texte: "Ce que coûte un palier, ce qu'il rapporte, et où tu en es de ton farm entre deux prestiges.",
    chiffre: "P3 → P10",
  },
  {
    href: "/astuces", icon: "compass", titre: "Guide de progression",
    texte: "Par où commencer et quoi viser ensuite, palier par palier — pour ne pas farmer trois jours au mauvais endroit.",
    chiffre: "palier par palier",
  },
];

export function PortesSite() {
  return (
    <div className="acc-portes">
      {PORTES.map((p, i) => (
        <Link key={p.href} href={p.href} className="acc-porte fx-card vg-reveal" style={{ transitionDelay: `${i * 55}ms` }}>
          <span className="acc-porte-ic"><Icon name={p.icon} size={22} /></span>
          <span className="acc-porte-txt">
            <span className="font-heading acc-porte-t">{p.titre}</span>
            <span className="acc-porte-d">{p.texte}</span>
            <span className="acc-porte-c">{p.chiffre}</span>
          </span>
          <Icon name="chevron-right" size={17} className="acc-porte-fl" />
        </Link>
      ))}

      <style>{`
        /* 400px et pas 300 : à 300 la grille tenait TROIS colonnes dans les 976 px
           utiles, et la quatrième porte se retrouvait seule sur une ligne, deux
           fois plus large que ses voisines. Quatre portes veulent 2×2. */
        .acc-portes{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(400px,1fr))}
        @media(max-width:520px){.acc-portes{grid-template-columns:1fr}}
        .acc-porte{display:flex;gap:14px;align-items:flex-start;text-decoration:none;color:var(--text);
          background:var(--bg-2);border:1px solid var(--border);border-radius:14px;padding:18px;
          transition:border-color .2s,transform .2s,box-shadow .2s,opacity .7s cubic-bezier(.22,.61,.36,1)}
        .acc-porte:hover{border-color:rgba(255,140,26,.42);transform:translateY(-3px);box-shadow:0 12px 30px rgba(0,0,0,.45)}
        .acc-porte-ic{flex-shrink:0;width:44px;height:44px;display:flex;align-items:center;justify-content:center;
          border-radius:12px;color:var(--orange);border:1px solid rgba(255,140,26,.32);
          background:linear-gradient(180deg,rgba(255,140,26,.22),rgba(255,140,26,.05))}
        .acc-porte-txt{display:block;flex:1;min-width:0}
        .acc-porte-t{display:block;font-weight:600;font-size:15.5px}
        .acc-porte-d{display:block;color:var(--text-muted);font-size:13px;line-height:1.55;margin-top:3px}
        /* Le chiffre est une promesse vérifiable, pas une décoration : il est
           chiffré, donc en chasse fixe pour ne pas danser d'une carte à l'autre. */
        /* Rubik et pas Alef : Alef rend ses chiffres en bas de casse, et « P3 → P10 »
           se lisait « P₃ → P₁₀ ». Les chiffres d'un argument doivent être des capitales. */
        .acc-porte-c{display:block;margin-top:8px;font-family:'Rubik',sans-serif;font-variant-numeric:tabular-nums;
          font-size:11.5px;letter-spacing:.6px;text-transform:uppercase;color:var(--gold);opacity:.85}
        /* La flèche ne bouge qu'au survol du lien ENTIER : posée sur la flèche
           seule, elle fuyait le curseur qui la visait. */
        .acc-porte-fl{flex-shrink:0;color:var(--text-muted);margin-top:12px;transition:transform .2s,color .2s}
        .acc-porte:hover .acc-porte-fl{transform:translateX(4px);color:var(--orange)}
      `}</style>
    </div>
  );
}
