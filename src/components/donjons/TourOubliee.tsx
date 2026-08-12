import React from "react";
import { Icon } from "@/components/Icon";
import { pvCourt, TOUR_OUBLIEE, PLANS } from "./donneesClient";
import { IconeElementDonjon } from "./elements";

/**
 * LA TOUR OUBLIÉE — cinq étages que le wiki ne connaissait pas.
 *
 * Elle n'est pas dans la grille des vingt-trois pour une raison de fond : ce
 * n'est pas une destination du téléporteur. Chaque étage est un MONDE À PART
 * ENTIÈRE (identifiants 21 à 25), et il n'y a aucun escalier entre eux — tous
 * les portails de sortie renvoient à Flarine. On entre par le PNJ « Gardien de
 * la Tour Oubliée », étage par étage. La ranger avec les donjons du téléporteur
 * aurait laissé croire qu'on y accède comme aux autres.
 *
 * À ne pas confondre avec la Tour Infernale, qui est la carte du mode
 * « Protection de l'Oasis » : deux contenus différents, deux cartes différentes.
 */
export function TourOubliee() {
  return (
    <div style={{ marginTop: 26 }}>
      {/* Un h2, comme le bloc Protection de l'Oasis juste en dessous : les deux
          sont les grandes parties de la page, sous le h1 du wiki. `fontWeight: 400`
          est explicite parce qu'un h2 arrive gras par defaut. */}
      <h2 className="font-heading" style={{ fontSize: 12.5, fontWeight: 400, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--orange)", margin: "4px 0 10px", display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        La Tour Oubliée
        <span style={{ fontSize: 12, letterSpacing: 0, textTransform: "none", color: "var(--text-muted)", fontWeight: 400 }}>
          {TOUR_OUBLIEE.length} étages, {TOUR_OUBLIEE.length} cartes séparées
        </span>
      </h2>

      <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 14, padding: 18, marginBottom: 12, fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.55 }}>
        Elle n&apos;est pas dans la grille au-dessus parce qu&apos;elle n&apos;est pas dans le téléporteur :
        tu entres par le <b style={{ color: "var(--text)" }}>Gardien de la Tour Oubliée</b>, à Flarine,
        et tu choisis ton étage. Chaque étage est une carte à part — <b style={{ color: "var(--text)" }}>aucun
        escalier ne les relie</b>, et toutes les sorties te renvoient à Flarine. Chaque étage ne contient
        qu&apos;<b style={{ color: "var(--text)" }}>une seule espèce</b>, répétée.
        {" "}Et les niveaux ne montent pas dans l&apos;ordre : le 5<sup>e</sup> est plus faible que le 3<sup>e</sup>,
        donc ne prends pas le numéro d&apos;étage pour une difficulté.
        <div style={{ marginTop: 8 }}>
          Rien à voir avec la <b style={{ color: "var(--text)" }}>Tour Infernale</b>, qui est la carte
          du mode <b style={{ color: "var(--text)" }}>Protection de l&apos;Oasis</b> : deux contenus
          distincts, deux cartes distinctes.
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 12 }}>
        {TOUR_OUBLIEE.map((e) => (
          <div key={e.monde} className="fx-card" style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 14, padding: 16 }}>
            {/* La carte de l'étage, en tête de fiche. Elle porte son propre titre
                imprimé (« Tour Oubliée B1 ») : on ne l'annonce donc pas une
                deuxième fois au-dessus, et son `alt` reste vide puisque le nom de
                l'étage est écrit juste en dessous en texte.
                `aspectRatio` plutôt qu'une hauteur fixe : les cinq cartes sont des
                4/3 du client, et une hauteur fixe les aurait déformées. */}
            {PLANS[e.carte] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={PLANS[e.carte].src}
                alt=""
                style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 10, border: "1px solid var(--border)", marginBottom: 12, display: "block" }}
              />
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <Icon name="tower" framed frameSize={36} tone="purple" />
              <div style={{ minWidth: 0 }}>
                <div className="font-heading" style={{ fontWeight: 600, fontSize: 15 }}>Étage {e.etage}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{e.nom}</div>
              </div>
            </div>
            <div style={{ fontSize: 12.5, marginBottom: 8 }}>
              <div style={{ color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.8 }}>Le boss de l&apos;étage</div>
              <div className="font-heading" style={{ fontWeight: 600 }}>{e.boss}</div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
              <span style={{ background: "var(--bg-3)", borderRadius: 5, padding: "2px 7px" }}>niv. {e.niv}</span>
              <span style={{ background: "var(--bg-3)", borderRadius: 5, padding: "2px 7px", color: "var(--orange)" }}>
                <Icon name="heart" size={11} style={{ marginRight: 3 }} />{pvCourt(e.pv)} PV
              </span>
              {/* LE PICTOGRAMME MAISON A CÉDÉ LA PLACE AU DESSIN DU JEU. Les cinq
                  éléments ont leur image dans le client (`/jeu/mecaniques/element-*`),
                  elle sert déjà sur /monstres et sur les tuiles de donjon : le même
                  élément a la même image partout, ce qui est tout l'intérêt. Le mot
                  reste à côté — c'est un étage unique, il y a la place, et l'image
                  seule demanderait de connaître le dessin par cœur. */}
              {e.elem && (
                <span style={{ background: "var(--bg-3)", borderRadius: 5, padding: "2px 7px", color: "var(--blue)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <IconeElementDonjon elem={e.elem} taille={12} />{e.elem}
                </span>
              )}
              {e.faible && (
                <span style={{ background: "var(--bg-3)", borderRadius: 5, padding: "2px 7px", color: "var(--green)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Icon name="target" size={11} />
                  <IconeElementDonjon elem={e.faible} taille={12} />
                  faible
                </span>
              )}
            </div>
            <div style={{ marginTop: 9, fontSize: 11.5, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
              {e.points} emplacements sur une carte de {e.unites[0]} × {e.unites[1]}
              {/* La coordonnée du portail de sortie était affichée ici — « (6 980,
                  3 309) ». Un joueur ne peut rien en faire : le jeu n'a pas de
                  boussole à coordonnées, et on ne se rend pas à un couple de
                  nombres. Ce qui sert, c'est la DESTINATION, et elle est la même
                  pour les cinq étages. */}
              {e.sortie && <> · la sortie te renvoie à Flarine</>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
