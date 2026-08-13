"use client";
import Link from "next/link";
import { Icon, type IconName } from "@/components/Icon";
import { Bulle, Invisible } from "@/components/Bulle";
import { EnteteVolet, VoletSections, type SectionVolet } from "@/components/VoletSections";
import { useCardFx } from "@/components/VgFx";
import BUTIN from "@/data/monstres-butin.json";
import { CarteMonstre } from "./Recherche";
import { Resistances, SchemaVies } from "./Graphiques";
import {
  bornesInversees, cadence, coupMax, coupMin, court, ELEMENT_FR, entier, iconeElement,
  parSeconde, portraitDe, TON_ELEMENT, tonRang, type Monstre,
} from "./vocabulaire";

/**
 * LA FICHE D'UN MONSTRE.
 *
 * Le rail sert ici parce que la fiche a vraiment plusieurs facettes qui ne se
 * lisent pas au même moment : on regarde « ce qu'il encaisse » avant le combat,
 * « ce qu'il fait » pendant, « ce qu'il lâche » après, et « où il est » avant de
 * partir.
 *
 * ┌──────── UNE SECTION VIDE N'EXISTE PLUS ────────┐
 * │ « Aucune mécanique scriptée pour ce monstre »,  │
 * │ « aucun point d'apparition dans les cartes »,   │
 * │ « une fiche sans butin ne veut pas dire… » :    │
 * │ trois sections qui, les trois quarts du temps,  │
 * │ ne portaient qu'un constat d'ignorance et sa    │
 * │ statistique de consolation. Elles ne sont plus  │
 * │ CONSTRUITES quand elles sont vides. Le rail est │
 * │ donc court et tout ce qu'il annonce existe —    │
 * │ chaque entrée portant son compte, on sait ce    │
 * │ qu'il y a dedans sans l'ouvrir.                │
 * └────────────────────────────────────────────────┘
 *
 * Ce qui est parti aussi : l'expérience, la penya, les points Madrigal et les taux
 * de butin. Les objets, eux, sont RESTÉS — c'est leur NOM qui sert, et il est
 * maintenant montré avec l'icône du client.
 *
 * ┌────── CE QUE CETTE PASSE A CHANGÉ : LE BUTIN MÈNE QUELQUE PART ──────┐
 * │ « Ce qu'il lâche » affichait une grille d'icônes et de noms MORTS :   │
 * │ on lisait « Âme de démon » et il fallait aller la retaper dans la     │
 * │ recherche d'objets pour savoir ce que c'est. Chaque vignette est      │
 * │ maintenant un lien vers la fiche de l'objet, où vivent ses bonus, sa  │
 * │ provenance complète et les autres monstres qui le lâchent. C'est      │
 * │ exactement le « retrouver les monstres, les objets, drops » demandé.  │
 * │ Le pont porte l'identifiant depuis cette passe : le relevé ne nommait  │
 * │ que le nom, et un nom ne fait pas une adresse (deux objets peuvent le  │
 * │ partager — versions garçon et fille).                                 │
 * └──────────────────────────────────────────────────────────────────────┘
 */

/** Ce que le pont sait d'un objet lâché : son nom, son identifiant de fiche, et son
 *  icône QUAND elle existe sur le disque — huit des 106 n'en ont pas, et on ne
 *  pointe jamais un fichier absent. */
type Trouve = { n: string; i: number; ic?: string };
const OBJETS = (BUTIN as { objets: Record<string, Trouve> }).objets;

/** Une ligne chiffrée. `tabular-nums` partout : sans ça, les colonnes de PV et de
 *  dégâts dansent d'une ligne à l'autre et on ne peut plus les comparer d'un œil. */
function Ligne({ quoi, valeur, ton }: { quoi: React.ReactNode; valeur: React.ReactNode; ton?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "7px 0", borderTop: "1px solid color-mix(in srgb, var(--border) 55%, transparent)" }}>
      <span style={{ fontSize: 12.5, color: "var(--text-muted)", flex: "1 1 auto", minWidth: 0 }}>{quoi}</span>
      <span className="font-heading" style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: ton ?? "var(--text)", flexShrink: 0, textAlign: "right" }}>
        {valeur}
      </span>
    </div>
  );
}

