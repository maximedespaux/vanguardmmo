"use client";
import Link from "next/link";
import { Icon, type IconName } from "@/components/Icon";
import dungeons from "@/data/dungeons.json";

/**
 * UNE PORTE — un pavé cliquable qui dit où il mène, ce qu'on y trouve, et une
 * grandeur qui prouve que c'est vivant.
 *
 * Le composant ne servait qu'à l'accueil public, et sa liste de quatre entrées
 * vivait en dur dedans. Il sert maintenant AUSSI à l'accueil de la guilde, qui a
 * une vingtaine de portes et lit leurs comptes sur ses API. D'où trois ajouts, et
 * rien de plus — la liste devient une prop dont le DÉFAUT est la liste publique,
 * donc l'accueil public n'a pas bougé d'un pixel :
 *
 *   · `portes` — la liste à afficher ;
 *   · `min`    — la largeur minimale d'une colonne (voir la note de la grille) ;
 *   · `verrou` — le cadenas du client sur une porte réservée.
 */
export type Porte = {
  href: string;
  icon: IconName;
  titre: string;
  texte: string;
  /**
   * Une mesure, ou une promesse vérifiable — et FACULTATIF, c'est le point.
   * Sur l'accueil de guilde, la plupart des portes n'ont rien à mesurer :
   * remplir la ligne avec un chiffre inventé serait exactement ce que la maison
   * interdit. Pas de mesure, pas de ligne.
   */
  chiffre?: string;
  /** Teinte du chiffre. Défaut : var(--gold). */
  ton?: string;
  /**
   * Réservé aux membres, et DIT AVANT LE CLIC.
   *
   * C'est le motif déjà établi sur /histoire : le cadenas du client
   * (interface/lock.webp) plutôt qu'une icône maison, parce que le jeu s'en sert
   * exactement pour ça et qu'un joueur le reconnaît sans légende. Sans lui, la
   * porte serait un mur — un visiteur cliquerait et tomberait sur /login, renvoyé
   * par la porte qu'on venait de lui ouvrir.
   */
  verrou?: boolean;
};

/**
 * LES PORTES DE L'ACCUEIL PUBLIC — ce que le site FAIT, en un écran.
 *
 * Elles étaient quatre et toutes ouvertes. Elles sont dix, dont trois sous
 * cadenas, et c'est un changement de propos : la page ne dit plus seulement « par
 * où commencer », elle répond à « qu'est-ce que ce site sait faire, et qu'est-ce
 * qui s'ouvre si je me connecte ». Demande de fond de Maxime sur la vitrine —
 * « en public voir les fonctionnalités mises en place ».
 *
 * CE BLOC A ÉTÉ RAPATRIÉ DE /histoire, il n'a pas été inventé ici. Là-bas, huit
 * cartes « Les fonctionnalités du site » racontaient la même chose, et quatre de
 * ces cartes menaient aux quatre mêmes destinations que ces portes-ci. Deux pages
 * pour un sujet, et l'accueil — la page qu'un visiteur voit en premier — était la
 * moins bien servie des deux. /histoire garde la GUILDE (qui on est, ce qu'on
 * attend, comment postuler), l'accueil prend le SITE.
 *
 * L'ACCÈS RÉEL DE CHAQUE DESTINATION A ÉTÉ VÉRIFIÉ DANS LE CODE, groupe de routes
 * par groupe de routes, et pas déduit du menu — la nav annonce /objets comme
 * publique alors que le fichier vit dans (guild) et passe donc par requireGuild :
 *
 *   ouvertes    (public)  /donjons /astuces /prestige /builder /monstres
 *   vitrine     (vitrine) /boutique /crafts — visibles sans compte, inertes ou
 *                         amputées de ce qui se garde
 *   cadenas     (guild)   /compositions /worldboss /dashboard
 *
 * ET LE CADENAS NE VEUT PAS DIRE « connecte-toi ». Ces trois adresses sont dans
 * GUILD_PREFIXES du middleware, dont la liste de rôles EXCLUT RECRUE : un joueur qui
 * se connecte avec Discord sans être de la guilde est renvoyé sur `/?error=guild`.
 * Le mot du cadenas est donc « membres », et la phrase qui présente ces portes ne
 * doit promettre que ça.
 *
 * « 23 instances » était écrit à la main. C'est le seul des chiffres qui se
 * COMPTE — les autres sont des promesses, pas des mesures — et c'est justement
 * celui qui devient faux tout seul le jour où une instance rejoint le relevé. La
 * carte le lit désormais dans les mêmes données que la page où elle mène.
 */
