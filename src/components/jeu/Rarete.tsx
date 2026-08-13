/**
 * LE SYSTÈME DE RARETÉ DU JEU — cadres de carte, cadres d'icône, cadenas, sertissage.
 *
 * Pourquoi cette brique existe. Le site disait la rareté d'un objet avec une pastille
 * de texte et une couleur choisie par nous. Or le jeu a déjà son vocabulaire visuel
 * pour ça, et il dormait dans public/jeu/rarete/ : dix-huit images dont seules DEUX
 * étaient branchées. Un cadre doré du jeu dit « légendaire » à un joueur mieux qu'un
 * mot écrit en doré par nous.
 *
 * ┌──────────────── LE PIÈGE, ET IL EST GRAVE ────────────────┐
 * │ AUCUNE de ces images n'est carrée, sauf les deux cadres de │
 * │ grade. Mesuré fichier par fichier dans le navigateur :     │
 * │                                                            │
 * │   bordure_<rareté>        110 × 250   ratio 0,44           │
 * │   bordure_<rareté>_nocard 110 × 250   ratio 0,44           │
 * │   cadenas_<rareté>         32 ×  51   ratio 0,63           │
 * │   emplacement_<rareté>     14 ×  24   ratio 0,58           │
 * │   item_edgeunique/ultimate 32 ×  32   ratio 1,00           │
 * │                                                            │
 * │ Une première version de ce fichier posait les `bordure_*`   │
 * │ dans un carré de 46 px, en croyant à des cadres d'icône.    │
 * │ Ce sont des cadres de CARTE verticale : les étirer en carré │
 * │ écrase leurs coins ornés. C'est le même piège que le        │
 * │ recadrage du Château de Draken, et il ne se voit qu'à       │
 * │ l'écran — aucun test ne le signale.                         │
 * │ Chaque composant ci-dessous impose donc son `aspectRatio`.  │
 * └────────────────────────────────────────────────────────────┘
 *
 * DEUX ÉCHELLES QUI NE SE PROLONGENT PAS. Les quatre raretés (commun, rare, épique,
 * légendaire) ont des cadres de carte. Les deux GRADES — unique et ultime — ont des
 * cadres d'icône carrés, et une couleur qui leur est propre : unique est VERT, ultime
 * est ORANGE. Ce n'est pas la suite de l'échelle des raretés, c'est un autre axe. Les
 * confondre afficherait un objet « ultime » comme s'il était un cran au-dessus de
 * « légendaire », ce que les fichiers ne disent pas.
 *
 * LES VARIANTES `_nocard` sont à connaître avant de s'en servir : elles pèsent 172 à
 * 198 octets contre 1 832 à 1 858 pour les normales, et à l'écran ce sont des cadres
 * NUS ET INCOLORES — la rareté ne s'y lit plus. Elles conviennent à un objet qui
 * n'accepte pas de carte de perçage, à condition d'écrire la rareté à côté ; sinon on
 * garde la version colorée.
 */
import React from "react";

/**
 * Les quatre raretés QUI ONT DES IMAGES, dans l'ordre où le jeu les classe.
 *
 * ┌──── QUATRE ICI, SIX DANS LE CALCUL — ET CE N'EST PAS UN OUBLI ────┐
 * │ `src/lib/statistiques/moteur.ts` déclare SIX niveaux : NONE, RARE, │
 * │ EPIC, LEGENDARY, PREMYTHIC, MYTHIC. Ils viennent d'`AddRarityStat` │
 * │ dans les scripts du client et servent au calcul de la maîtrise     │
 * │ d'arme, où chaque niveau porte sa propre valeur.                    │
 * │                                                                     │
 * │ CE FICHIER-CI PARLE D'IMAGES, et le client n'en a extrait que pour  │
 * │ quatre. Vérifié en HTTP, pas supposé :                              │
 * │   bordure_premythic.webp → 404   bordure_mythic.webp → 404          │
 * │ Ajouter ces deux noms ici fabriquerait des images cassées. Les deux │
 * │ échelles sont donc distinctes exprès : le MOTEUR compte sur six     │
 * │ niveaux, l'ÉCRAN n'en encadre que quatre.                            │
 * └─────────────────────────────────────────────────────────────────────┘
 */
