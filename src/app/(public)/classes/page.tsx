"use client";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { VoletSections, EnteteVolet } from "@/components/VoletSections";
import { ClassBouton, ClassLogo } from "@/components/ClassLogo";
import { Icon, type IconName } from "@/components/Icon";
import { useCardFx } from "@/components/VgFx";
import { CLASSES, findClass } from "@/data/classes";
import { LIGNEES, XP_COMPETENCE, LIMITES, ligneeDe, type Lignee, type Etape, type CompetencePalier } from "./donnees";

/**
 * LA CHAÎNE DE PROMOTION — d'où vient ta classe, et ce qu'elle devient.
 *
 * Le site ne connaissait que le BOUT de la chaîne : huit classes de fin de jeu,
 * huit logos. Or un perso traverse six paliers avant d'y arriver, et le client
 * dessine un emblème officiel pour chacun — 46 en tout, vagabond compris. On
 * montrait la destination sans le chemin.
 *
 * Ce qui compte ici n'est pas la liste des compétences (il en existe 202, ce
 * serait un autre outil) mais la STRUCTURE : quel palier apprend quoi, à quel
 * niveau il s'ouvre, et ce qu'il pèse dans le budget de points. Deux choses
 * que la fouille du client révèle et qu'aucun guide ne dit :
 *
 *  · les huit compétences de Héros portent huit noms mais ne font que DEUX
 *    effets au niveau 5 ;
 *  · sept sur huit coûtent 9 999 999 PM aux niveaux 1 à 4 — donc inutilisables
 *    tant que le tirage aléatoire n'a pas donné 5.
 */

const fmt = (n: number) => n.toLocaleString("fr-FR");
const NUM = { fontVariantNumeric: "tabular-nums" } as const;
// Une seule règle pour toutes les durées de la page. Sinon on affichait « dure
// 1 min » à côté de « recharge 120 s » sur la même ligne, pour deux valeurs du
// même ordre — impossible à comparer d'un coup d'œil.
const duree = (s: number) => (s < 60 ? `${s} s` : `${Math.round(s / 60)} min`);

// Les six marches, nommées comme le jeu les nomme. La couleur monte avec le
// palier : c'est le seul repère qui permette de lire une lignée d'un coup d'œil.
const PALIERS: Record<Etape["palier"], { nom: string; couleur: string; icon: IconName }> = {
  vagabond:   { nom: "Départ",     couleur: "var(--text-muted)", icon: "user" },
  metier1:    { nom: "Métier 1",   couleur: "var(--blue)",       icon: "sword" },
  metier2:    { nom: "Métier 2",   couleur: "var(--green)",      icon: "swords" },
  maitre:     { nom: "Maître",     couleur: "var(--gold)",       icon: "medal" },
  heros:      { nom: "Héros",      couleur: "var(--orange)",     icon: "trophy" },
  legendaire: { nom: "Légendaire", couleur: "var(--purple)",     icon: "crown" },
};

// Le mur : le client fixe le coût à 9 999 999 PM pour rendre le palier
// injouable, ce n'est pas une valeur de réglage. On le nomme.
const PM_MUR = 9999999;

function Pastille({ texte, couleur, titre }: { texte: string; couleur: string; titre?: string }) {
  return (
    <span title={titre} style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".6px", color: couleur,
      background: `color-mix(in srgb, ${couleur} 11%, transparent)`, border: `1px solid color-mix(in srgb, ${couleur} 38%, transparent)`,
      borderRadius: 20, padding: "2px 9px", whiteSpace: "nowrap" }}>{texte}</span>
  );
}