/** Une tuile marquante, pour les deux ou trois chiffres qui décident du combat. */
function Tuile({ titre, valeur, sous, ton = "var(--orange)", icon }: {
  titre: React.ReactNode; valeur: React.ReactNode; sous?: string; ton?: string; icon: IconName;
}) {
  return (
    <div style={{ background: "var(--bg-3)", border: `1px solid color-mix(in srgb, ${ton} 26%, var(--border))`, borderRadius: 11, padding: "11px 13px", minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".7px", color: "var(--text-muted)" }}>
        <Icon name={icon} size={11} style={{ color: ton }} />{titre}
      </div>
      <div className="font-heading" style={{ fontSize: 19, fontWeight: 700, color: ton, fontVariantNumeric: "tabular-nums", marginTop: 2, lineHeight: 1.15 }}>{valeur}</div>
      {sous && <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>{sous}</div>}
    </div>
  );
}

/** Un titre de bloc dans une section. */
function Titre({ icon, ton, children, apres }: {
  icon: IconName; ton: string; children: React.ReactNode; apres?: React.ReactNode;
}) {
  return (
    <div className="font-heading" style={{ fontSize: 13.5, fontWeight: 700, color: ton, display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
      <Icon name={icon} size={14} /> {children}
      {apres && <span style={{ fontWeight: 400, color: "var(--text-muted)", fontSize: 12 }}>{apres}</span>}
    </div>
  );
}

/** Un seuil de PV et son effet, en une ligne de trois colonnes plutôt qu'en phrase. */
function Seuil({ pv, fleche, ton }: { pv: number; fleche: React.ReactNode; ton: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 9, fontSize: 12.5, fontVariantNumeric: "tabular-nums", padding: "3px 0" }}>
      <span style={{ minWidth: 74, color: "var(--text-muted)" }}>sous {pv} % PV</span>
      <span style={{ color: ton, fontWeight: 700 }}>{fleche}</span>
    </div>
  );
}

