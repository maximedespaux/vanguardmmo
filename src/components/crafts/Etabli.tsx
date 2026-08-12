"use client";
import { useState } from "react";
import { Icon, type IconName } from "@/components/Icon";
import { EnteteVolet, VoletSections } from "@/components/VoletSections";
import { useCardFx } from "@/components/VgFx";
import { useSectionsCollections } from "@/components/collections/Collections";
import { nb } from "@/components/collections/donnees";
import { cssCrafts, useSectionsCrafts } from "./Atelier";

/**
 * CE QU'ON DÉCROCHE À LA LONGUE — un seul écran pour ce qu'on fabrique et ce
 * qu'on collectionne.
 *
 * C'ÉTAIENT DEUX PAGES. /crafts disait comment fabriquer, /collections ce qu'on
 * décroche à force de jouer. Deux adresses, deux rails, deux en-têtes — pour une
 * seule question : « qu'est-ce que je peux viser, et qu'est-ce que ça demande ».
 * On les a réunies, et /collections redirige ici.
 *
 * POURQUOI DEUX FAMILLES ET PAS DOUZE LIGNES. Bout à bout, les deux pages font
 * douze volets. Douze entrées plates dans un rail, ce n'est plus une table des
 * matières : c'est une liste qu'il faut relire à chaque fois. On les regroupe
 * donc en deux familles — « Les crafts » et « Collections », les deux titres
 * d'origine — et le rail ne montre que les six volets de la famille ouverte.
 * Rien n'est perdu : les douze volets sont là, à un clic, et chacun porte
 * toujours son compte.
 *
 * LES DEUX RELEVÉS NE SE CHARGENT PAS ENSEMBLE. Les crafts passent par
 * /api/crafts (gardée par apiGuild), les collections par un fichier de 43 Ko.
 * Celui qui vient chercher une recette ne télécharge donc pas les collections —
 * le survol du bouton suffit à lancer la lecture, si bien qu'au clic le panneau
 * est déjà rempli.
 */

type Famille = "crafts" | "collections";

/** Les deux familles, avec ce qu'elles contiennent — annoncé, pas à deviner. */
const FAMILLES: { cle: Famille; label: string; sous: string; icon: IconName }[] = [
  { cle: "crafts", label: "Les crafts", sous: "recettes, arbre du farm, comptoirs, ateliers", icon: "hammer" },
  { cle: "collections", label: "Collections", sous: "titres, succès, anges, maîtrise, cartes, karma", icon: "trophy" },
];

export function Etabli() {
  // Une seule fois pour la page entière : le halo des cartes écoute le document,
  // deux crochets poseraient deux écouteurs pour le même effet.
  useCardFx();

  const [famille, setFamille] = useState<Famille>("crafts");
  // Le survol vaut demande : on ne fait pas attendre le clic pour lire 43 Ko.
  const [prevoit, setPrevoit] = useState(false);

  const cr = useSectionsCrafts();
  const co = useSectionsCollections(prevoit || famille === "collections");

  const sections = famille === "crafts" ? cr.sections : co.sections;
  const releve = famille === "crafts" ? cr.d?.genere : co.d?.genere;

  return (
    <>
      <EnteteVolet
        icon={famille === "crafts" ? "hammer" : "trophy"}
        titre="Ce qu’on décroche à la longue"
        marque={releve ? { texte: `relevé du ${new Date(releve).toLocaleDateString("fr-FR")}`, couleur: "var(--blue)" } : undefined}
        sous={famille === "crafts" ? (
          cr.d ? (
            <>
              {nb(cr.d.total)} échanges de PNJ — <b style={{ color: "var(--green)" }}>{nb(cr.d.actives)} jouables</b>,{" "}
              <b style={{ color: "var(--red)" }}>{nb(cr.d.eteintes)} éteintes</b>,{" "}
              <b style={{ color: "var(--gold)" }}>{nb(cr.d.orphelines)} sans PNJ</b> — chez {cr.d.pnjDistincts} PNJ nommés.
              Plus {cr.d.arbres.length} arbres de craft maison et {cr.d.ateliers.length} fenêtres de transformation.
            </>
          ) : cr.erreur ? "Le relevé des crafts n’a pas pu être chargé." : "Lecture du relevé du client…"
        ) : (
          co.d ? (
            <>
              {nb(co.d.titres.length)} titres, {nb(co.d.nbSucces)} succès, {co.d.anges.length} anges,{" "}
              {co.d.maitrise.armes.length} maîtrises d’arme, {co.d.decks.length} carnets de cartes et {co.d.karma.length} grades
              de karma. Le chiffre qui remet les idées en place :{" "}
              <b style={{ color: "var(--gold)" }}>{nb(co.d.anges.find((a) => a.montable)?.cumul ?? 0)} poudres féeriques</b> pour
              monter un seul ange au bout.
            </>
          ) : co.erreur ? "Le relevé du client n’a pas pu être chargé." : "Chargement du relevé du client…"
        )}
        action={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} role="tablist" aria-label="Ce que tu cherches">
            {FAMILLES.map((f) => {
              const on = f.cle === famille;
              const combien = (f.cle === "crafts" ? cr.sections : co.sections).length;
              return (
                <button key={f.cle} type="button" role="tab" aria-selected={on}
                  onClick={() => setFamille(f.cle)}
                  // Le survol et le passage au clavier lancent la lecture du
                  // relevé des collections avant le clic.
                  onPointerEnter={() => setPrevoit(true)}
                  onFocus={() => setPrevoit(true)}
                  className="fx-card"
                  // Même forme que les entrées du rail juste en dessous : tuile
                  // d'icone, titre, pastille de compte, ligne de contenu.
                  style={{
                    display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontFamily: "inherit",
                    textAlign: "left", padding: "9px 12px", borderRadius: 12,
                    background: on ? "rgba(255,140,26,.09)" : "var(--bg-2)",
                    border: `1px solid ${on ? "var(--orange)" : "var(--border)"}`,
                  }}>
                  <span style={{
                    width: 28, height: 28, borderRadius: 9, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                    background: on ? "var(--orange)" : "var(--bg-3)", border: `1px solid ${on ? "var(--orange)" : "var(--border)"}`,
                    color: on ? "#0A0A0C" : "var(--orange)",
                  }}>
                    <Icon name={f.icon} size={15} />
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span className="font-heading" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: on ? "var(--orange)" : "var(--text)" }}>
                      {f.label}
                      <span style={{
                        fontSize: 10.5, fontWeight: 700, padding: "1px 7px", borderRadius: 20,
                        background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--gold)",
                      }}>{combien}</span>
                    </span>
                    <span style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{f.sous}</span>
                  </span>
                </button>
              );
            })}
          </div>
        }
      />

      {/* Keyé par la famille : c'est le déroulé maison des changements d'onglet
          (.vg-swap), et le rail repart sur le premier volet de la famille qu'on
          vient d'ouvrir au lieu de garder l'ouverture de l'autre. */}
      <div key={famille} className="vg-swap">
        {/* `key={cr.saut}` : cliquer le nom d'un PNJ doit ROUVRIR la recherche.
            VoletSections garde sa section ouverte dans son propre état, on la
            remonte donc avec une clef neuve. */}
        <VoletSections key={cr.saut} sections={sections} defaut={cr.saut ? "recherche" : undefined} />
      </div>

      <style>{cssCrafts}</style>
    </>
  );
}
