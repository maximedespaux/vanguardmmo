"use client";
import React, { useState } from "react";
import { Icon, type IconName } from "@/components/Icon";
import { pvCourt, PLANS, SECOND_NOM, TON_RANG, type DonjonClient } from "./donneesClient";
import { IconeElementDonjon } from "./elements";
import { LienMonstre } from "./LienMonstre";

/** L'étiquette de section de la fiche. Reprise telle quelle du bloc « Drops »
 *  qui existait déjà : une fiche où chaque titre a sa propre graisse se lit comme
 *  un patchwork. */
export function SousTitre({ icon, children, apres }: { icon: IconName; children: React.ReactNode; apres?: React.ReactNode }) {
  return (
    <div style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, display: "flex", alignItems: "baseline", gap: 7, flexWrap: "wrap" }}>
      <span><Icon name={icon} size={12} style={{ marginRight: 5 }} />{children}</span>
      {apres && <span style={{ textTransform: "none", letterSpacing: 0, fontSize: 12 }}>{apres}</span>}
    </div>
  );
}

const ligne: React.CSSProperties = { display: "flex", gap: 10, justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: 12.5 };
const cle: React.CSSProperties = { color: "var(--text-muted)", flexShrink: 0 };
const val: React.CSSProperties = { textAlign: "right", fontVariantNumeric: "tabular-nums" };

/**
 * OÙ ÇA SE TROUVE, ET SUR QUELLE CARTE.
 *
 * Le nom interne n'est affiché que quand il diffère du nom du site, et il diffère
 * souvent : « Behemoth » est en réalité le Temple de Zerkattak, « Clairière de la
 * fée » tourne sur la carte de l'Ophidian, « Sanctuaire Shogun » sur la carte
 * japonaise. Le taire ferait perdre l'information ; l'afficher partout ajouterait
 * une ligne redondante sur les dix-sept donjons où les deux noms coïncident.
 */
