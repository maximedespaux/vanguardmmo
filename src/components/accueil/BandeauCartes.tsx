"use client";
import React from "react";

/**
 * Un bandeau dont le fond est une frise des illustrations de cartes du jeu, au
 * lieu du dégradé orange nu qu'on posait derrière chaque grand titre.
 *
 * Trois précautions, chacune pour un ennui déjà vu ailleurs sur le site :
 *
 * 1. La frise dépasse forcément à droite (19 cartes de 110 px = 2 090 px). Elle
 *    est donc enfermée dans un conteneur `overflow:hidden` — sans quoi c'est la
 *    PAGE qui gagne une barre horizontale, et sur mobile tout le site se décale.
 * 2. Les cartes sont assombries et désaturées, puis recouvertes d'un voile.
 *    Ce sont des illustrations très colorées : à pleine intensité, aucun texte
 *    blanc ne tient dessus.
 * 3. Aucun `alt` et `aria-hidden` : c'est du décor. Dix-neuf « illustration de
 *    carte » dans un lecteur d'écran seraient dix-neuf nuisances avant le titre.
 *
 * Les fichiers sont vérifiés présents dans `public/jeu/cartes/` — une frise à
 * moitié cassée serait pire qu'un dégradé.
 */
const CARTES = [
  "couleur_ii_sys_sys_monsterdeck_67", "couleur_ii_sys_sys_monsterdeck_45",
  "couleur_souverain_prestigieux_bck", "couleur_ii_sys_sys_monsterdeck_63",
  "couleur_ii_sys_sys_monsterdeck_30", "couleur_ii_sys_sys_monsterdeck_58",
  "couleur_maitre_des_cartes_bck", "couleur_ii_sys_sys_monsterdeck_51",
  "couleur_ii_sys_sys_monsterdeck_12", "couleur_ii_sys_sys_monsterdeck_68",
  "couleur_sasha_bck", "couleur_ii_sys_sys_monsterdeck_47",
  "couleur_ii_sys_sys_monsterdeck_5", "couleur_ii_sys_sys_monsterdeck_61",
  "couleur_macoodoo_bck", "couleur_ii_sys_sys_monsterdeck_55",
  "couleur_ii_sys_sys_monsterdeck_64", "couleur_ii_sys_sys_monsterdeck_18",
  "couleur_ii_sys_sys_monsterdeck_1",
];

export function BandeauCartes({ children }: { children: React.ReactNode }) {
  return (
    <div className="acc-band">
      <div className="acc-band-frise" aria-hidden="true">
        {CARTES.map((c, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={c}
            src={`/jeu/cartes/${c}.webp`}
            alt=""
            width={110}
            height={250}
            loading="lazy"
            decoding="async"
            /* Une carte sur deux légèrement décalée : alignées au cordeau, dix-neuf
               rectangles de même taille lisaient comme une barre de chargement. */
            style={{ transform: `translateY(${i % 2 ? 14 : -8}px) rotate(${i % 2 ? 1.2 : -1.2}deg)` }}
          />
        ))}
      </div>
      <div className="acc-band-voile" aria-hidden="true" />
      <div className="acc-band-txt">{children}</div>

      {/* ── POURQUOI CETTE CSS EST ÉCRITE COMME ÇA ── (sorti du littéral : dans le
          gabarit, ces lignes partaient dans le `<style>` servi au navigateur — et
          il fallait s'y interdire l'accent grave, qui refermait le gabarit)

          .acc-band-frise — align-items:stretch et hauteur 100 % plutôt que les
          250 px d'origine : le bandeau fait plus de 250 px de haut, et des cartes
          centrées à leur taille native laissaient deux bandes noires au-dessus et
          en dessous.

          .acc-band-voile — deux voiles superposés : un aplat pour le contraste, un
          halo orange pour rattacher le bandeau à la charte. Le dégradé horizontal
          est volontairement asymétrique — le texte occupe la gauche, donc c'est à
          gauche qu'il faut du noir, et à droite qu'on peut laisser voir la peinture.
          En étroit le texte prend toute la largeur et la fenêtre claire de droite
          passerait dessous : le voile redevient uniforme. */}
      <style>{`
        .acc-band{position:relative;overflow:hidden;border-radius:18px;border:1px solid var(--border);
          background:#08080b;margin-top:26px}
        .acc-band-frise{position:absolute;inset:0;display:flex;gap:6px;align-items:stretch;
          filter:saturate(.7) brightness(.62);pointer-events:none}
        .acc-band-frise img{flex:0 0 auto;width:110px;height:100%;object-fit:cover;border-radius:6px}
        .acc-band-voile{position:absolute;inset:0;pointer-events:none;background:
          radial-gradient(ellipse 60% 100% at 22% 50%, rgba(255,140,26,.14), transparent 72%),
          linear-gradient(90deg, rgba(8,8,11,.96) 0%, rgba(8,8,11,.93) 42%, rgba(8,8,11,.66) 76%, rgba(8,8,11,.90) 100%),
          linear-gradient(180deg, rgba(8,8,11,.42), rgba(8,8,11,.60))}
        .acc-band-txt{position:relative;z-index:2;padding:34px 30px}
        @media(max-width:760px){
          .acc-band-txt{padding:26px 20px}
          .acc-band-voile{background:
            radial-gradient(ellipse 80% 100% at 50% 50%, rgba(255,140,26,.12), transparent 74%),
            linear-gradient(180deg, rgba(8,8,11,.90), rgba(8,8,11,.94))}
        }
      `}</style>
    </div>
  );
}