/** La chaîne elle-même : six emblèmes, cinq flèches. */
function Chaine({ lignee }: { lignee: Lignee }) {
  return (
    <div className="cl-chaine">
      {lignee.etapes.map((e, i) => {
        const p = PALIERS[e.palier];
        return (
          <div key={e.nom} className="cl-maille">
            <div className="cl-marche" style={{ borderColor: `color-mix(in srgb, ${p.couleur} 45%, var(--border))` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={e.embleme} alt="" width={48} height={48} style={{ objectFit: "contain" }} />
              <span style={{ fontSize: 12, fontWeight: 700, textAlign: "center", lineHeight: 1.2 }}>{e.nom}</span>
              <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".5px", color: p.couleur, fontWeight: 700 }}>{p.nom}</span>
              {/* Le niveau affiché est celui de la compétence la plus tardive du
                  palier, PAS celui de la promotion : le client n'a pas le second.
                  D'où l'infobulle — « niv. 60 » sous « Meneur » sans explication se
                  lit comme une porte d'entrée, ce que ce n'est pas. */}
              <span title={e.niveauRequis ? `La dernière compétence de ce palier demande le niveau ${e.niveauRequis}` : undefined}
                style={{ fontSize: 10.5, color: "var(--text-muted)", ...NUM }}>
                {e.niveauRequis ? `dès niv. ${e.niveauRequis}` : " "}
              </span>
            </div>
            {/* La flèche SUIT sa marche au lieu de précéder la suivante : quand la
                chaîne se replie sur deux lignes, une flèche en tête de ligne pend
                dans le vide, alors qu'en fin de ligne elle dit « ça continue ». */}
            {i < lignee.etapes.length - 1 && <span className="cl-fleche" aria-hidden>→</span>}
          </div>
        );
      })}
    </div>
  );
}

/** Une compétence de palier : ses chiffres au niveau 5, et son coût en PM par niveau. */
function CartePalier({ c, mur }: { c: CompetencePalier; mur: boolean }) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <span className="font-heading" style={{ fontSize: 17, fontWeight: 700, color: "var(--orange)" }}>{c.nom}</span>
        <Pastille texte={`niveau ${c.niveauRequis}`} couleur="var(--text-muted)" />
        <Pastille texte="5 niveaux" couleur="var(--text-muted)" />
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {c.effets5.map((e) => (
          <span key={e} style={{ fontSize: 13, fontWeight: 700, padding: "6px 12px", borderRadius: 9, background: "var(--bg-3)",
            border: "1px solid var(--border)", color: "var(--green)", ...NUM }}>{e}</span>
        ))}
        {c.dureeS != null && <span style={{ fontSize: 12.5, padding: "6px 12px", borderRadius: 9, background: "var(--bg-2)", border: "1px solid var(--border)", color: "var(--text-muted)", ...NUM }}>
          dure {duree(c.dureeS)}
        </span>}
        {c.rechargeS != null && <span style={{ fontSize: 12.5, padding: "6px 12px", borderRadius: 9, background: "var(--bg-2)", border: "1px solid var(--border)", color: "var(--text-muted)", ...NUM }}>
          recharge {duree(c.rechargeS)}
        </span>}
      </div>

      {c.description && <p style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.55, margin: "0 0 14px" }}>« {c.description} »</p>}

      {/* Le coût en PM niveau par niveau. C'est là que se voit le mur. */}
      {c.coutPM.some((v) => v != null) && (
        <>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: "var(--text-muted)", marginBottom: 7 }}>Ce que ça te coûte en PM à lancer</div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {c.coutPM.map((pm, i) => {
              const bloque = pm === PM_MUR;
              return (
                <span key={i} style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 76, padding: "7px 9px", borderRadius: 9,
                  background: bloque ? "rgba(255,90,90,.09)" : "var(--bg-3)", border: `1px solid ${bloque ? "color-mix(in srgb, var(--red) 42%, transparent)" : "var(--border)"}` }}>
                  <b style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".5px", color: "var(--text-muted)" }}>niv. {i + 1}</b>
                  <b style={{ fontSize: 12.5, color: bloque ? "var(--red)" : "var(--green)", ...NUM }}>{fmt(pm ?? 0)}</b>
                </span>
              );
            })}
          </div>
          {mur && (
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 12, padding: "11px 13px", borderRadius: 10,
              background: "rgba(255,90,90,.07)", border: "1px solid color-mix(in srgb, var(--red) 30%, transparent)" }}>
              <Icon name="alert" size={15} style={{ color: "var(--red)", flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 12.5, lineHeight: 1.55 }}>
                Aux niveaux 1 à 4, la compétence coûte <b style={{ color: "var(--red)", ...NUM }}>9 999 999 PM</b> : personne n&apos;a ça,
                donc elle ne te sert à rien tant qu&apos;elle n&apos;est pas au niveau 5. Et ce niveau, tu ne le choisis pas : elle se monte
                avec un joyau de chaque type — topaze, rubis, saphir, émeraude, diamant — et le niveau obtenu est tiré au hasard, plafonné à 5.
                Tant que le tirage n&apos;a pas donné 5, les joyaux sont dépensés pour rien.
              </span>
            </div>
          )}
        </>
      )}
    </>
  );
}

