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
 * Elles étaient quatre et toutes ouvertes. Il y en a maintenant treize, dont quatre sous
 * cadenas, et c'est un changement de propos : la page ne dit plus seulement « par
 * où commencer », elle répond à « qu'est-ce que ce site sait faire, et qu'est-ce
 * qui s'ouvre si je me connecte ». Demande de fond de Maxime sur la vitrine —
 * « en public voir les fonctionnalités mises en place ».
 *
 * CES DEUX NOMBRES NE SONT PAS AFFICHÉS D'APRÈS CE COMMENTAIRE : la phrase de l'accueil
 * les COMPTE sur la liste (voir NB_PORTES et NB_VERROU dans PageAccueil). Une porte
 * ajoutée ici met la phrase à jour toute seule ; seule cette note en prose peut vieillir.
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
 *   ouvertes    (public)  /donjons /astuces /prestige /builder /monstres /pnj /wiki
 *   vitrine     (vitrine) /boutique /crafts — visibles sans compte, inertes ou
 *                         amputées de ce qui se garde
 *   cadenas     (guild)   /objets /compositions /worldboss /dashboard
 *
 * ET LE CADENAS NE VEUT PAS DIRE « connecte-toi ». Trois de ces adresses — /dashboard,
 * /compositions, /worldboss — sont dans GUILD_PREFIXES du middleware, dont la liste de
 * rôles EXCLUT RECRUE : un joueur qui se connecte avec Discord sans être de la guilde est
 * renvoyé sur `/?error=guild`. La quatrième, /objets, n'y est PAS : elle est gardée un
 * cran plus bas, par le requireGuild() du layout de son groupe (voir ci-dessous). Deux
 * mécanismes, une même conséquence pour le visiteur.
 * Le mot du cadenas est donc « membres », et la phrase qui présente ces portes ne
 * doit promettre que ça.
 *
 * « 23 instances » était écrit à la main. C'est le seul des chiffres qui se
 * COMPTE — les autres sont des promesses, pas des mesures — et c'est justement
 * celui qui devient faux tout seul le jour où une instance rejoint le relevé. La
 * carte le lit désormais dans les mêmes données que la page où elle mène.
 *
 * DEUX PORTES ONT ÉTÉ AJOUTÉES, et elles répondent au reproche le plus net qu'on
 * pouvait faire à cet écran : le site est un WIKI — retrouver un monstre, un
 * objet, sa provenance, savoir qui le vend — et aucune porte ne le disait. Le
 * catalogue d'objets (/objets) et les marchands (/pnj) sont les deux
 * propriétaires de ce sujet. Leurs comptes arrivent en props, lus côté serveur
 * (voir accueil/chiffres.ts) : 12 134 objets et 293 marchands prouvent en un
 * chiffre ce qu'aucun adjectif ne prouve.
 *
 * /objets PORTE UN CADENAS, et c'est vérifié dans l'arborescence et non déduit du
 * menu : le fichier vit dans src/app/(guild)/, dont le layout appelle
 * requireGuild(). La nav l'annonce pourtant comme publique. C'est la seule des
 * douze portes du wiki qui se refuse à un visiteur, et le dire avant le clic vaut
 * mieux que de l'envoyer sur /login.
 *
 * LES DESCRIPTIONS ONT MAIGRI, toutes. Elles racontaient en douze mots ce qu'une
 * énumération de quatre dit mieux : un visiteur ne lit pas douze paragraphes de
 * porte, il balaie. Aucune destination n'a été perdue au passage.
 */