export function Situation({ d, nomAffiche }: { d: DonjonClient; nomAffiche: string }) {
  // Sans accents ni majuscules : le client écrit « Chateau de Draken » là où le
  // site écrit « Château de Draken ». Comparer brut aurait affiché une ligne
  // « nom de la carte » identique au titre juste au-dessus.
  const sansAccent = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const memeNom = sansAccent(d.interne) === sansAccent(nomAffiche);
  return (
    <div style={{ marginBottom: 14 }}>
      <SousTitre icon="map-pin">Où c&apos;est, et ce que tu y trouves</SousTitre>
      <div style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 12px 8px" }}>
        {!memeNom && (
          <div style={ligne}>
            <span style={cle}>Nom de la carte dans le jeu</span>
            <span style={{ ...val, color: "var(--gold)" }}>{d.interne}</span>
          </div>
        )}
        {/* CES DEUX LIGNES AFFICHAIENT DES COORDONNÉES BRUTES : « Entrée depuis
            Madrigal · 3 275, 4 242 » et « Tu arrives à · 6 644, 6 454 ». Un joueur
            ne peut rien en faire — le jeu n'affiche pas ses coordonnées, il n'y a
            pas de « aller à » où les saisir, et on n'entre pas dans un donjon par
            une position mais par le TÉLÉPORTEUR. Ce qui sert, c'est la région où on
            le prend, et elle est dans les données (`depuis`).

            La coordonnée d'arrivée disparaît sans remplacement : elle décrit un
            point à l'intérieur du donjon, où on est déjà quand on y est.

            Les valeurs restent dans donjons-client.json — le jour où l'on saura
            poser une croix juste sur la carte de région, c'est de là qu'elle
            viendra. Ce qu'on retire, c'est l'affichage d'un nombre inutilisable,
            pas la donnée. */}
        <div style={ligne}>
          <span style={cle}>Comment on y entre</span>
          <span style={val}>Par le téléporteur, depuis {d.depuis}</span>
        </div>
        {d.unites && (
          <div style={ligne}>
            <span style={cle}>Taille de la carte</span>
            <span style={val}>
              {d.unites[0].toLocaleString("fr-FR")} × {d.unites[1].toLocaleString("fr-FR")}
              {d.unites[0] !== d.unites[1] && <span style={{ color: "var(--gn-accent)" }}> · un couloir, pas un carré</span>}
            </span>
          </div>
        )}
        <div style={{ ...ligne, borderBottom: d.zones ? "1px solid var(--border)" : "none" }}>
          <span style={cle}>Sur place</span>
          <span style={val}>{d.interieur ? "Intérieur" : "Extérieur"} · {d.vol ? "vol autorisé" : "vol interdit"}</span>
        </div>
        {d.zones && (
          <div style={{ ...ligne, borderBottom: "none", alignItems: "baseline" }}>
            <span style={cle}>Les zones que tu traverses</span>
            <span style={{ textAlign: "right" }}>{d.zones.join(" → ")}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * L'image du donjon, quand le client en donne une : vingt-deux sur vingt-trois.
 * Le vingt-troisième (Faille du débutant) n'affiche rien plutôt qu'un cadre vide
 * qui laisserait croire à une image cassée.
 *
 * Le TITRE suit le `genre` de la table, il n'est pas fixe. Onze des vingt-deux
 * images sont des vues aériennes — une photo du terrain vue de dessus — et les
 * annoncer « Le plan » promettait une carte lisible : sur les Ruines givrées, on
 * voyait une bande de neige au milieu du noir sous un titre qui disait « plan ».
 * La distinction existait déjà dans les données ; c'est l'affichage qui l'ignorait.
 */
export function PlanDonjon({ d }: { d: DonjonClient }) {
  const plan = PLANS[d.dossier];
  /* LES DEUX CARTOUCHES, quand le client en imprime deux sur le même tracé. Un
     index d'onglet et pas un booléen : si un troisième nom sortait d'une fouille,
     la liste suffirait. Cf. SECOND_NOM dans donneesClient.ts pour la preuve. */
  const noms = SECOND_NOM[d.dossier];
  const [i, setI] = useState(0);
  if (!plan) return null;
  const cadre = plan.cadre;
  const aerien = plan.genre === "aerien";
  const src = noms ? noms[i].src : plan.src;
  return (
    <div style={{ marginBottom: 14 }}>
      <SousTitre icon="map" apres={aerien ? "le terrain vu de dessus, sans repère" : "tel qu'il sort du client"}>
        {aerien ? "La vue aérienne" : "Le plan"}
      </SousTitre>
      {/* Le même tracé, deux noms imprimés : on montre les noms, on ne les
          interprète pas — rien dans les fichiers ne dit à quoi sert le second. */}
      {noms && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
          {noms.map((n, k) => (
            <button key={n.cartouche} onClick={() => setI(k)} aria-pressed={k === i}
              style={{ cursor: "pointer", fontFamily: "inherit", fontSize: 11.5, padding: "3px 9px", borderRadius: 20,
                background: k === i ? "rgba(var(--gn-lueur-rgb),.12)" : "var(--bg-3)",
                border: `1px solid ${k === i ? "var(--gn-accent)" : "var(--border)"}`,
                color: k === i ? "var(--gn-accent)" : "var(--text-muted)" }}>
              {n.cartouche}
            </button>
          ))}
        </div>
      )}
      {/* Plafonné à 460 px et centré : à pleine largeur, un plan carré prenait
          autant de hauteur que tout le reste de la fiche réuni et repoussait le
          peuplement sous la ligne de flottaison. */}
      <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", background: "var(--bg-3)", lineHeight: 0, maxWidth: 460, margin: "0 auto", position: cadre ? "relative" : undefined, aspectRatio: cadre ? `${cadre[2]} / ${cadre[3]}` : undefined }}>
        {/* Sans recadrage, l'image se contente d'occuper la largeur : le plan
            remplit déjà son fichier. Avec, elle est agrandie du facteur qui ramène
            la zone utile à la largeur du cadre, puis décalée pour poser le coin
            haut-gauche de cette zone sur le coin du cadre — d'où le ratio du cadre,
            qui suppose une image source CARRÉE. Un seul plan est recadré à ce jour,
            le Château de Draken, et son fichier fait bien 1 280 × 1 280 : `top` en
            pourcentage se calcule sur la hauteur du conteneur, donc un cadre non
            carré sur une source non carrée décalerait l'image verticalement. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={noms ? `Carte du client, cartouche « ${noms[i].cartouche} »` : `${aerien ? "Vue aérienne" : "Plan"} de ${d.interne}`} loading="lazy"
          style={cadre
            // `maxWidth: none` est indispensable : une règle globale plafonne toutes
            // les images à 100 % de leur parent, et elle annulait silencieusement
            // l'agrandissement — le cadre s'affichait vide, sans erreur nulle part.
            ? { position: "absolute", display: "block", maxWidth: "none", width: `${100 / cadre[2]}%`, left: `${(-cadre[0] * 100) / cadre[2]}%`, top: `${(-cadre[1] * 100) / cadre[2]}%`, filter: plan.filtre }
            : { width: "100%", display: "block", filter: plan.filtre }} />
      </div>
    </div>
  );
}

/**
 * CE QUE TU CROISES DANS LE DONJON.
 *
 * Trois choses ne se déduisent d'aucune capture d'écran et changent la façon de
 * jouer l'instance : la RAGE (la plupart des monstres doublent ou triplent leurs
 * dégâts sous 20 % de PV — c'est là qu'on meurt, pas au premier coup), les
 * INVOCATIONS (un mini-boss qui appelle un renfort à 30 % de ses PV), et la
 * FAIBLESSE élémentaire, lue dans la table de résistances du monstre.
 *
 * `points` est le nombre de points de réapparition posés sur la carte : c'est la
 * mesure honnête de « combien il y en a », là où le total de monstres dépend du
 * rythme de réapparition côté serveur.
 */
export function Peuplement({ d }: { d: DonjonClient }) {
  if (d.monstres.length === 0) {
    return (
      <div style={{ marginBottom: 14 }}>
        <SousTitre icon="skull">Ce que tu croises</SousTitre>
        <div style={{ color: "var(--text-muted)", fontSize: 12.5 }}>
          Aucun monstre n&apos;est posé dans le fichier de carte : tout ce que tu affrontes ici
          est créé par le serveur au fil de la progression. Le donjon n&apos;est pas vide pour autant.
        </div>
      </div>
    );
  }
  return (
    <div style={{ marginBottom: 14 }}>
      <SousTitre icon="skull" apres={`${d.monstres.length} espèce${d.monstres.length > 1 ? "s" : ""} posée${d.monstres.length > 1 ? "s" : ""} sur la carte`}>
        Ce que tu croises
      </SousTitre>
      <div style={{ display: "grid", gap: 7 }}>
        {/* LA CLÉ PORTE LE RANG DANS LA LISTE, et ce n'est pas de la coquetterie :
            `m.nom + m.pv` produisait DEUX FOIS la même clé sur la Ruine Prestigieuse,
            qui pose deux « Lézard Prestigieux » de 2 000 000 PV — deux entrées
            distinctes du fichier de carte, avec des emplacements différents. React
            criait « two children with the same key » dans la console à chaque
            ouverture de la fiche, et se réservait le droit d'en omettre une. Relevé
            dans le navigateur, pas supposé. */}
        {d.monstres.map((m, i) => (
          <div key={`${m.nom}|${m.pv}|${i}`} style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 11px" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
              {/* LE NOM MÈNE À SA FICHE : les monstres appartiennent à /monstres, cette
                  page ne garde d'eux que ce qui fait décider d'entrer. Sans lien, il
                  fallait retenir le nom et le retaper dans l'autre wiki. */}
              <span className="font-heading" style={{ fontSize: 13.5, fontWeight: 600 }}>
                <LienMonstre nom={m.nom} niv={m.niv} pv={m.pv} />
              </span>
              <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, color: TON_RANG[m.rang] ?? "var(--text-muted)" }}>{m.rang}</span>
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
                niv. {m.niv} · <b style={{ color: "var(--gn-accent)" }}>{pvCourt(m.pv)} PV</b>
              </span>
            </div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 6, fontSize: 11.5 }}>
              {/* Le nombre de points de réapparition, pas le nombre de monstres : le
                  serveur décide du rythme, la carte ne fixe que les emplacements. */}
              <Puce ic="grid" ton="var(--text-muted)">{m.points} emplacement{m.points > 1 ? "s" : ""}</Puce>
              {/* Les deux pastilles élémentaires portent le dessin du jeu plutôt qu'un
                  pictogramme maison : c'est la même image que sur /monstres, sur les
                  tuiles de donjon et sur la Tour Oubliée. Le mot reste, parce qu'une
                  ligne de monstre en porte jusqu'à six et qu'on ne lit pas six
                  dessins d'affilée. */}
              {m.elem && m.elem !== "Aucun" && (
                <Puce ic="sparkles" ton="var(--blue)"><IconeElementDonjon elem={m.elem} taille={12} />{m.elem}</Puce>
              )}
              {m.faible && (
                <Puce ic="target" ton="var(--green)"><IconeElementDonjon elem={m.faible} taille={12} />Faible {A_ELEMENT[m.faible] ?? `à ${m.faible.toLowerCase()}`}</Puce>
              )}
              {/* CE QU'IL ENCAISSE MIEUX — le champ que le relevé porte depuis le
                  début et que rien n'affichait. Les deux ne sont pas symétriques :
                  la faiblesse fait gagner du temps, la résistance en fait perdre, et
                  c'est la seconde qu'on ne devine pas. Une créature de terre qui
                  résiste au vent dément la règle générale du wiki des monstres, et
                  sans cette pastille elle la dément en silence. */}
              {m.resiste && (
                <Puce ic="shield" ton="var(--red)"><IconeElementDonjon elem={m.resiste} taille={12} />Encaisse mieux {LE_ELEMENT[m.resiste] ?? m.resiste.toLowerCase()}</Puce>
              )}
              {/* NI L'UN NI L'AUTRE SE DIT AUSSI. Le wiki des monstres écrit
                  « indifférent » dans ce cas plutôt que de ne rien mettre : une case
                  vide se lit « on n'a pas le relevé », alors que le relevé est là et
                  ne porte que des zéros. Les deux pages doivent dire la même chose. */}
              {!m.faible && !m.resiste && (
                <Puce ic="info" ton="var(--text-muted)">L&apos;élément n&apos;y change rien</Puce>
              )}
              {m.rage && <Puce ic="flame" ton="var(--red)">Rage sous {m.rage[0]} % de PV : ×{m.rage[1]} dégâts</Puce>}
              {m.invoque?.map((i) => (
                <Puce key={i.nom} ic="users" ton="var(--gold)">À {i.pv} % de PV, invoque {i.n} {i.nom}</Puce>
              ))}
              {m.atk && <Puce ic="sword" ton="var(--text-muted)">{m.atk[0].toLocaleString("fr-FR")} – {m.atk[1].toLocaleString("fr-FR")} d&apos;attaque</Puce>}
              {m.vole && <Puce ic="wings" ton="var(--purple)">Vole</Puce>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* LES DEUX ARTICLES DES CINQ ÉLÉMENTS, écrits comme les données de donjon les
   écrivent (en français, avec la majuscule). Deux tables et non une règle :
   « à + le » se contracte en « au », « à + la » ne se contracte pas, et deux des
   cinq commencent par une voyelle. « Faible au vent », « faible à l'eau »,
   « faible à la terre » — la version calculée donnait « faible à le vent ». */
const A_ELEMENT: Record<string, string> = {
  Feu: "au feu", Eau: "à l'eau", "Électricité": "à l'électricité",
  Vent: "au vent", Terre: "à la terre",
};
const LE_ELEMENT: Record<string, string> = {
  Feu: "le feu", Eau: "l'eau", "Électricité": "l'électricité",
  Vent: "le vent", Terre: "la terre",
};

function Puce({ ic, ton, children }: { ic: IconName; ton: string; children: React.ReactNode }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 5, padding: "2px 7px", color: ton, fontVariantNumeric: "tabular-nums" }}>
      <Icon name={ic} size={11} />{children}
    </span>
  );
}

/**
 * SIETCH KALGAS : le seul donjon dont on connaît le déroulé.
 *
 * Il était le trou du wiki — sa fiche n'avait ni PV conseillés ni butin. Le
 * client livre ses quatre monstres posés, mais aussi sept créatures marquées
 * « instance » qui ne sont PAS sur la carte : le boss final, deux statues, un œuf.
 * Elles apparaissent au fil de la progression, ce qui donne l'ordre des étapes.
 * Aucun autre donjon n'a cette chaîne complète, d'où un bloc réservé.
 */
export function KalgasEnPlus({ d }: { d: DonjonClient }) {
  if (!d.etapes && !d.horsCarte) return null;
  return (
    <>
      {d.etapes && (
        <div style={{ marginBottom: 14 }}>
          <SousTitre icon="path">Dans quel ordre ça se joue</SousTitre>
          <ol style={{ margin: 0, paddingLeft: 20, fontSize: 12.5, display: "grid", gap: 5 }}>
            {d.etapes.map((e) => <li key={e}>{e}</li>)}
          </ol>
        </div>
      )}
      {d.horsCarte && (
        <div style={{ marginBottom: 14 }}>
          <SousTitre icon="alert" apres="absents du fichier de carte, créés par le serveur">
            Ce que la progression fait apparaître
          </SousTitre>
          <div style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 12px 8px" }}>
            {d.horsCarte.map((m, i) => (
              <div key={m.nom} style={{ ...ligne, borderBottom: i === d.horsCarte!.length - 1 ? "none" : "1px solid var(--border)", alignItems: "baseline" }}>
                <span style={{ minWidth: 0 }}>
                  <b><LienMonstre nom={m.nom} niv={m.niv} pv={m.pv} /></b>
                  <span style={{ display: "block", color: "var(--text-muted)", fontSize: 11.5 }}>{m.role}</span>
                </span>
                <span style={{ ...val, color: "var(--gn-accent)", whiteSpace: "nowrap" }}>{pvCourt(m.pv)} PV</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {d.noteButin && (
        <div style={{ background: "rgba(var(--gn-lueur-rgb),.06)", border: "1px solid var(--gn-or-sombre)", borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 12.5, color: "var(--text-muted)" }}>
          <Icon name="info" size={13} style={{ marginRight: 5, color: "var(--gn-accent)" }} />{d.noteButin}
        </div>
      )}
    </>
  );
}

/**
 * L'écart entre le tooltip du jeu et la valeur du site, quand il y en a un.
 *
 * Quatre donjons sont concernés. Le site garde SA valeur : la série de « Prestige
 * 8 » recopiée sur trois donjons de niveau 200 d'affilée a toutes les allures
 * d'un copier-coller que les développeurs n'ont pas repris, et l'expérience en
 * jeu tranche pour le site. On le dit quand même, parce que celui qui lit le
 * tooltip en jeu voit un autre chiffre et croirait le site faux.
 */
export function EcartPrestige({ site, client }: { site: number | null; client: number | null }) {
  if (client == null || site == null || client === site) return null;
  return (
    <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4, display: "inline-flex", alignItems: "center", gap: 5 }}>
      <Icon name="info" size={11} style={{ color: "var(--gold)" }} />
      Le tooltip du jeu annonce prestige {client} ; on garde {site}, le tooltip n&apos;a pas été repris.
    </div>
  );
}