export function FicheMonstre({ m, voisins }: { m: Monstre; voisins: Monstre[] }) {
  useCardFx();
  const seReleve = (m.vies ?? 0) > 1;
  const vies = m.vies ?? 1;
  const ic = iconeElement(m.elem);
  const portrait = portraitDe(m.id);
  const nbMecaniques =
    (m.rage?.length ?? 0) + (m.soigne?.length ?? 0) + (m.invoque?.length ?? 0) +
    (m.renfort ? 1 : 0) + (m.fuit != null ? 1 : 0) + (m.distance ? 1 : 0);

  /* Le butin, réduit à ce qui sert : des NOMS, avec l'icône du client. Les taux
     sont partis (« on s'en fiche »), et avec eux l'avertissement qui expliquait
     pourquoi les tables ordinaires manquaient. Un objet dont le relevé ne rend ni
     nom français ni icône est écarté plutôt qu'affiché en clé brute
     (`II_GEN_JEW_RIN_INTRING` n'apprend rien à personne). */
  const objets: Trouve[] = [];
  const vus = new Set<string>();
  for (const b of [...(m.butin ?? []), ...(m.butinClient ?? [])]) {
    const o = OBJETS[b.o];
    if (!o || vus.has(o.n)) continue;
    vus.add(o.n);
    objets.push(o);
  }

  const sections: SectionVolet[] = [

    {
      clef: "encaisse", titre: "Ce qu'il encaisse", sous: "PV, défense, résistances", icon: "shield",
      compte: null,
      contenu: (
        <div style={{ display: "flex", gap: 15, alignItems: "flex-start", flexWrap: "wrap" }}>
          {/* L'illustration de sa carte du client — huit monstres du catalogue en
              ont une dont le dessin a été vérifié (cf. `portraitDe`). Quand il n'y
              en a pas, on ne met rien : ni cadre vide, ni pictogramme générique. */}
          {portrait && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={portrait} alt={m.nom} width={96} height={218}
              style={{ width: 96, height: 218, objectFit: "cover", borderRadius: 10, border: "1px solid var(--border)", flexShrink: 0 }} />
          )}
          <div style={{ display: "grid", gap: 14, flex: "1 1 300px", minWidth: 0 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(148px,1fr))", gap: 9 }}>
              <Tuile icon="heart" ton={seReleve ? "var(--red)" : "var(--orange)"}
                titre={seReleve
                  ? (
                    /* La pastille est POSÉE SUR LE CHIFFRE : c'est ici qu'on lit le
                       nombre, donc ici qu'on doit apprendre que le jeu ne le montre
                       jamais. */
                    <Invisible enJeu={`Sa barre de vie annonce ${entier(m.pv)} PV — les PV d'une seule vie. Il en a ${vies} : un groupe qui se prépare sur le chiffre affiché se trompe d'un facteur ${vies}.`}>
                      <span>PV à sortir</span>
                    </Invisible>
                  )
                  : "PV"}
                valeur={court(m.pvEff)} sous={seReleve ? `${entier(m.pv)} × ${vies} vies` : entier(m.pv)} />
              <Tuile icon="shield" titre="Défense" valeur={entier(m.def)} ton="var(--blue)" />
              <Tuile icon="sparkles" titre="Résistance magique" valeur={entier(m.resMag)} ton="var(--purple)" />
            </div>

            {/* Le schéma remplace le paragraphe rouge de six lignes. */}
            {seReleve && <SchemaVies pv={m.pv} vies={vies} pvEff={m.pvEff} taille="petite" />}

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 7 }}>
                {ic && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ic} alt="" width={20} height={20} style={{ objectFit: "contain" }} />
                )}
                <span className="font-heading" style={{ fontSize: 13.5, fontWeight: 700 }}>
                  {ELEMENT_FR[m.elem ?? "aucun"] ?? "élément inconnu"}
                  {m.elemNiv ? <span style={{ color: "var(--text-muted)", fontWeight: 400 }}> · niveau {m.elemNiv}</span> : null}
                </span>
              </div>
              {/* Les cinq colonnes du client, en graphique : la phrase « il prend
                  plus de dégâts à l'eau et résiste au feu » se lit dans le dessin,
                  et le dessin dit en plus DE COMBIEN. */}
              <Resistances res={m.res} />
            </div>

            <div>
              <Ligne quoi="Points de magie" valeur={entier(m.pm)} />
              <Ligne quoi="Esquive" valeur={entier(m.esq)} />
              <Ligne quoi="Précision" valeur={entier(m.prec)} />
              <Ligne quoi="Force · Endurance · Dextérité · Intelligence"
                valeur={m.sta.map((x) => (x == null ? "—" : x.toLocaleString("fr-FR"))).join(" · ")} />
            </div>
          </div>
        </div>
      ),
    },

    {
      clef: "frappe", titre: "Ce qu'il te fait", sous: "dégâts par coup et cadence", icon: "sword-cross",
      compte: null,
      contenu: (
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(148px,1fr))", gap: 9 }}>
            {/* `coupMax` et non `atkMax` : cinq monstres du client portent leurs deux
                bornes à l'envers, et cette tuile annonçait pour eux un coup dix fois
                trop faible — 36 k pour la Divinité du Chaos, là où /worldboss disait
                360 k du même monstre. L'inversion est DITE plutôt que corrigée en
                silence : elle protège d'une préparation faite sur le mauvais chiffre. */}
            <Tuile icon="sword" titre="Dégâts par coup" ton="var(--red)"
              valeur={coupMax(m) ? court(coupMax(m)) : "—"}
              sous={coupMin(m) !== coupMax(m)
                ? `${entier(coupMin(m))} à ${entier(coupMax(m))}${bornesInversees(m) ? " — bornes inversées dans le client" : ""}`
                : undefined} />
            <Tuile icon="clock" titre="Cadence" ton="var(--gold)"
              valeur={cadence(m.delai) ?? "—"} sous={m.delai ? `${entier(m.delai)} ms` : undefined} />
            {parSeconde(m) ? (
              <Tuile icon="gauge" titre="Par seconde" ton="var(--red)" valeur={court(parSeconde(m))}
                sous="sur une cible, avant ta défense" />
            ) : null}
            {m.distance ? <Tuile icon="target" titre="Attaque à distance" ton="var(--blue)" valeur={`${m.distance} m`} /> : null}
          </div>

          <div>
            <Ligne quoi="Agressivité" valeur={m.agro ?? "—"} />
            {m.aggro ? <Ligne quoi="Portée d'aggro" valeur={`${m.aggro} m`} /> : null}
            <Ligne quoi="Vole" valeur={m.vole ? "Oui" : "Non"} />
          </div>
        </div>
      ),
    },
  ];

  if (nbMecaniques > 0) {
    sections.push({
      clef: "mecaniques", titre: "Ce qu'il fait en combat", sous: "rage, soins, invocations, fuite", icon: "flame",
      compte: nbMecaniques,
      contenu: (
        <div style={{ display: "grid", gap: 13 }}>
          {m.rage?.length ? (
            <div>
              <Titre icon="flame" ton="var(--red)">
                <Bulle quoi="C'est la fin du combat qui tue, pas le début : le tank doit avoir ses soins prêts au passage du seuil.">
                  <span>Rage</span>
                </Bulle>
              </Titre>
              {m.rage.map((r, i) => (
                <Seuil key={i} pv={r.pv} ton="var(--red)"
                  fleche={<>dégâts ×{r.x.toLocaleString("fr-FR")}{coupMax(m) ? ` · jusqu'à ${court(Math.round(coupMax(m) * r.x))} par coup` : ""}</>} />
              ))}
            </div>
          ) : null}

          {m.soigne?.length ? (
            <div>
              <Titre icon="sparkles" ton="var(--green)">
                <Bulle quoi="Le soin ne part qu'une fois. Un groupe qui passe le seuil d'un seul coup ne le déclenche pas — c'est ce qui décide de garder les gros dégâts pour la fin.">
                  <span>Il se soigne</span>
                </Bulle>
              </Titre>
              {m.soigne.map((s, i) => (
                <Seuil key={i} pv={s.pv} ton="var(--green)" fleche={<>rend {s.rend} % de sa vie</>} />
              ))}
            </div>
          ) : null}

          {m.invoque?.length ? (
            <div>
              <Titre icon="users" ton="var(--purple)" apres={`${m.invoque.length} ligne${m.invoque.length > 1 ? "s" : ""}`}>
                Il invoque
              </Titre>
              <div style={{ display: "grid", gap: 4 }}>
                {m.invoque.map((i, k) => (
                  <div key={k} style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 12.5, fontVariantNumeric: "tabular-nums" }}>
                    <span style={{ color: "var(--gold)", fontWeight: 700, minWidth: 42 }}>{i.c} %</span>
                    <span style={{ flex: 1, minWidth: 0 }}>{i.m}{i.n > 1 ? ` ×${i.n}` : ""}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {m.renfort ? (
            <div>
              <Titre icon="megaphone" ton="var(--gold)">Il appelle des renforts</Titre>
              <div style={{ fontSize: 12.5 }}>
                {m.renfort.pv >= 100 ? "dès l'engagement" : `sous ${m.renfort.pv} % PV`} ·{" "}
                <b>{m.renfort.m}</b>{m.renfort.n > 1 ? ` ×${m.renfort.n}` : ""}
              </div>
            </div>
          ) : null}

          {m.fuit != null ? <Ligne quoi="Il fuit" valeur={`sous ${m.fuit} % de PV`} ton="var(--blue)" /> : null}
          {m.tache ? <Ligne quoi="Compte pour la tâche « tuer un boss »" valeur="Oui" ton="var(--green)" /> : null}
        </div>
      ),
    });
  }

  if (objets.length > 0 || m.titre) {
    sections.push({
      clef: "lache", titre: "Ce qu'il lâche", sous: "les objets nommés dans le client", icon: "package",
      compte: objets.length || null,
      contenu: (
        <div style={{ display: "grid", gap: 14 }}>
          {objets.length > 0 && (
            <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
              {objets.map((o) => (
                <Link key={o.n} href={`/objets/${o.i}`} title={`${o.n} — sa fiche et sa provenance`}
                  className="fx-card vg-butin"
                  style={{ width: 92, display: "grid", justifyItems: "center", gap: 4, background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 10, padding: "9px 6px", textDecoration: "none" }}>
                  {/* Les icônes du client font 32 px : agrandies elles bavent, donc
                      `pixelated` — c'est ce que le joueur a sous les yeux en jeu.
                      Huit des 106 objets n'ont pas de fichier sur le disque : on ne
                      met alors rien, une image cassée est pire que pas d'image. */}
                  {o.ic ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/jeu/icones/${o.ic}`} alt="" width={32} height={32} style={{ objectFit: "contain", imageRendering: "pixelated" }} />
                  ) : (
                    <Icon name="package" size={26} style={{ color: "var(--text-muted)" }} />
                  )}
                  <span style={{ fontSize: 10.5, textAlign: "center", lineHeight: 1.25, color: "var(--text-muted)" }}>{o.n}</span>
                </Link>
              ))}
            </div>
          )}

          {m.titre ? (
            <div style={{ border: "1px solid color-mix(in srgb, var(--gold) 35%, transparent)", background: "color-mix(in srgb, var(--gold) 7%, transparent)", borderRadius: 10, padding: "11px 13px", fontSize: 13 }}>
              <Icon name="medal" size={14} style={{ marginRight: 6, color: "var(--gold)" }} />
              Titre <b style={{ color: "var(--gold)" }}>{m.titre.t}</b> ·{" "}
              <b style={{ fontVariantNumeric: "tabular-nums" }}>{entier(m.titre.n)}</b> mises à mort
            </div>
          ) : null}
        </div>
      ),
    });
  }

  if (m.lieux?.length) {
    sections.push({
      clef: "ou", titre: "Où le trouver", sous: "les zones où il est posé", icon: "map-pin",
      compte: m.lieux.length,
      contenu: (
        <div style={{ display: "grid", gap: 5 }}>
          {m.lieux.map((l, i) => (
            <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 9, padding: "7px 0", borderTop: i ? "1px solid color-mix(in srgb, var(--border) 55%, transparent)" : "none", fontSize: 13 }}>
              <Icon name="map-pin" size={13} style={{ color: "var(--orange)", flexShrink: 0, transform: "translateY(2px)" }} />
              <span style={{ flex: 1, minWidth: 0, fontWeight: 600 }}>{l.z}</span>
              <span style={{ flexShrink: 0, fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
                <Bulle quoi="Le nombre de points d'apparition posés dans les fichiers de carte, pas le nombre de monstres vivants à un instant donné.">
                  <span>{l.n} apparition{l.n > 1 ? "s" : ""}</span>
                </Bulle>
              </span>
            </div>
          ))}
        </div>
      ),
    });
  }

  if (voisins.length) {
    sections.push({
      clef: "famille", titre: "Sa famille", sous: "les autres paliers, et le même donjon", icon: "layers",
      compte: voisins.length,
      contenu: (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(250px,1fr))", gap: 10 }}>
          {voisins.map((v) => <CarteMonstre key={v.id} m={v} />)}
        </div>
      ),
    });
  }

  return (
    <div style={{ padding: 32, maxWidth: 1150, margin: "0 auto" }}>
      <Link href="/monstres" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--text-muted)", textDecoration: "none", marginBottom: 12 }}>
        <Icon name="arrow-left" size={13} /> Tous les monstres
      </Link>

      <VoletSections
        entete={
          <EnteteVolet
            icon={seReleve ? "skull" : "paw"}
            titre={m.nom}
            marque={seReleve ? { texte: `${vies} vies`, couleur: "var(--red)" } : m.maison ? { texte: "AirFlyff", couleur: "var(--purple)" } : undefined}
            sous={
              <span style={{ display: "flex", gap: 9, flexWrap: "wrap", alignItems: "center" }}>
                <b style={{ color: tonRang(m.rang) }}>{m.rang ?? "rang inconnu"}</b>
                {m.niv != null && <span style={{ fontVariantNumeric: "tabular-nums" }}>niveau {m.niv}</span>}
                {ic && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: TON_ELEMENT[m.elem ?? "aucun"] }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ic} alt="" width={14} height={14} style={{ objectFit: "contain" }} />
                    {ELEMENT_FR[m.elem!]}
                  </span>
                )}
                {m.zone && <span>· {m.zone}</span>}
                {m.groupe && <span>· {m.groupe}</span>}
                {m.maison && seReleve && <span style={{ color: "var(--purple)" }}>· AirFlyff</span>}
              </span>
            }
          />
        }
        sections={sections}
      />

      {/* Le survol dit que la vignette de butin est cliquable : sans lui, une grille
          d'icônes se lit comme une illustration et personne ne clique. */}
      <style>{`.vg-butin{transition:border-color .15s,background .15s}
.vg-butin:hover{border-color:var(--orange);background:color-mix(in srgb, var(--orange) 8%, var(--bg-3))}`}</style>
    </div>
  );
}