export const RARETES = ["common", "rare", "epic", "legendary"] as const;
export type Rarete = (typeof RARETES)[number];

/** Les deux grades, autre axe que la rareté. */
export const GRADES = ["unique", "ultimate"] as const;
export type Grade = (typeof GRADES)[number];

export const RARETE_FR: Record<Rarete, string> = {
  common: "Commun", rare: "Rare", epic: "Épique", legendary: "Légendaire",
};
export const GRADE_FR: Record<Grade, string> = { unique: "Unique", ultimate: "Ultime" };

/**
 * Les couleurs sont RELEVÉES SUR LES IMAGES, pas choisies : blanc cassé pour le
 * commun, bleu pour le rare, rose pour l'épique, or pour le légendaire — et pour les
 * grades, vert pour l'unique, OR pour l'ultime. Le texte et l'image doivent
 * s'accorder, sinon un objet aurait un cadre doré et un mot bleu.
 *
 * L'ULTIME ÉTAIT ÉCRIT `--orange` ICI, et `--gold` dans `objets/vocabulaire.ts` : le
 * même objet n'avait donc pas la même couleur selon la brique qui l'affichait. Ce
 * fichier est celui qui avait dérivé. L'échantillonnage de `item_edgeultimate.webp`
 * donne 255,255,0 puis 230,156,0 — du jaune vers l'ambre, aucun orange ; les valeurs
 * sont recopiées dans le commentaire de `COULEUR_GRADE`. Rien ne bouge à l'écran
 * aujourd'hui : `Etiquette`, seule à lire cette table, n'est encore importée nulle
 * part. C'est justement le moment de l'accorder, avant qu'un écran s'en serve.
 */
export const RARETE_TON: Record<Rarete, string> = {
  common: "#D8D8E0", rare: "var(--blue)", epic: "#FF4FA3", legendary: "var(--gold)",
};
export const GRADE_TON: Record<Grade, string> = { unique: "var(--green)", ultimate: "var(--gold)" };

const RATIO_CARTE = 110 / 250;
const RATIO_CADENAS = 32 / 51;
const RATIO_EMPLACEMENT = 14 / 24;

export const bordure = (r: Rarete, sansCarte = false) =>
  `/jeu/rarete/bordure_${r}${sansCarte ? "_nocard" : ""}.webp`;
export const cadenas = (r: Rarete) => `/jeu/rarete/cadenas_${r}.webp`;
export const cadreGrade = (g: Grade) => `/jeu/rarete/item_edge${g}.webp`;

/**
 * LES LOSANGES D'EMPLACEMENT N'EXISTENT QUE POUR TROIS RARETÉS SUR QUATRE.
 *
 * Le dossier porte `emplacement_empty`, `_rare`, `_epic`, `_legendary` — et PAS
 * `_common`. Vérifié en HTTP : `emplacement_common.webp` rend 404.
 *
 * Le type autorisait pourtant `"common"`, donc la fonction fabriquait sereinement une
 * adresse morte. Les deux appelants en service l'évitent à la main (un commentaire de
 * `mecaniques/SectionsObjets.tsx` le dit même), mais un troisième appelant tomberait
 * dedans sans rien pour l'avertir : ni tsc ni aucun test ne voit une image manquante.
 *
 * `null` répond `empty`, qui existe. Une rareté SANS image répond `null` : c'est à
 * l'affichage de dessiner autre chose, et `Emplacements` s'en charge en CSS. Rendre
 * `emplacement_empty` pour une gemme commune aurait été pire qu'une image cassée —
 * ça dessinerait un logement VIDE là où il y a une gemme.
 */