export const PORTES_PUBLIQUES: Porte[] = [
  {
    href: "/builder", icon: "shirt", titre: "AirBuilder",
    texte: "Monte ton stuff pièce par pièce : perçage, sertissage, runes, sets, fée et familier.",
    chiffre: "sans connexion",
  },
  {
    href: "/donjons", icon: "skull", titre: "Les donjons",
    texte: "Le niveau, l'élément, le prestige exigé et le butin de chaque instance.",
    chiffre: `${(dungeons as unknown[]).length} instances`,
  },
  {
    href: "/prestige", icon: "star", titre: "Prestige",
    texte: "Ce que coûte un palier, ce qu'il rapporte, et où tu en es de ton farm.",
    chiffre: "P3 → P10",
  },
  {
    href: "/astuces", icon: "compass", titre: "Guide de progression",
    texte: "Par où commencer et quoi viser ensuite — pour ne pas farmer au mauvais endroit.",
    chiffre: "palier par palier",
  },
  {
    href: "/monstres", icon: "paw", titre: "Les monstres",
    texte: "PV, dégâts, élément — et les boss qui rendent plusieurs vies avant de tomber.",
  },
  {
    /* La boutique est le seul écran du site en mode VITRINE : le middleware ne la
       protège pas et son layout n'a pas de garde, donc un visiteur voit le vrai
       stock et les vrais prix. Elle n'a donc pas de cadenas — ce serait faux — et
       son chiffre dit exactement ce qu'on peut en faire sans compte. Commander,
       lui, se heurte à /api/bank-request, gardée par apiGuild. */
    href: "/boutique", icon: "cart", titre: "La boutique",
    texte: "Le stock commun de la guilde, avec ses prix. Commander demande d'être membre.",
    chiffre: "à regarder sans compte",
  },
  {
    href: "/compositions", icon: "castle", titre: "Chambres Secrètes",
    texte: "Qui vient, à quel poste, et comment on joue chaque salle.",
    verrou: true,
  },
  {
    href: "/worldboss", icon: "dragon", titre: "World Boss",
    texte: "Les prochains passages, et qui s'est annoncé pour y aller.",
    verrou: true,
  },
  {
    /* PAS DE CADENAS, et c'est une CORRECTION : la page a changé de groupe. Elle
       vivait dans (guild) ; elle est passée dans (vitrine), qui n'appelle aucun
       garde — un visiteur la lit, et seule la colonne des recettes ÉTEINTES lui est
       refusée (voir le commentaire de tête de src/app/(vitrine)/crafts/page.tsx).
       Un cadenas « membres » sur une page qui s'ouvre à tout le monde est un mur
       imaginaire : il retient un visiteur devant une porte ouverte, ce qui est le
       symétrique exact du défaut que ce cadenas existe pour éviter. */
    href: "/crafts", icon: "hammer", titre: "Crafts & collections",
    texte: "Les recettes, l'arbre du farm, les titres et les succès.",
    chiffre: "à regarder sans compte",
  },
  {
    href: "/dashboard", icon: "home", titre: "L'accueil de la guilde",
    texte: "Ce qui t'attend, où tu en es, et toutes les fonctionnalités réservées.",
    verrou: true,
  },
];