export default function ClassesPage() {
  useCardFx();
  const [cle, setCle] = useState(LIGNEES[0].cle);
  const lignee = ligneeDe(cle) ?? LIGNEES[0];
  const info = findClass(lignee.cle);

  // Le budget d'un palier rapporté au total. Le calcul vit ici et pas dans les
  // données : c'est une lecture, pas un fait du jeu.
  const partDe = (e: Etape) => Math.round((e.coutPoints / lignee.coutPoints) * 100);
  const gros = [...lignee.etapes].sort((a, b) => b.coutPoints - a.coutPoints)[0];

  // Les huit compétences de Héros regroupées PAR EFFET : c'est le regroupement
  // qui fait la démonstration, pas la liste alphabétique.
  const heros = LIGNEES.map((l) => ({ classe: l.nom, cle: l.cle, source: l.etapes[4].nom, c: l.heros }));
  const parEffet = new Map<string, typeof heros>();
  for (const h of heros) {
    const k = h.c.effets5.join(" · ");
    parEffet.set(k, [...(parEffet.get(k) ?? []), h]);
  }

  return (
    <div style={{ padding: "24px 18px 60px", maxWidth: 1120, margin: "0 auto" }}>
      <PageHeader icon="graduation" title="La chaîne de promotion"
        subtitle="Du vagabond à ta classe de fin : les six paliers que tu traverses, ce que chacun t'apprend, et lequel te coûte vraiment quelque chose." />

      {/* L'échelle complète, avant de parler d'une classe en particulier. */}
      <div className="glass-card fx-card" style={{ padding: "15px 18px", marginBottom: 16 }}>
        <div style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: 1, color: "var(--text-muted)", marginBottom: 10 }}>L&apos;échelle du jeu</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {([["vagabond", 1], ["metier1", 4], ["metier2", 8], ["maitre", 8], ["heros", 8], ["legendaire", 8]] as [Etape["palier"], number][]).map(([p, n], i) => (
            <span key={p} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              {i > 0 && <span aria-hidden style={{ color: "var(--text-muted)" }}>›</span>}
              <span style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 11px", borderRadius: 9, background: "var(--bg-2)",
                border: `1px solid color-mix(in srgb, ${PALIERS[p].couleur} 38%, var(--border))` }}>
                <Icon name={PALIERS[p].icon} size={14} style={{ color: PALIERS[p].couleur }} />
                <b style={{ fontSize: 12.5 }}>{PALIERS[p].nom}</b>
                <b style={{ fontSize: 12, color: "var(--text-muted)", ...NUM }}>×{n}</b>
              </span>
            </span>
          ))}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 10, lineHeight: 1.55 }}>
          Trente-sept classes sur ce chemin, un emblème officiel pour chacune. Le niveau maximum d&apos;un perso est {LIMITES.niveauMaxPersonnage} :
          le palier Héros s&apos;ouvre à {LIMITES.niveauMaxGeneral}, le légendaire à {LIMITES.niveauMaxLegendaire}.
        </div>
      </div>

      {/* Le choix de classe reprend le bouton du jeu, dans son propre état
          « choisi » — c'est le repère visuel que les joueurs ont déjà en tête. */}
      <div className="cl-choix">
        {LIGNEES.map((l) => {
          const on = l.cle === cle;
          const meta = CLASSES[l.cle];
          return (
            <button key={l.cle} onClick={() => setCle(l.cle)} className="cl-carte fx-card" aria-pressed={on}
              style={{ borderColor: on ? "var(--orange)" : "var(--border)", background: on ? "rgba(255,140,26,.09)" : "var(--bg-2)" }}>
              <ClassBouton name={l.cle} etat={on ? "choisi" : "repos"} size={44} />
              <span style={{ minWidth: 0, textAlign: "left" }}>
                <b style={{ display: "block", fontSize: 13.5, color: on ? "var(--orange)" : "var(--text)" }}>{l.nom}</b>
                <span style={{ display: "block", fontSize: 10.5, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px" }}>
                  {meta?.role === "tank" ? "Tank" : meta?.role === "support" ? "Soutien" : "Dégâts"} · via {l.etapes[1].nom}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <VoletSections
        defaut="lignee"
        entete={
          <>
            <EnteteVolet icon="graduation" titre={lignee.nom}
              marque={{ texte: `${lignee.nbCompetences} compétences`, couleur: "var(--purple)" }}
              sous={<>{info?.en} · <span style={NUM}>{fmt(lignee.coutPoints)}</span> points de compétence pour tout monter au maximum · code du jeu <code style={{ fontSize: 11.5 }}>{lignee.jobCode}</code></>} />
            <div className="glass-card fx-card" style={{ padding: "16px 18px", marginBottom: 16 }}>
              <Chaine lignee={lignee} />
            </div>
          </>
        }
        sections={[
          {
            clef: "lignee", titre: "Sa lignée", sous: "Ce que chaque palier t'apprend", icon: "path", compte: lignee.etapes.length, contenu: (
              <>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                    <thead>
                      <tr style={{ color: "var(--text-muted)", textTransform: "uppercase", fontSize: 10.5, letterSpacing: ".6px", borderBottom: "1px solid var(--border)" }}>
                        <th style={{ padding: "8px 8px 8px 0", textAlign: "left" }}>Palier</th>
                        <th style={{ padding: 8, textAlign: "right" }}>Compétences</th>
                        <th style={{ padding: 8, textAlign: "right" }}>Plafond</th>
                        <th style={{ padding: 8, textAlign: "right" }}>Sa dernière compétence</th>
                        <th style={{ padding: "8px 0 8px 8px", textAlign: "right" }}>Points au max</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lignee.etapes.map((e) => {
                        const p = PALIERS[e.palier];
                        return (
                          <tr key={e.nom} style={{ borderBottom: "1px solid rgba(46,46,56,.45)" }}>
                            <td style={{ padding: "9px 8px 9px 0" }}>
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={e.embleme} alt="" width={26} height={26} style={{ objectFit: "contain", flexShrink: 0 }} />
                                <span>
                                  <b style={{ display: "block" }}>{e.nom}</b>
                                  <span style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".5px", color: p.couleur, fontWeight: 700 }}>{p.nom}</span>
                                </span>
                              </span>
                            </td>
                            <td style={{ padding: 8, textAlign: "right", ...NUM }}>{e.nbCompetences}</td>
                            <td style={{ padding: 8, textAlign: "right", color: "var(--text-muted)", ...NUM }}>niv. {e.niveauMaxCompetence}</td>
                            <td style={{ padding: 8, textAlign: "right", color: e.niveauRequis ? "var(--text)" : "var(--text-muted)", ...NUM }}>{e.niveauRequis ? `niv. ${e.niveauRequis}` : "—"}</td>
                            <td style={{ padding: "8px 0 8px 8px", textAlign: "right", fontWeight: 700, color: "var(--gold)", ...NUM }}>{fmt(e.coutPoints)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 14, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.55 }}>
                  <Icon name="info" size={13} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>
                    La dernière colonne est le niveau que demande la compétence la plus tardive du palier — <b>pas</b> celui auquel tu obtiens la promotion :
                    le client ne contient nulle part les niveaux de promotion. Un tiret veut dire que le fichier inscrit 1 sur toutes les compétences du palier,
                    ce qui ne veut rien dire de plus.
                  </span>
                </div>
              </>
            )
          },
          {
            clef: "maitre", titre: "Le palier Maître", sous: `${lignee.etapes[3].nom} · niveau ${lignee.maitre.niveauRequis}`, icon: "medal", compte: 1, contenu: (
              <>
                <CartePalier c={lignee.maitre} mur={false} />
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 14, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.55 }}>
                  <Icon name="info" size={13} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>
                    La phrase entre guillemets est le texte du jeu, les chiffres viennent de sa table d&apos;effets. Quand les deux se contredisent —
                    le Chevalier Maître promet de la vitesse et donne de la Force et des PV —, ce sont les chiffres qui s&apos;appliquent.
                    Un seul Maître touche deux statistiques : celui du Chevalier.
                  </span>
                </div>
              </>
            )
          },
          {
            clef: "heros", titre: "Le palier Héros", sous: `${lignee.etapes[4].nom} · niveau ${lignee.heros.niveauRequis}`, icon: "trophy", compte: 1, contenu: (
              <CartePalier c={lignee.heros} mur={lignee.heros.coutPM.includes(PM_MUR)} />
            )
          },
          {
            clef: "legendaires", titre: "Ses légendaires", sous: "Le bout de la chaîne", icon: "crown", compte: lignee.legendaires.length, contenu: (
              <div style={{ display: "grid", gap: 10 }}>
                {lignee.legendaires.map((l) => (
                  <div key={l.nom} style={{ padding: "12px 14px", borderRadius: 11, background: "var(--bg-2)", border: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 9, flexWrap: "wrap", marginBottom: 7 }}>
                      <b style={{ fontSize: 14, color: "var(--purple)" }}>{l.nom}</b>
                      <Pastille texte={`niveau ${l.niveauRequis}`} couleur={l.niveauRequis < LIMITES.niveauMaxLegendaire ? "var(--green)" : "var(--text-muted)"}
                        titre={l.niveauRequis < LIMITES.niveauMaxLegendaire ? "Elle s'ouvre avant les autres légendaires" : undefined} />
                      {l.arme && <Pastille texte={l.arme} couleur="var(--blue)" />}
                      {l.zone && <Pastille texte={l.zone} couleur="var(--text-muted)" />}
                    </div>
                    <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: l.description ? 7 : 0 }}>
                      {l.degats5 && <span style={{ fontSize: 12.5, fontWeight: 700, padding: "4px 10px", borderRadius: 8, background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--red)", ...NUM }}>
                        {fmt(l.degats5[0])}–{fmt(l.degats5[1])} dégâts
                      </span>}
                      {l.effets5.map((e) => (
                        <span key={e} style={{ fontSize: 12.5, fontWeight: 700, padding: "4px 10px", borderRadius: 8, background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--green)", ...NUM }}>{e}</span>
                      ))}
                      {l.pm1 != null && <span style={{ fontSize: 12, padding: "4px 10px", borderRadius: 8, background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--text-muted)", ...NUM }}>
                        {fmt(l.pm1)} → {fmt(l.pm5 ?? l.pm1)} PM
                      </span>}
                      {l.rechargeS != null && <span style={{ fontSize: 12, padding: "4px 10px", borderRadius: 8, background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--text-muted)", ...NUM }}>
                        recharge {duree(l.rechargeS)}
                      </span>}
                    </div>
                    {l.description && <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5, margin: 0 }}>{l.description}</p>}
                  </div>
                ))}
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12, color: "var(--text-muted)", lineHeight: 1.55 }}>
                  <Icon name="info" size={13} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>
                    {/* L'exception du Primat n'existe que pour lui : la dire à tout le
                        monde ferait croire que chaque classe a son raccourci. */}
                    {(() => {
                      const tot = lignee.legendaires.filter((l) => l.niveauRequis < LIMITES.niveauMaxLegendaire);
                      return tot.length
                        ? <>Toutes demandent le niveau {LIMITES.niveauMaxLegendaire}, sauf « {tot[0].nom} » qui s&apos;ouvre dès {tot[0].niveauRequis} — {lignee.nom} est la seule classe à avoir ce raccourci. </>
                        : <>Toutes demandent le niveau {LIMITES.niveauMaxLegendaire}. </>;
                    })()}
                    Les chiffres sont ceux du niveau 5. Le client n&apos;a aucune valeur JcJ : les colonnes prévues pour ça sont vides sur les 2 500 lignes,
                    donc rien ici ne dit ce que ça fait sur un joueur.
                  </span>
                </div>
              </div>
            )
          },
          {
            clef: "budget", titre: "Le budget", sous: "Où partent tes points", icon: "coins", compte: null, contenu: (
              <>
                <div style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 14 }}>
                  Tout monter au maximum demande <b style={{ color: "var(--gold)", ...NUM }}>{fmt(lignee.coutPoints)} points</b> pour {lignee.nbCompetences} compétences.
                  À lui seul, le palier <b>{PALIERS[gros.palier].nom}</b> — {gros.nom} — en pèse <b style={{ color: "var(--orange)", ...NUM }}>{partDe(gros)} %</b> : les paliers de fin ne coûtent presque rien,
                  ce sont les compétences de métier — plafond niveau 20 — qui vident la réserve.
                </div>

                {/* Une seule teinte, la LONGUEUR porte la grandeur. */}
                <div style={{ display: "grid", gap: 8, marginBottom: 20 }}>
                  {lignee.etapes.map((e) => {
                    const pct = (e.coutPoints / lignee.coutPoints) * 100;
                    return (
                      <div key={e.nom} style={{ display: "grid", gridTemplateColumns: "minmax(120px,150px) 1fr auto", gap: 10, alignItems: "center" }}>
                        <span style={{ fontSize: 12, fontWeight: 600, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.nom}</span>
                        <span style={{ height: 10, background: "var(--bg-3)", borderRadius: 5, overflow: "hidden" }}>
                          <span style={{ display: "block", height: "100%", width: `${Math.max(pct, 0.4)}%`, background: "linear-gradient(90deg,#FFB552,#FF8C1A)", borderRadius: 5 }} />
                        </span>
                        <span style={{ fontSize: 11.5, color: "var(--text-muted)", minWidth: 92, textAlign: "right", ...NUM }}>{fmt(e.coutPoints)} · {pct < 1 ? "<1" : Math.round(pct)} %</span>
                      </div>
                    );
                  })}
                </div>

                <div style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: 1, color: "var(--text-muted)", marginBottom: 8 }}>Le prix d&apos;un palier de compétence</div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ color: "var(--text-muted)", textTransform: "uppercase", fontSize: 10.5, borderBottom: "1px solid var(--border)" }}>
                        <th style={{ padding: "7px 7px 7px 0", textAlign: "left" }}>Pour passer au niveau</th>
                        <th style={{ padding: 7, textAlign: "right" }}>Ce palier</th>
                        <th style={{ padding: "7px 0 7px 7px", textAlign: "right" }}>Depuis le début</th>
                      </tr>
                    </thead>
                    <tbody>
                      {XP_COMPETENCE.map((x) => {
                        // Les deux marches où le prix double : c'est là que se décide un build.
                        const saut = x.niveau === 11 || x.niveau === 19;
                        return (
                          <tr key={x.niveau} style={{ borderBottom: "1px solid rgba(46,46,56,.4)", background: saut ? "rgba(255,140,26,.07)" : "transparent" }}>
                            <td style={{ padding: "6px 7px 6px 0", fontWeight: saut ? 700 : 400, color: saut ? "var(--orange)" : "var(--text)", ...NUM }}>{x.niveau}</td>
                            <td style={{ padding: 7, textAlign: "right", ...NUM }}>{fmt(x.palier)}</td>
                            <td style={{ padding: "6px 0 6px 7px", textAlign: "right", color: "var(--text-muted)", ...NUM }}>{fmt(x.cumul)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 12, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.55 }}>
                  <Icon name="info" size={13} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>
                    Les deux lignes surlignées doublent de prix d&apos;un coup. Conséquence directe : monter deux compétences au niveau 10 coûte moins cher
                    qu&apos;une seule au niveau 13. La table est la même pour les huit classes, rien dans le client n&apos;indique de remise.
                  </span>
                </div>
              </>
            )
          },
        ]}
      />

      {/* La trouvaille transversale : elle ne se voit qu'en mettant les huit
          classes côte à côte, donc elle ne peut pas vivre dans le volet d'une
          seule classe. */}
      <div className="glass-card fx-card" style={{ padding: "18px 20px", marginTop: 18 }}>
        <div className="font-heading" style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 15.5, fontWeight: 700, marginBottom: 4 }}>
          <Icon name="eye" size={17} style={{ color: "var(--orange)" }} /> Huit noms, deux effets
        </div>
        <p style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.6, margin: "0 0 14px" }}>
          Chaque palier Héros a sa compétence, son nom et son icône. Au niveau 5, elles se rangent pourtant dans deux cases seulement :
          marquer la cible pour le physique, ou pour la magie. Si ta composition en aligne trois du même bord, la troisième ne rapporte rien.
        </p>
        <div className="cl-deux">
          {[...parEffet.entries()].map(([effet, membres]) => (
            <div key={effet} style={{ padding: "13px 15px", borderRadius: 12, background: "var(--bg-2)", border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--green)", marginBottom: 3, ...NUM }}>{effet}</div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 10 }}>{membres.length} compétence{membres.length > 1 ? "s" : ""} sur 8 · 60 s, recharge 120 s</div>
              <div style={{ display: "grid", gap: 6 }}>
                {membres.map((m) => (
                  <button key={m.cle} onClick={() => setCle(m.cle)} className="cl-lien">
                    {/* L'emblème officiel, pas le logo maison : sur cette carte on
                        parle des paliers du jeu, autant montrer ses dessins. */}
                    <ClassLogo name={m.cle} size={22} officiel />
                    <b style={{ fontSize: 12.5 }}>{m.c.nom}</b>
                    <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{m.source} → {m.classe}</span>
                    {m.c.coutPM.includes(PM_MUR)
                      ? <Pastille texte="mur PM 1-4" couleur="var(--red)" titre="9 999 999 PM aux niveaux 1 à 4" />
                      : <Pastille texte="jouable dès 1" couleur="var(--green)" titre="500 PM dès le niveau 1 — la seule des huit" />}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 14, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.55 }}>
          <Icon name="info" size={13} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>
            Sept de ces huit compétences coûtent 9 999 999 PM avant le niveau 5, et le niveau s&apos;obtient au tirage — un joyau de chaque type,
            résultat aléatoire plafonné à 5. Seule la « Marque de vulnérabilité » du Meneur Héros est utilisable dès le niveau 1.
          </span>
        </div>
      </div>

      <style>{`
        .cl-choix{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px;margin-bottom:18px}
        .cl-carte{display:flex;align-items:center;gap:11px;padding:9px 11px;border-radius:12px;border:1px solid var(--border);cursor:pointer;font-family:inherit;color:var(--text);transition:border-color .15s,background .15s}
        .cl-carte:hover{border-color:var(--orange)}
        .cl-chaine{display:flex;flex-wrap:wrap;gap:4px;align-items:stretch}
        .cl-maille{display:flex;align-items:center;gap:4px}
        .cl-fleche{color:var(--text-muted);font-size:17px;padding:0 2px}
        .cl-marche{display:flex;flex-direction:column;align-items:center;gap:3px;width:112px;padding:10px 6px;border-radius:11px;background:var(--bg-2);border:1px solid var(--border)}
        .cl-deux{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px}
        /* Le tableau de la lignée débordait la page sur téléphone, MALGRÉ son
           enveloppe en overflow-x:auto. La cause n'est pas le tableau : les deux
           enfants de .vg-volet sont des éléments de grille, et un élément de
           grille garde min-width:auto — donc la colonne s'élargissait au
           min-content du tableau (410 px) au lieu de laisser l'enveloppe défiler.
           On ne peut pas le corriger dans VoletSections d'ici, alors on le pose
           tant que cette page est montée. */
        .vg-volet>div{min-width:0}
        .cl-lien{display:flex;align-items:center;gap:9px;flex-wrap:wrap;width:100%;text-align:left;padding:8px 11px;border-radius:9px;background:var(--bg-3);border:1px solid var(--border);color:var(--text);font-family:inherit;cursor:pointer;transition:border-color .15s}
        .cl-lien:hover{border-color:var(--orange)}
        /* Sous 560 px la chaîne devient une colonne : six tuiles de 112 px et
           cinq flèches ne rentrent pas, et les rogner rendait les emblèmes
           illisibles. */
        @media(max-width:560px){
          .cl-chaine{flex-direction:column}
          .cl-maille{width:100%}
          .cl-marche{flex:1;flex-direction:row;justify-content:flex-start;width:auto;text-align:left}
          .cl-fleche{transform:rotate(90deg)}
        }
      `}</style>
    </div>
  );
}