export const PORTES_PUBLIQUES: Porte[] = [
  {
    href: "/builder", icon: "shirt", titre: "AirBuilder",
    texte: "Perçage, sertissage, runes, sets, fée et familier.",
    chiffre: "sans connexion",
  },
  {
    href: "/donjons", icon: "skull", titre: "Les donjons",
    texte: "Niveau, élément, prestige exigé et butin.",
    chiffre: `${(dungeons as unknown[]).length} instances`,
  },
  {
    href: "/monstres", icon: "paw", titre: "Les monstres",
    texte: "PV, élément, et les boss à plusieurs vies.",
  },
  {
    /* Le catalogue et la PROVENANCE : « quel monstre lâche cet objet », « quelle
       recette le sort », « quel coffre le contient ». C'est le cœur du wiki, et
       c'était la seule pièce du site qui n'avait pas de porte ici. */
    href: "/objets", icon: "package", titre: "Le catalogue d'objets",
    texte: "Chaque objet, ses bonus, et d'où il vient.",
    verrou: true,
  },
  {
    href: "/pnj", icon: "users", titre: "Marchands et artisans",
    texte: "Qui vend quoi, et qui fabrique quoi.",
  },
  {
    /* ══════════════════════════════════════════════════════════════════════════
       LA PORTE DU WIKI MANQUAIT, et c'était la plus grosse absence de cet écran.
       ══════════════════════════════════════════════════════════════════════════
       Cette liste répond à « qu'est-ce que ce site sait faire ». Or ce que le site fait
       de plus utile — UN SEUL CHAMP pour tout Airborn, qui aiguille vers la page
       propriétaire de ce qu'on a tapé — n'y figurait pas. Un visiteur voyait onze portes
       thématiques et devait deviner laquelle contient « Âme de démon ». C'est exactement
       le défaut que /wiki existe pour corriger, et le site venait de le refaire sur sa
       propre page d'accueil.

       PUBLIQUE, vérifié dans l'arborescence et non déduit du menu : le fichier vit dans
       src/app/(public)/wiki/, aucun garde ne s'y applique, et la recherche se fait côté
       serveur par /api/wiki.

       PAS DE COMPTE SUR CETTE PORTE, et c'est un choix mesuré et non un oubli. Le total
       du wiki (14 000 noms) ne se lit que sur son index — six mégaoctets de relevés que
       `faitsWiki()` assemble à la demande. Le charger pour orner une porte ferait payer
       à CHAQUE visiteur de la page d'accueil le coût de la page suivante. La ligne dit
       donc ce qui se vérifie sans rien lire : qu'on entre sans compte. */
    href: "/wiki", icon: "search", titre: "Le wiki",
    texte: "Un seul champ : objets, monstres, recettes, PNJ, compétences.",
    chiffre: "sans connexion",
  },
  {
    href: "/prestige", icon: "star", titre: "Prestige",
    texte: "Ce que coûte chaque palier, et où tu en es.",
    chiffre: "P3 → P10",
  },
  {
    href: "/astuces", icon: "compass", titre: "Guide de progression",
    texte: "Par où commencer, et quoi viser ensuite.",
    chiffre: "palier par palier",
  },
  {
    /* La boutique est le seul écran du site en mode VITRINE : le middleware ne la
       protège pas et son layout n'a pas de garde, donc un visiteur voit le vrai
       stock et les vrais prix. Elle n'a donc pas de cadenas — ce serait faux — et
       son chiffre dit exactement ce qu'on peut en faire sans compte. Commander,
       lui, se heurte à /api/bank-request, gardée par apiGuild. */
    href: "/boutique", icon: "cart", titre: "La boutique",
    texte: "Le stock commun de la guilde, et ses prix.",
    chiffre: "à regarder sans compte",
  },
  {
    href: "/compositions", icon: "castle", titre: "Chambres Secrètes",
    texte: "Qui vient, à quel poste, salle par salle.",
    verrou: true,
  },
  {
    href: "/worldboss", icon: "dragon", titre: "World Boss",
    texte: "Les prochains passages, et qui s'est annoncé.",
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
    texte: "Recettes, arbre du farm, titres et succès.",
    chiffre: "à regarder sans compte",
  },
  {
    href: "/dashboard", icon: "home", titre: "L'accueil de la guilde",
    texte: "Ce qui t'attend, et tout ce qui est réservé.",
    verrou: true,
  },
];

