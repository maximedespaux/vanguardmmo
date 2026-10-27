"use client";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { Debrief } from "@/components/chambres/Debrief";
import { fmtDuree, type Ecart } from "@/lib/chambres";

/**
 * L'ONGLET BILANS de /compositions (spec §4.8, §7.5 ; lots 2 et 6) — la liste des séances, leurs
 * débriefs et les participations.
 *
 * Un clic sur une séance ouvre son DÉBRIEF (Debrief.tsx) : ce que lit un membre une fois publié,
 * et pour le staff le parcours étape par étape. La ligne dit le résultat, le temps retenu par le
 * débrief (la mesure du chrono, ou sa correction), l'écart à la séance publiée juste avant, et
 * où en est le débrief, et combien de vidéos y sont jointes (lot 8 : un membre ne les compte
 * qu'une fois le débrief publié).
 *
 * Le staff voit qui était là, séance par séance, et le classement des participations ; un membre
 * voit sa propre ligne, et des autres seulement des nombres (la route ne lui envoie rien d'autre),
 * puis, dans un débrief publié, les joueurs et leurs chiffres DÉCLARÉS le soir de la clôture.
 *
 * LE FILTRE « GUILD SIEGE » (lot 9, §11.2) : ses séances, ses victoires et ses participations,
 * comptées à part. Un lien vers une séance du siège (`&seance=gs_…`) ouvre ce filtre de lui-même.
 */

type LigneSeance = {
  cle: string; date: string; label: string; annulee: boolean; motif: string | null;
  cloturee: boolean; clotureAt: number | null; resultat: string | null; total: number | null; partiel?: boolean; chronoEnCours?: boolean;
  ecart: Ecart | null; record: boolean;
  presents: number | null; absents: number | null; joueursImport: number | null; importe: boolean; publie: boolean; videos: number;
  /** Guild Siege pas encore clôturé : combien se sont annoncés. */
  annonces?: number | null;
  debrief: "publie" | "brouillon" | "a_faire" | null;
  moi: { present: boolean; pseudos: string[] } | null;
};
type Joueur = { joueur: string; persos: string[]; joues: number; absences: number; dates: string[]; absentLe: string[] };
type Historique = { seances: LigneSeance[]; cloturees: number; bilan: { victoires: number; defaites: number }; participations?: Joueur[]; moi: Joueur | null };

const court = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("fr-FR", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" });
};
const jj = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;

/** L'état du débrief, tel que la colonne le dit. */
const ETAT_DEBRIEF: Record<NonNullable<LigneSeance["debrief"]>, { texte: string; couleur: string }> = {
  publie: { texte: "publié", couleur: "var(--green)" },
  brouillon: { texte: "brouillon", couleur: "var(--gold)" },
  a_faire: { texte: "à faire", couleur: "var(--gn-crimson-texte)" },
};

