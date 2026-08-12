"use client";
import { Icon } from "@/components/Icon";

/**
 * OÙ LE TROUVER — la carte du jeu, à la place d'un nom de ville.
 *
 * La fiche d'un PNJ disait « Flarine » dans une pastille. Pour qui connaît le
 * serveur, c'est assez ; pour qui débarque, c'est un mot. Le client porte la
 * carte de chacune de ces onze régions, et personne ne les affichait — onze
 * fichiers de public/jeu/cartes-monde/ qui dormaient.
 *
 * ┌──────── LES NOMS DE FICHIERS MENTENT, LE CARTOUCHE NON ────────┐
 * │ Chaque carte du client porte son nom IMPRIMÉ en bas. C'est la   │
 * │ seule preuve de correspondance, et il fallait la lire : le      │
 * │ fichier `town_oasis.webp` affiche « Tour Oubliée B5 », pas      │
 * │ l'Oasis. Les onze cartes ci-dessous ont été ouvertes une par    │
 * │ une et leur cartouche relevé — il est recopié dans la table,    │
 * │ à côté du nom de la ville, pour que la vérification se refasse  │
 * │ sans rouvrir les images.                                        │
 * │                                                                 │
 * │ Deux régions ont DEUX cartes dans le client, et on a gardé      │
 * │ celle dont les libellés sont en FRANÇAIS : `world_flaris` et    │
 * │ non `flaris` (« The north of Leron Mountains »), `world_saint`  │
 * │ et non `saint_morning`, `world_ricis` (« Jardin de Rhisis »)    │
 * │ et non `garden_of_rhisis`. Même raison pour Harmonin :          │
 * │ `world_harmonin` nomme le Canyon d'Ishtar et les deux Fosses    │
 * │ aux Esprits en français, là où `world_estia` les nomme en       │
 * │ ALLEMAND (« Knochengrube ») — ces cartes ne sont pas toutes     │
 * │ localisées.                                                     │
 * └────────────────────────────────────────────────────────────────┘
 *
 * Une ville absente de la table n'affiche RIEN. C'est le cas quand le client
 * place un PNJ sur une carte dont on n'a pas ouvert le fond ; une carte au
 * hasard serait pire que pas de carte — on croirait le lieu.
 */

type Entree = { fichier: string; cartouche: string; genre: "ville" | "region" };

/**
 * Les onze régions où le client place un PNJ, et la carte qui porte leur nom.
 *
 * `genre` n'est pas décoratif : un PLAN DE VILLE porte les pictogrammes des
 * marchands, on y repère l'étal ; une carte de RÉGION montre un continent, on y
 * repère le quartier. La légende ne promet donc pas la même chose.
 */
const CARTES: Record<string, Entree> = {
  Flarine: { fichier: "town_flarine", cartouche: "Flarine", genre: "ville" },
  Elliun: { fichier: "town_elliun", cartouche: "Village Elliun", genre: "ville" },
  Saincity: { fichier: "town_saincity", cartouche: "Saincity", genre: "ville" },
  Darkon: { fichier: "town_darken", cartouche: "Darkon", genre: "ville" },
  "Darkon 1, 2": { fichier: "world_darkon12", cartouche: "Darkon 1,2", genre: "region" },
  "Darkon 3": { fichier: "world_darkon3", cartouche: "Darkon 3", genre: "region" },
  Flaris: { fichier: "world_flaris", cartouche: "Flaris", genre: "region" },
  "Saint Morning": { fichier: "world_saint", cartouche: "Saint Morning", genre: "region" },
  Harmonin: { fichier: "world_harmonin", cartouche: "Harmonin", genre: "region" },
  "Désert Arhak'is": { fichier: "world_bahara", cartouche: "Désert Arhak'is", genre: "region" },
  "Jardin de Rhisis": { fichier: "world_ricis", cartouche: "Jardin de Rhisis", genre: "region" },
};

/** Y a-t-il une carte pour cette ville ? À demander avant de réserver la place. */
export const aUneCarte = (ville?: string | null) => Boolean(ville && CARTES[ville]);

export function CarteVille({ ville, largeur = 320 }: { ville?: string | null; largeur?: number }) {
  const e = ville ? CARTES[ville] : undefined;
  if (!e) return null;
  return (
    <figure style={{ margin: 0, flex: `0 1 ${largeur}px`, minWidth: 0 }}>
      <img
        // eslint-disable-next-line @next/next/no-img-element
        src={`/jeu/cartes-monde/${e.fichier}.webp`}
        alt={
          e.genre === "ville"
            ? `Le plan de ${ville} tel qu'il sort du client, avec les pictogrammes des marchands`
            : `La carte de ${ville} telle qu'elle sort du client`
        }
        loading="lazy"
        style={{ width: "100%", display: "block", borderRadius: 10, border: "1px solid var(--border)" }}
      />
      <figcaption style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 5, display: "flex", alignItems: "center", gap: 5 }}>
        <Icon name="map-pin" size={11} style={{ color: "var(--orange)", flexShrink: 0 }} />
        {e.genre === "ville"
          ? "Le plan du client — les pictogrammes sont ses marchands"
          : "La carte de la région, telle qu'elle sort du client"}
      </figcaption>
    </figure>
  );
}

/** Le compte des régions cartographiées, pour l'en-tête : il se lit dans la
 *  table, il ne s'écrit pas. */
export const REGIONS_CARTOGRAPHIEES = Object.keys(CARTES).length;
