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
  /**
   * L'icône, sous l'une des deux formes qui circulent sur ce site :
   *  · un simple nom de FICHIER (« itm_ring01.webp ») — c'est ce que renvoient
   *    /api/pnj et les relevés du client, tous rangés sous /jeu/icones/ ;
   *  · un CHEMIN COMPLET commençant par « / » — c'est ce que porte
   *    src/data/icones-objets.json, dont les images vivent sous /assets/items/
   *    et /airbuilder/icons/. Sans ce cas, préfixer aveuglément par /jeu/icones/
   *    fabriquait une adresse inexistante et l'image se cassait.
   */
  icone?: string | null;
  couleur?: string;
  taille?: number;
}) {
  const src = icone ? (icone.startsWith("/") ? icone : `/jeu/icones/${icone}`) : null;
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
          {/* LE TROISIÈME LIEN, ET IL MANQUAIT. Demande de Maxime : « pour passer une
              requête il faut plus de liens logiques ». La bulle savait dire CE QUE c'est
              et D'OÙ ça vient ; elle ne savait pas dire « je le veux ». Or c'est la
              question suivante, et il fallait revenir au menu, ouvrir la boutique, et
              retaper le nom.

              On dépose le nom là où la boutique le lit déjà — `vg_demande_pieces`, le
              même dépôt que l'AirBuilder emploie pour « Demander cet objet ». Le nom
              seul suffit : la boutique le met dans sa recherche, et si l'objet n'est pas
              une pièce équipable (une poudre, un matériau, une clé), elle le DIT au lieu
              de l'abandonner en silence — c'était un défaut, il est corrigé dans le même
              mouvement.

              `<a>` et non `<Link>` : il faut écrire dans le localStorage AVANT de
              naviguer, et la navigation douce de Next ne garantit pas l'ordre. */}
          <a
            href="/boutique"
            onClick={(e) => {
              try {
                const pile = [{ nom }];
                localStorage.setItem("vg_demande_pieces", JSON.stringify(pile));
              } catch {
                // Stockage refusé (navigation privée, réglage du navigateur) : on laisse
                // le lien mener à la boutique, où la recherche reste à portée de main.
                void e;
              }
            }}
            style={{ color: "var(--gold)", fontWeight: 700, textDecoration: "none", fontSize: 12.5 }}
          >
            Le demander à la guilde →
          </a>
        </span>
      }
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" width={taille} height={taille}
          style={{ objectFit: "contain", imageRendering: "pixelated", flexShrink: 0 }} />
      ) : null}
      <span style={{ color: couleur ?? "inherit" }}>{nom}</span>
    </Bulle>
  );
}
