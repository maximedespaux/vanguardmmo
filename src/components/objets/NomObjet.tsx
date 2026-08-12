"use client";
import Link from "next/link";
import { Bulle } from "@/components/Bulle";
import { OuTrouver } from "@/components/OuTrouver";

/**
 * UN NOM D'OBJET QUI MÈNE QUELQUE PART.
 *
 * Demande de Maxime : « il faut aussi que ça redirige les objets ou les drops ».
 * `OuTrouver` savait répondre à « d'où vient ce truc ? » mais n'était branché que sur
 * la fiche du catalogue : partout ailleurs — l'étal d'un marchand, la sortie d'une
 * recette — un nom d'objet restait un cul-de-sac.
 *
 * ┌──────────── POURQUOI UNE BULLE ET PAS UN BLOC ────────────┐
 * │ Un étal de PNJ affiche jusqu'à 24 lignes. Poser `OuTrouver`│
 * │ sous chacune, c'est 24 requêtes au chargement et une page  │
 * │ trois fois plus longue. Dans une bulle, le contenu n'est   │
 * │ monté qu'à l'ouverture : la requête part au survol, une    │
 * │ seule à la fois, et la liste reste une liste.              │
 * └───────────────────────────────────────────────────────────┘
 *
 * Deux choses dans la bulle, dans cet ordre : le LIEN vers la fiche du catalogue —
 * qui marche toujours — puis la provenance, qui n'apparaît que si le client la
 * connaît. Rien ne s'affiche pour dire qu'elle est inconnue.
 */
export function NomObjet({ nom, icone, couleur, taille = 20 }: {
  nom: string;
  /** Fichier d'icône du client, sans le dossier. */
  icone?: string | null;
  couleur?: string;
  taille?: number;
}) {
  return (
    <Bulle
      largeur={300}
      quoi={
        <span style={{ display: "grid", gap: 8 }}>
          <Link href={`/objets?q=${encodeURIComponent(nom)}`}
            style={{ color: "var(--orange)", fontWeight: 700, textDecoration: "none", fontSize: 12.5 }}>
            {nom} → sa fiche
          </Link>
          <OuTrouver nom={nom} compact />
        </span>
      }
    >
      {icone ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/jeu/icones/${icone}`} alt="" width={taille} height={taille}
          style={{ objectFit: "contain", imageRendering: "pixelated", flexShrink: 0 }} />
      ) : null}
      <span style={{ color: couleur ?? "inherit" }}>{nom}</span>
    </Bulle>
  );
}