const AVEC_LOSANGE: readonly Rarete[] = ["rare", "epic", "legendary"];
export const emplacement = (r: Rarete | null): string | null => {
  if (r === null) return "/jeu/rarete/emplacement_empty.webp";
  return AVEC_LOSANGE.includes(r) ? `/jeu/rarete/emplacement_${r}.webp` : null;
};

/**
 * LA CARTE D'OBJET, dans le cadre du jeu. C'est l'usage pour lequel les `bordure_*`
 * sont dessinées : un format vertical, l'icône en haut, le nom dessous.
 *
 * `largeur` en pixels ; la hauteur suit le ratio 110/250 du fichier et n'est pas
 * réglable — c'est ce qui protège les coins ornés.
 */
export function CarteObjet({ icone, rarete, nom, sous, largeur = 110, sansCarte = false, verrouille = false }: {
  icone?: string | null;
  rarete: Rarete;
  nom?: string;
  /** Une ligne sous le nom : le niveau, le type, ce qu'on veut. */
  sous?: React.ReactNode;
  largeur?: number;
  sansCarte?: boolean;
  verrouille?: boolean;
}) {
  return (
    <span style={{
      position: "relative", display: "inline-block", width: largeur, aspectRatio: `${RATIO_CARTE}`,
      backgroundImage: `url(${bordure(rarete, sansCarte)})`,
      backgroundSize: "100% 100%", backgroundRepeat: "no-repeat", flexShrink: 0,
    }}>
      {/* Le liseré mesure 2 px sur 110 de large, soit 1,8 % : l'intérieur occupe donc
          95,5 % du cadre. On garde 8 % de marge plutôt que 1,8 % — le liseré est fin,
          mais les coins portent un ornement qui monte plus haut, et une icône collée
          au bord mordrait dessus. */
      }
      <span style={{ position: "absolute", inset: "8%", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        {icone && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={icone} alt="" style={{ width: "78%", aspectRatio: "1", objectFit: "contain", marginTop: "4%" }} />
        )}
        {nom && (
          <span className="font-heading" style={{
            fontSize: 10.5, fontWeight: 700, lineHeight: 1.2, textAlign: "center",
            color: RARETE_TON[rarete], overflow: "hidden", display: "-webkit-box",
            WebkitLineClamp: 3, WebkitBoxOrient: "vertical",
          }}>{nom}</span>
        )}
        {sous && <span style={{ fontSize: 9.5, color: "var(--text-muted)", textAlign: "center" }}>{sous}</span>}
      </span>
      {verrouille && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cadenas(rarete)} alt="Verrouillé" title="Verrouillé"
          style={{ position: "absolute", right: 3, top: 3, height: "16%", aspectRatio: `${RATIO_CADENAS}`, objectFit: "contain", filter: "drop-shadow(0 1px 2px rgba(0,0,0,.85))" }} />
      )}
    </span>
  );
}

/**
 * L'ICÔNE D'UN OBJET DE GRADE — unique ou ultime. Ce sont les seuls cadres CARRÉS du
 * lot (32×32), et les seuls qui conviennent à une icône dans une liste.
 */
export function IconeGrade({ icone, grade, taille = 40, titre }: {
  icone?: string | null; grade: Grade; taille?: number; titre?: string;
}) {
  return (
    <span title={titre ?? GRADE_FR[grade]} style={{
      position: "relative", display: "inline-block", width: taille, height: taille, flexShrink: 0,
      backgroundImage: `url(${cadreGrade(grade)})`, backgroundSize: "100% 100%", backgroundRepeat: "no-repeat",
    }}>
      {icone && (
        // eslint-disable-next-line @next/next/no-img-element
        /* Le liseré de ces cadres mesure 2 px sur 32, mais il porte une lueur : 6,3 %
           d'inset mesurés, on en garde 12 % pour que la lueur reste visible autour de
           l'icône — c'est elle qui signale le grade. */
        <img src={icone} alt="" style={{ position: "absolute", inset: "12%", width: "76%", height: "76%", objectFit: "contain" }} />
      )}
    </span>
  );
}