export function PortesSite({ portes = PORTES_PUBLIQUES, min = 400 }: { portes?: Porte[]; min?: number }) {
  return (
    // La largeur de colonne passe par une variable CSS et non par une classe :
    // deux appels du composant sur une même page (les groupes de l'accueil de
    // guilde) demandent deux densités, et une variable posée en ligne reste
    // locale à son instance.
    <div className="acc-portes" style={{ ["--porte-min" as string]: `${min}px` }}>
      {portes.map((p, i) => (
        <Link key={p.href} href={p.href} className="acc-porte fx-card vg-reveal" style={{ transitionDelay: `${i * 55}ms` }}>
          <span className="acc-porte-ic"><Icon name={p.icon} size={22} /></span>
          <span className="acc-porte-txt">
            <span className="acc-porte-tl">
              <span className="font-heading acc-porte-t">{p.titre}</span>
              {p.verrou && (
                <span className="acc-porte-v" title="Réservé aux membres de la guilde">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/jeu/interface/lock.webp" alt="" width={10} height={12} />
                  membres
                </span>
              )}
            </span>
            {/* La description ne se rend que si elle existe. C'est ce qui permet à
                l'accueil de guilde de proposer un mode compact : 21 portes, c'est
                21 lignes de description, et le rang Vanguard doit pouvoir les
                replier sans qu'on touche au code. */}
            {p.texte && <span className="acc-porte-d">{p.texte}</span>}
            {p.chiffre && <span className="acc-porte-c" style={p.ton ? { color: p.ton } : undefined}>{p.chiffre}</span>}
          </span>
          <Icon name="chevron-right" size={17} className="acc-porte-fl" />
        </Link>
      ))}

      <style>{`
        /* 400px et pas 300 : a 300 la grille tenait TROIS colonnes dans les 976 px
           utiles de l'accueil public, et sa quatrieme porte se retrouvait seule sur
           une ligne, deux fois plus large que ses voisines. Quatre portes veulent
           2x2 — d'ou le defaut. Une liste plus longue n'a pas ce probleme et passe
           une valeur plus serree. */
        /* auto-FILL et non auto-FIT, et c'est la meme maladie que ci-dessus, mesuree :
           auto-fit EFFACE les colonnes vides, donc une grille d'UNE seule porte lui
           donnait toute la largeur — 1036 px de large contre 337 px pour ses
           voisines, sur l'accueil de guilde ou la porte « Tout le site » est seule
           dans sa grille. auto-fill garde les colonnes vides a leur taille, la porte
           reste large comme les autres. Aucune difference des qu'une grille remplit
           ses colonnes, ce qui est le cas partout ailleurs. */
        .acc-portes{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(var(--porte-min,400px),1fr))}
        @media(max-width:520px){.acc-portes{grid-template-columns:1fr}}
        .acc-porte{display:flex;gap:14px;align-items:flex-start;text-decoration:none;color:var(--text);
          background:var(--bg-2);border:1px solid var(--border);border-radius:14px;padding:18px;
          transition:border-color .2s,transform .2s,box-shadow .2s,opacity .7s cubic-bezier(.22,.61,.36,1)}
        .acc-porte:hover{border-color:rgba(255,140,26,.42);transform:translateY(-3px);box-shadow:0 12px 30px rgba(0,0,0,.45)}
        .acc-porte-ic{flex-shrink:0;width:44px;height:44px;display:flex;align-items:center;justify-content:center;
          border-radius:12px;color:var(--orange);border:1px solid rgba(255,140,26,.32);
          background:linear-gradient(180deg,rgba(255,140,26,.22),rgba(255,140,26,.05))}
        .acc-porte-txt{display:block;flex:1;min-width:0}
        /* Le titre et son cadenas sur une meme ligne de base, et qui se replient
           ensemble : le cadenas colle au titre, pas au bord de la carte. */
        .acc-porte-tl{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
        .acc-porte-t{font-weight:600;font-size:15.5px}
        .acc-porte-d{display:block;color:var(--text-muted);font-size:13px;line-height:1.55;margin-top:3px}
        /* Le chiffre est une promesse verifiable, pas une decoration : il est
           chiffre, donc en chasse fixe pour ne pas danser d'une carte a l'autre. */
        /* Rubik et pas Alef : Alef rend ses chiffres en bas de casse, et « P3 → P10 »
           se lisait « P3 → P10 » en indices. Les chiffres d'un argument doivent etre
           des capitales. */
        .acc-porte-c{display:block;margin-top:8px;font-family:'Rubik',sans-serif;font-variant-numeric:tabular-nums;
          font-size:11.5px;letter-spacing:.6px;text-transform:uppercase;color:var(--gold);opacity:.85}
        /* Le cadenas du jeu, en 10x12 : c'est sa taille native dans le client, et
           l'agrandir le rendrait flou (image-rendering:pixelated ne sauve pas une
           icone de 10 px etiree). */
        .acc-porte-v{display:inline-flex;align-items:center;gap:3px;font-size:10px;text-transform:uppercase;
          letter-spacing:.6px;color:var(--text-muted);font-family:'Alef',sans-serif;font-weight:400}
        .acc-porte-v img{width:10px;height:12px;object-fit:contain;image-rendering:pixelated;opacity:.85}
        /* La fleche ne bouge qu'au survol du lien ENTIER : posee sur la fleche
           seule, elle fuyait le curseur qui la visait. */
        .acc-porte-fl{flex-shrink:0;color:var(--text-muted);margin-top:12px;transition:transform .2s,color .2s}
        .acc-porte:hover .acc-porte-fl{transform:translateX(4px);color:var(--orange)}
      `}</style>
    </div>
  );
}