export function Bilans({ isAdmin, seanceOuverte, videoOuverte = null, parcours = false, onCloturer, rafraichir }: {
  isAdmin: boolean; seanceOuverte: string | null;
  /** `&video={id}` (le lien d'une vidéo dans le débrief Discord) : son lecteur s'ouvre d'emblée. */
  videoOuverte?: string | null;
  /** Ouvrir la séance demandée directement sur le parcours du débrief (après la clôture). */
  parcours?: boolean;
  /** « Ils étaient là » : sans clé, la dernière séance commencée ; avec, celle-là. */
  onCloturer: (cle?: string) => void; rafraichir: number;
}) {
  const [h, setH] = useState<Historique | null>(null);
  const [panne, setPanne] = useState(false);
  const [ouverte, setOuverte] = useState<string | null>(seanceOuverte);
  /** Chambres ou Guild Siege : la séance demandée par l'adresse choisit le filtre. */
  const [ev, setEv] = useState<"cs" | "gs">(seanceOuverte?.startsWith("gs_") ? "gs" : "cs");

  const charger = useCallback(() => {
    fetch(`/api/seances/historique?evenement=${ev}&limite=30`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j: Historique) => { setH(j); setPanne(false); })
      .catch(() => setPanne(true));
  }, [ev]);
  useEffect(() => { charger(); }, [charger, rafraichir]);
  useEffect(() => {
    if (!seanceOuverte) return;
    setOuverte(seanceOuverte);
    setEv(seanceOuverte.startsWith("gs_") ? "gs" : "cs");
  }, [seanceOuverte]);
  const filtrer = (x: "cs" | "gs") => { if (x !== ev) { setEv(x); setH(null); setOuverte(null); } };

  const card: React.CSSProperties = { background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 14, padding: 22, marginBottom: 18 };
  const titre: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, color: "var(--gn-accent)", textTransform: "uppercase", fontSize: 15, letterSpacing: 1, margin: 0 };

  return (
    <>
      {/* Le filtre : les onglets de la page (.vg-subtabs), en petit, au-dessus des bilans. */}
      <div className="vg-subtabs gn-cs-onglets gn-bilans-filtre" role="tablist" aria-label="Événement">
        <button type="button" role="tab" aria-selected={ev === "cs"} className={`vg-subtab ${ev === "cs" ? "active" : ""}`} onClick={() => filtrer("cs")}><Icon name="key" size={14} />Chambres Secrètes</button>
        <button type="button" role="tab" aria-selected={ev === "gs"} className={`vg-subtab ${ev === "gs" ? "active" : ""}`} onClick={() => filtrer("gs")}><Icon name="swords" size={14} />Guild Siege</button>
      </div>
      <div className="fx-card" style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
          <h2 className="font-heading" style={titre}><Icon name="trophy" size={17} />{ev === "gs" ? "Bilans du Guild Siege" : "Bilans des Chambres"}</h2>
          {h && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{h.bilan.victoires} victoire{h.bilan.victoires > 1 ? "s" : ""} · {h.bilan.defaites} défaite{h.bilan.defaites > 1 ? "s" : ""} (selon les débriefs)</span>}
          {isAdmin && (
            <button type="button" onClick={() => onCloturer(ev === "gs" ? "gs_derniere" : undefined)} style={{ marginLeft: "auto", fontSize: 11.5, fontWeight: 600, padding: "7px 12px", borderRadius: 8, cursor: "pointer", border: "1px solid var(--gold)", background: "transparent", color: "var(--gold)", display: "inline-flex", alignItems: "center", gap: 5 }}>
              <Icon name="medal" size={12} />Ils étaient là
            </button>
          )}
        </div>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14 }}>
          {ev === "gs"
            ? <>Chaque Guild Siege, son résultat et qui était là. Ouvre une séance pour lire son débrief{isAdmin ? " — ou le faire" : ""} : résultat, à retenir et vidéos.</>
            : <>Chaque séance, son résultat et son temps ; l&apos;écart se mesure à la séance publiée juste avant. Ouvre une séance pour lire son débrief, étape par étape{isAdmin ? " — ou le faire" : ""}.</>}
        </p>

        {panne && <div className="gn-panne"><Icon name="alert" size={14} style={{ flexShrink: 0 }} />L&apos;historique n&apos;a pas pu être lu.</div>}
        {!h && !panne && <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Chargement…</div>}
        {h && h.seances.length === 0 && (
          <div style={{ fontSize: 13, color: "var(--text-muted)", padding: "18px 0", textAlign: "center" }}>
            {ev === "gs" ? "Aucun Guild Siege enregistré pour l'instant" : "Aucune séance enregistrée pour l'instant"}{isAdmin ? " — « Ils étaient là » clôture la dernière." : "."}
          </div>
        )}
        {h && ouverte && !h.seances.some((x) => x.cle === ouverte) && (
          /* Une séance demandée par l'adresse (`/chambre debrief`, la clôture) qui n'a pas encore de
             ligne en base : rien n'y a été fait. Son débrief s'ouvre quand même, pour le faire. */
          <div className="gn-bilan-detail" style={{ marginBottom: 12 }}>
            <Debrief key={`${ouverte}:${rafraichir}`} cle={ouverte} isAdmin={isAdmin} parcoursInitial={parcours && ouverte === seanceOuverte}
              videoInitiale={ouverte === seanceOuverte ? videoOuverte : null} onChange={charger} onCloturer={(c) => onCloturer(c)} />
          </div>
        )}
        {h && h.seances.length > 0 && (
          <div style={{ display: "grid", gap: 6 }}>
            <div className="gn-bilan-ligne gn-bilan-tete" aria-hidden="true">
              <span>Date</span><span className="gn-bilan-sec">Résultat</span><span className="gn-bilan-sec">Temps</span><span className="gn-bilan-sec">Écart</span><span>Présents</span><span className="gn-bilan-sec">Vidéos</span><span className="gn-bilan-sec">Débrief</span><span />
            </div>
            {h.seances.map((s) => {
              const ouv = ouverte === s.cle;
              return (
                <div key={s.cle}>
                  <button type="button" className={`gn-bilan-ligne${ouv ? " ouverte" : ""}`} onClick={() => setOuverte(ouv ? null : s.cle)} aria-expanded={ouv}>
                    <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                      <b style={{ textTransform: "capitalize" }}>{court(s.date)}</b>
                      {s.moi && <span style={{ fontSize: 11.5, color: s.moi.present ? "var(--green)" : "var(--gn-crimson-texte)" }}>{s.moi.present ? "tu y étais" : "annoncé·e, absent·e"} ({s.moi.pseudos.join(", ")})</span>}
                    </span>
                    <span className="gn-bilan-sec">{s.annulee ? <span style={{ color: "var(--text-muted)" }}>annulée</span> : s.resultat === "gagne" ? <b style={{ color: "var(--green)" }}>GAGNÉ</b> : s.resultat === "perdu" ? <b style={{ color: "var(--gn-crimson-texte)" }}>PERDU</b> : "—"}</span>
                    {/* Le temps retenu par le débrief (la mesure du chrono, ou sa correction, lot 6) ;
                        « partiel » : une étape au moins n'a pas de chrono. */}
                    <span className="gn-bilan-sec" style={{ fontVariantNumeric: "tabular-nums" }} title={s.total ? `Somme des chronos de chaque étape${s.partiel ? " — il en manque au moins un" : ""}` : undefined}>
                      {s.chronoEnCours ? <span style={{ color: "var(--gn-accent)" }}>en cours</span> : s.total ? `${fmtDuree(s.total)}${s.partiel ? " (partiel)" : ""}` : "—"}
                    </span>
                    {/* Pas de `display` en ligne sur la cellule : il l'emporterait sur le `display:none`
                        de .gn-bilan-sec, et la colonne resterait sur téléphone. */}
                    <span className="gn-bilan-sec" style={{ fontVariantNumeric: "tabular-nums" }}>
                      {s.ecart ? <span className={`gn-deb-ecart ${s.ecart.signe < 0 ? "plus-rapide" : s.ecart.signe > 0 ? "plus-lent" : "egal"}`}>{s.ecart.texte}</span> : "—"}
                      {s.record && <span title="Nouveau record de temps total" style={{ color: "var(--gn-accent)", display: "inline-flex", verticalAlign: "-2px", marginLeft: 5 }}><Icon name="medal" size={13} /></span>}
                    </span>
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>
                      {s.cloturee ? s.presents
                        : s.joueursImport ? <span title="Le nombre du débrief importé : la liste des joueurs n'a pas été gardée">{s.joueursImport} <span style={{ color: "var(--text-muted)", fontSize: 11.5 }}>(import)</span></span>
                          : s.annonces ? <span title="Annoncés : la clôture dira qui était là">{s.annonces} <span style={{ color: "var(--text-muted)", fontSize: 11.5 }}>annoncé{s.annonces > 1 ? "s" : ""}</span></span>
                            : <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{s.annulee ? "—" : "pas clôturée"}</span>}
                    </span>
                    {/* Les vidéos jointes au débrief (lot 8) : prêtes seulement, et pour un membre
                        une fois le débrief publié — la route ne lui en compte pas d'autres. */}
                    <span className="gn-bilan-sec" style={{ fontVariantNumeric: "tabular-nums", color: s.videos ? "var(--text)" : "var(--text-muted)" }}>
                      {s.videos ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="video" size={12} style={{ color: "var(--gn-accent)" }} />{s.videos}</span> : "—"}
                    </span>
                    <span className="gn-bilan-sec" style={{ fontSize: 12, color: s.debrief ? ETAT_DEBRIEF[s.debrief].couleur : "var(--text-muted)" }}>{s.debrief ? ETAT_DEBRIEF[s.debrief].texte : "—"}</span>
                    <span style={{ color: "var(--text-muted)", display: "flex", transform: ouv ? "rotate(90deg)" : "none", transition: "transform .15s" }}><Icon name="chevron-right" size={14} /></span>
                  </button>
                  {ouv && (
                    <div className="gn-bilan-detail">
                      <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
                        {s.label}
                        {s.annulee && ` · annulée${s.motif ? ` — ${s.motif}` : ""}`}
                        {s.cloturee && s.clotureAt ? ` · clôturée le ${new Date(s.clotureAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}` : ""}
                        {s.cloturee && ` · ${s.presents} présent${(s.presents ?? 0) > 1 ? "s" : ""}${s.absents ? `, ${s.absents} absent${s.absents > 1 ? "s" : ""}` : ""}`}
                      </div>
                      {/* Le débrief, et les joueurs avec leurs chiffres figés à la clôture. La clé suit
                          `rafraichir` : une clôture faite depuis ce débrief (« Ils étaient là ») le relit,
                          et « Faire le débrief maintenant » l'ouvre sur son parcours, même déjà ouvert. */}
                      <Debrief key={`${s.cle}:${rafraichir}`} cle={s.cle} isAdmin={isAdmin} parcoursInitial={parcours && s.cle === seanceOuverte}
                        videoInitiale={s.cle === seanceOuverte ? videoOuverte : null} onChange={charger} onCloturer={(c) => onCloturer(c)} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {h && (
        <div className="fx-card" style={card}>
          <h2 className="font-heading" style={{ ...titre, marginBottom: 10 }}><Icon name="user-check" size={17} />Mes participations{ev === "gs" ? " au Guild Siege" : ""}</h2>
          {h.moi ? (
            <div style={{ fontSize: 13, lineHeight: 1.7 }}>
              <b>{h.moi.joues}</b> séance{h.moi.joues > 1 ? "s" : ""} jouée{h.moi.joues > 1 ? "s" : ""} sur {h.cloturees} clôturée{h.cloturees > 1 ? "s" : ""}
              {h.moi.persos.length ? <span style={{ color: "var(--text-muted)" }}> · avec {h.moi.persos.join(", ")}</span> : null}
              {h.moi.dates.length > 0 && <div style={{ color: "var(--text-muted)", fontSize: 12.5 }}>Jouées : {h.moi.dates.map(jj).join(" · ")}</div>}
              {h.moi.absentLe.length > 0 && <div style={{ color: "var(--gn-crimson-texte)", fontSize: 12.5 }}>Annoncé·e mais absent·e : {h.moi.absentLe.map(jj).join(" · ")}</div>}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Aucune participation enregistrée pour l&apos;instant : elles comptent à la clôture de chaque séance.</div>
          )}
        </div>
      )}

      {isAdmin && h?.participations && (
        <div className="fx-card" style={card}>
          <h2 className="font-heading" style={{ ...titre, marginBottom: 4 }}><Icon name="users" size={17} />Participations de la guilde{ev === "gs" ? " au Guild Siege" : ""}</h2>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>{h.cloturees > 1 ? `Sur les ${h.cloturees} dernières séances clôturées` : h.cloturees === 1 ? "Sur la dernière séance clôturée" : "Aucune séance clôturée pour l'instant"} · réservé au staff.</p>
          {h.participations.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Personne encore.</div>
          ) : (
            <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 4, fontSize: 13 }}>
              {h.participations.map((j, i) => (
                <li key={j.joueur + j.persos.join()}>
                  <span style={{ color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{i + 1}.</span> <b>{j.joueur}</b> <span style={{ fontVariantNumeric: "tabular-nums" }}>{j.joues}</span>
                  <span style={{ color: "var(--text-muted)" }}> · {j.persos.join(", ")}</span>
                  {j.absences > 0 && <span style={{ color: "var(--gn-crimson-texte)" }}> · {j.absences} absence{j.absences > 1 ? "s" : ""} ({j.absentLe.map(jj).join(", ")})</span>}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </>
  );
}