/**
 * Poser les mesures du serveur sur les portes — SEULEMENT LÀ OÙ LA LIGNE EST VIDE.
 *
 * /boutique et /crafts emploient déjà la leur pour dire ce qu'on peut en faire
 * sans compte, et pour un visiteur ce renseignement vaut plus qu'un total.
 * Écraser leur ligne par un compte serait échanger une réponse contre un chiffre.
 */
export const avecComptes = (portes: Porte[], comptes: Record<string, string>): Porte[] =>
  portes.map((p) => (!p.chiffre && comptes[p.href] ? { ...p, chiffre: comptes[p.href] } : p));

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

      {/* ── POURQUOI CETTE CSS EST ÉCRITE COMME ÇA ──
          Ces notes vivaient DANS le littéral de gabarit ci-dessous, c'est-à-dire
          dans le `<style>` servi au navigateur : chaque visiteur téléchargeait le
          raisonnement du développeur avec la feuille de style. Sorties d'ici, elles
          sont effacées à la compilation et ne pèsent plus rien — et le piège de
          l'accent grave qui referme le gabarit disparaît avec elles.

          `--porte-min` à 400 px et pas 300 : à 300 la grille tenait TROIS colonnes
          dans les 976 px utiles de l'accueil, et la dernière porte se retrouvait
          seule sur une ligne, deux fois plus large que ses voisines. Une liste plus
          longue n'a pas ce problème et passe une valeur plus serrée.

          auto-FILL et non auto-FIT, mesuré : auto-fit EFFACE les colonnes vides,
          donc une grille d'UNE seule porte lui donnait toute la largeur — 1 036 px
          contre 337 px pour ses voisines, sur l'accueil de guilde où la porte
          « Tout le site » est seule dans sa grille. auto-fill garde les colonnes
          vides à leur taille. Aucune différence dès qu'une grille remplit ses
          colonnes, ce qui est le cas partout ailleurs.

          Le titre et son cadenas partagent une ligne de base et se replient
          ensemble : le cadenas colle au titre, pas au bord de la carte.

          Le chiffre est en Rubik et non en Alef, et à chasse fixe : Alef rend ses
          chiffres en bas de casse, et « P3 → P10 » se lisait en indices. Il ne doit
          pas non plus danser d'une carte à l'autre.

          Le cadenas du jeu fait 10x12, sa taille native dans le client :
          l'agrandir le rendrait flou, et image-rendering:pixelated ne sauve pas une
          icône de 10 px étirée.

          La flèche ne bouge qu'au survol du lien ENTIER : posée sur la flèche
          seule, elle fuyait le curseur qui la visait. */}
      <style>{`
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
        .acc-porte-tl{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
        .acc-porte-t{font-weight:600;font-size:15.5px}
        .acc-porte-d{display:block;color:var(--text-muted);font-size:13px;line-height:1.55;margin-top:3px}
        .acc-porte-c{display:block;margin-top:8px;font-family:'Rubik',sans-serif;font-variant-numeric:tabular-nums;
          font-size:11.5px;letter-spacing:.6px;text-transform:uppercase;color:var(--gold);opacity:.85}
        .acc-porte-v{display:inline-flex;align-items:center;gap:3px;font-size:10px;text-transform:uppercase;
          letter-spacing:.6px;color:var(--text-muted);font-family:'Alef',sans-serif;font-weight:400}
        .acc-porte-v img{width:10px;height:12px;object-fit:contain;image-rendering:pixelated;opacity:.85}
        .acc-porte-fl{flex-shrink:0;color:var(--text-muted);margin-top:12px;transition:transform .2s,color .2s}
        .acc-porte:hover .acc-porte-fl{transform:translateX(4px);color:var(--orange)}
      `}</style>
    </div>
  );
}