/**
 * LA RANGÉE D'EMPLACEMENTS DE GEMME. Le jeu dessine un losange par logement : gris
 * s'il est vide, coloré s'il porte une gemme de cette rareté.
 *
 * C'est la façon de montrer ce que la page des mécaniques affirme : une arme Artefact
 * +20 accepte HUIT emplacements, pas cinq. Cinq losanges contre huit se comptent d'un
 * coup d'œil, là où « 5 » et « 8 » dans une phrase se lisent comme équivalents.
 */
export function Emplacements({ gemmes, total, hauteur = 22 }: {
  /** Une entrée par logement OCCUPÉ, dans l'ordre ; sa rareté donne la couleur. */
  gemmes: Rarete[];
  /** Nombre total de logements, occupés ou non. */
  total: number;
  hauteur?: number;
}) {
  // Un total plus petit que le nombre de gemmes est une donnée incohérente : on montre
  // alors tout ce qu'on a plutôt que de couper une gemme en silence.
  const cases = Math.max(total, gemmes.length);
  return (
    <span style={{ display: "inline-flex", gap: 3, alignItems: "center" }}>
      {Array.from({ length: cases }, (_, i) => {
        const r = gemmes[i] ?? null;
        const img = emplacement(r);
        /* PAS D'IMAGE POUR CETTE RARETÉ (le commun n'en a pas) : on dessine le losange
           en CSS, dans le ton relevé sur les images des autres. Un carré tourné de 45°
           et non un caractère « ◆ » : la taille d'un glyphe dépend de la police du
           navigateur, et il fallait qu'il s'aligne au pixel avec les losanges voisins,
           qui sont des images de 14 × 24. */
        if (!img) {
          return (
            <span key={i} aria-hidden="true" style={{
              height: hauteur, aspectRatio: `${RATIO_EMPLACEMENT}`, flexShrink: 0,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{
                width: hauteur * 0.52, height: hauteur * 0.52, transform: "rotate(45deg)",
                background: `color-mix(in srgb, ${RARETE_TON[r as Rarete]} 62%, transparent)`,
                border: `1px solid ${RARETE_TON[r as Rarete]}`, borderRadius: 2,
              }} />
            </span>
          );
        }
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={img} alt="" aria-hidden="true"
            style={{ height: hauteur, aspectRatio: `${RATIO_EMPLACEMENT}`, objectFit: "contain" }} />
        );
      })}
      {/* Le compte en texte accompagne les losanges : ils se comptent d'un coup d'œil
          jusqu'à cinq ou six, plus difficilement à huit — et un lecteur d'écran ne voit
          que ce texte, les images étant décoratives. */}
      <span style={{ fontSize: 11, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums", marginLeft: 3 }}>
        {gemmes.length}/{cases}
      </span>
    </span>
  );
}

/**
 * L'ÉTIQUETTE, quand on veut le mot et pas le cadre — dans un tableau, une liste
 * dense, un filtre. Elle reprend la couleur relevée sur les images, pour qu'un objet
 * encadré en or et son étiquette écrite en or soient bien la même chose.
 */
export function Etiquette({ rarete, grade }: { rarete?: Rarete; grade?: Grade }) {
  const ton = grade ? GRADE_TON[grade] : rarete ? RARETE_TON[rarete] : "var(--text-muted)";
  const mot = grade ? GRADE_FR[grade] : rarete ? RARETE_FR[rarete] : "—";
  return (
    <span style={{
      fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: .6,
      color: ton, borderRadius: 20, padding: "2px 9px", whiteSpace: "nowrap",
      background: `color-mix(in srgb, ${ton} 12%, transparent)`,
      border: `1px solid color-mix(in srgb, ${ton} 40%, transparent)`,
    }}>{mot}</span>
  );
}
