"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/Icon";
import { ClassLogo } from "@/components/ClassLogo";

/**
 * Un pseudo qui s'ouvre.
 *
 * Un nom seul ne dit rien : recrue arrivée hier, ou vétéran qui a livré trente
 * quêtes ? On acceptait une demande, on choisissait un détenteur, on validait
 * une contribution — sans jamais pouvoir vérifier à qui on avait affaire, sinon
 * en fouillant trois pages. Partout où un pseudo s'affiche, il se clique
 * maintenant, et sa fiche s'ouvre : depuis quand il est là, ses personnages, ce
 * qu'il a demandé et ce qu'il a rendu.
 */
type Fiche = {
  nom: string; avatar: string | null; role: string; actif: boolean;
  rejointLe: string; vuLe: string | null; niveau: number; xp: number;
  personnages: { nom: string; classe: string; niveau: number; prestige: number; principal: boolean }[];
  bilan: {
    achats: Etat; requetes: Etat;
    quetesOuvertes: number; quetesLivrees: number;
    apports: number; quantiteApportee: number; fournitures: number;
  };
  /** Le volet marchand — renvoyé par le serveur au staff seulement. */
  staff: { ventes: number; perinsEncaisses: number; airpointsEncaisses: number; ventesEnCours: number; achatsACredit: number } | null;
  /** Ce qu'il y a derrière chaque chiffre : un clic doit répondre à « lesquels ? ». */
  detail: {
    achats: LigneDetail[]; requetes: LigneDetail[];
    apports: { quete: string; quantite: number; date: string }[];
    fournitures: { item: string; quantite: number; pour: string; date: string; prix?: number; prixAp?: number }[];
  };
};
type LigneDetail = { item: string; quantite: number; statut: string; enQuete: boolean; date: string };

/** Les statuts de demande, dits comme on en parle. */
const STATUT: Record<string, { l: string; c: string }> = {
  REMIS: { l: "reçu", c: "var(--green)" },
  PENDING: { l: "en attente", c: "var(--gold)" },
  ACCEPTE_ACHAT: { l: "accepté", c: "var(--gold)" },
  ACCEPTE_DETTE: { l: "accepté à crédit", c: "var(--gold)" },
  EN_ECHANGE: { l: "en cours d'échange", c: "var(--gold)" },
  ANNULE: { l: "annulé", c: "var(--red)" },
  REFUSE: { l: "refusé", c: "var(--red)" },
};

const RANG: Record<string, { label: string; couleur: string }> = {
  DIRECTION: { label: "Direction", couleur: "var(--red)" },
  VANGUARD: { label: "Vanguard", couleur: "var(--gold)" },
  GENERAL: { label: "Général", couleur: "var(--orange)" },
  OFFICIER: { label: "Officier", couleur: "var(--orange)" },
  VETERAN: { label: "Vétéran", couleur: "var(--blue)" },
  GUARD: { label: "Guard", couleur: "var(--blue)" },
  RECRUE: { label: "Recrue", couleur: "var(--text-muted)" },
};

const jour = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
/** « depuis 4 mois » : la durée compte plus que la date exacte. */
function depuis(iso: string): string {
  const j = Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);
  if (j < 1) return "aujourd'hui";
  if (j < 31) return `depuis ${j} jour${j > 1 ? "s" : ""}`;
  const m = Math.floor(j / 30.4);
  if (m < 12) return `depuis ${m} mois`;
  const an = Math.floor(m / 12);
  return `depuis ${an} an${an > 1 ? "s" : ""}`;
}
const vu = (iso: string | null) => {
  if (!iso) return "jamais vu sur le site";
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 5) return "en ligne";
  if (min < 60) return `vu il y a ${min} min`;
  const h = Math.round(min / 60);
  return h < 48 ? `vu il y a ${h} h` : `vu il y a ${Math.round(h / 24)} j`;
};

type Etat = { total: number; remis: number; enCours: number; clos: number; enQuete: number };

/** « 3 reçus · 1 en cours · 1 annulé » — le compte seul ne dit pas s'il a abouti. */
function statuts(e: Etat): { texte: string; couleur: string }[] {
  const l: { texte: string; couleur: string }[] = [];
  if (e.remis) l.push({ texte: `${e.remis} reçu${e.remis > 1 ? "s" : ""}`, couleur: "var(--green)" });
  if (e.enCours) l.push({ texte: `${e.enCours} en cours`, couleur: "var(--gold)" });
  if (e.clos) l.push({ texte: `${e.clos} abandonné${e.clos > 1 ? "s" : ""}`, couleur: "var(--red)" });
  return l;
}

const jourCourt = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

/**
 * Le chiffre se clique et le détail se déplie dessous.
 *
 * « 5 achats » ne dit pas lesquels, et il fallait quitter la fiche pour le
 * savoir. Le repli garde la fiche compacte tant qu'on ne demande rien.
 */
function Repliable({ n, ouvert, onToggle, enfants, children }: {
  n: number; ouvert: boolean; onToggle: () => void; enfants: number; children: React.ReactNode;
}) {
  const cliquable = n > 0 && enfants > 0;
  return (
    <>
      <div
        role={cliquable ? "button" : undefined} tabIndex={cliquable ? 0 : undefined}
        onClick={cliquable ? onToggle : undefined}
        onKeyDown={cliquable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } } : undefined}
        title={cliquable ? (ouvert ? "Masquer le détail" : "Voir le détail") : undefined}
        style={{ display: "flex", alignItems: "baseline", gap: 9, flexWrap: "wrap", cursor: cliquable ? "pointer" : undefined }}>
        {children}
        {cliquable && (
          <Icon name="chevron-right" size={12}
            style={{ color: "var(--text-muted)", alignSelf: "center", transform: ouvert ? "rotate(90deg)" : "none", transition: "transform .15s" }} />
        )}
      </div>
    </>
  );
}

/** Une ligne du détail : ce que c'est, combien, quand — et où ça en est. */
function LigneRepli({ titre, quantite, date, note, noteCouleur }: {
  titre: string; quantite?: number; date: string; note?: string; noteCouleur?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 7, fontSize: 11.5, padding: "3px 0", flexWrap: "wrap", minWidth: 0 }}>
      {quantite !== undefined && quantite > 1 && <span style={{ color: "var(--text-muted)", flexShrink: 0 }}>{quantite} ×</span>}
      <span style={{ flex: "1 1 120px", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{titre}</span>
      {note && <span style={{ color: noteCouleur ?? "var(--text-muted)", flexShrink: 0 }}>{note}</span>}
      <span style={{ color: "var(--text-muted)", opacity: .75, flexShrink: 0 }}>{jourCourt(date)}</span>
    </div>
  );
}

function Repli({ children, total, montres }: { children: React.ReactNode; total: number; montres: number }) {
  return (
    <div style={{ marginTop: 7, paddingTop: 7, borderTop: "1px dashed var(--border)", display: "grid" }}>
      {children}
      {total > montres && (
        <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 4, fontStyle: "italic" }}>
          … et {total - montres} de plus
        </div>
      )}
    </div>
  );
}

const etiquetteBilan: React.CSSProperties = { fontSize: 10, textTransform: "uppercase", letterSpacing: .8, color: "var(--text-muted)", fontWeight: 700, marginBottom: 6 };

function Chiffre({ n, label, couleur, onClick, ouvert }: { n: number; label: string; couleur?: string; onClick?: () => void; ouvert?: boolean }) {
  return (
    <div style={{ minWidth: 0, cursor: onClick ? "pointer" : undefined }}
      role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
      title={onClick ? (ouvert ? "Masquer le détail" : "Voir le détail") : undefined}>
      <div className="font-heading" style={{ fontSize: 19, fontWeight: 700, color: couleur ?? "var(--text)", display: "flex", alignItems: "center", gap: 5 }}>
        {n}
        {onClick && <Icon name="chevron-right" size={11} style={{ color: "var(--text-muted)", transform: ouvert ? "rotate(90deg)" : "none", transition: "transform .15s" }} />}
      </div>
      <div style={{ fontSize: 10.5, color: "var(--text-muted)", lineHeight: 1.3 }}>{label}</div>
    </div>
  );
}

export function FicheJoueur({ nom, onClose }: { nom: string; onClose: () => void }) {
  const [f, setF] = useState<Fiche | null>(null);
  const [erreur, setErreur] = useState("");
  /** La rubrique dépliée, s'il y en a une : une seule à la fois, la fiche reste lisible. */
  const [replie, setReplie] = useState<string | null>(null);
  const bascule = (k: string) => setReplie((v) => (v === k ? null : k));

  useEffect(() => {
    let vivant = true;
    fetch(`/api/membres/${encodeURIComponent(nom)}`)
      .then(async (r) => (r.ok ? r.json() : Promise.reject(new Error((await r.json().catch(() => ({}))).error ?? "Fiche indisponible."))))
      .then((d) => { if (vivant) setF(d); })
      .catch((e) => { if (vivant) setErreur(e instanceof Error ? e.message : "Fiche indisponible."); });
    return () => { vivant = false; };
  }, [nom]);

  const rang = RANG[f?.role ?? ""] ?? RANG.RECRUE;

  // Monté sur le body : les cartes du site s'inclinent au survol (transform), et
  // un position:fixed se cale alors sur la carte au lieu de l'écran — la fiche
  // se retrouvait enfermée dedans, coupée à mi-hauteur.
  const [pret, setPret] = useState(false);
  useEffect(() => setPret(true), []);
  if (!pret) return null;

  return createPortal(
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} className="glass-card" style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 20px 22px", maxWidth: 460, width: "100%", maxHeight: "86vh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {f?.avatar
            ? <img src={f.avatar} alt="" style={{ width: 46, height: 46, borderRadius: "50%", border: `2px solid ${rang.couleur}` }} />
            : <div style={{ width: 46, height: 46, borderRadius: "50%", border: "1px solid var(--border)", background: "var(--bg-3)", display: "grid", placeItems: "center", color: "var(--text-muted)", flexShrink: 0 }}><Icon name="user" size={20} /></div>}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="font-heading" style={{ fontSize: 17, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f?.nom ?? nom}</div>
            <div style={{ fontSize: 11.5, display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
              <span style={{ color: rang.couleur, fontWeight: 700, textTransform: "uppercase", letterSpacing: .5 }}>{rang.label}</span>
              {f && <span style={{ color: "var(--text-muted)" }}>· niveau {f.niveau}</span>}
              {f && <span style={{ color: vu(f.vuLe) === "en ligne" ? "var(--green)" : "var(--text-muted)" }}>· {vu(f.vuLe)}</span>}
            </div>
          </div>
          <button onClick={onClose} aria-label="Fermer" style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 2, display: "flex" }}><Icon name="x" size={17} /></button>
        </div>

        {erreur && <div style={{ fontSize: 12.5, color: "var(--red)" }}>{erreur}</div>}
        {!f && !erreur && <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Chargement…</div>}

        {f && (
          <>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="calendar" size={12} />
              Dans la guilde {depuis(f.rejointLe)} <span style={{ opacity: .7 }}>· arrivé le {jour(f.rejointLe)}</span>
            </div>

            {/* Ce qu'il prend d'un côté, ce qu'il rend de l'autre — et le détail
                des statuts, parce que « 5 demandes » ne dit pas si elles ont
                abouti, ni si elles sont encore sur le feu. */}
            <div style={{ display: "grid", gap: 11, padding: "12px 14px", borderRadius: 11, background: "var(--bg-3)", border: "1px solid var(--border)", marginBottom: 14 }}>
              <div>
                <div style={etiquetteBilan}>Ce qu&apos;il a acheté <span style={{ opacity: .7 }}>· boutique</span></div>
                <Repliable n={f.bilan.achats.total} ouvert={replie === "achats"} onToggle={() => bascule("achats")} enfants={f.detail.achats.length}>
                  <span className="font-heading" style={{ fontSize: 19, fontWeight: 700 }}>{f.bilan.achats.total}</span>
                  <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>achat{f.bilan.achats.total > 1 ? "s" : ""}</span>
                  {statuts(f.bilan.achats).map((d) => <span key={d.texte} style={{ fontSize: 11.5, color: d.couleur }}>· {d.texte}</span>)}
                  {!f.bilan.achats.total && <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>— rien pour l&apos;instant</span>}
                </Repliable>
                {replie === "achats" && (
                  <Repli total={f.bilan.achats.total} montres={f.detail.achats.length}>
                    {f.detail.achats.map((l, i) => (
                      <LigneRepli key={i} titre={l.item} quantite={l.quantite} date={l.date}
                        note={(STATUT[l.statut] ?? { l: l.statut }).l} noteCouleur={STATUT[l.statut]?.c} />
                    ))}
                  </Repli>
                )}
              </div>
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                <div style={etiquetteBilan}>Ce qu&apos;il a demandé <span style={{ opacity: .7 }}>· requêtes objet</span></div>
                <Repliable n={f.bilan.requetes.total} ouvert={replie === "requetes"} onToggle={() => bascule("requetes")} enfants={f.detail.requetes.length}>
                  <span className="font-heading" style={{ fontSize: 19, fontWeight: 700 }}>{f.bilan.requetes.total}</span>
                  <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>requête{f.bilan.requetes.total > 1 ? "s" : ""}</span>
                  {statuts(f.bilan.requetes).map((d) => <span key={d.texte} style={{ fontSize: 11.5, color: d.couleur }}>· {d.texte}</span>)}
                  {!f.bilan.requetes.total && <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>— rien pour l&apos;instant</span>}
                </Repliable>
                {replie === "requetes" && (
                  <Repli total={f.bilan.requetes.total} montres={f.detail.requetes.length}>
                    {f.detail.requetes.map((l, i) => (
                      <LigneRepli key={i} titre={l.item + (l.enQuete ? " · passée en quête" : "")} quantite={l.quantite} date={l.date}
                        note={(STATUT[l.statut] ?? { l: l.statut }).l} noteCouleur={STATUT[l.statut]?.c} />
                    ))}
                  </Repli>
                )}
                {f.bilan.requetes.enQuete > 0 && (
                  <div style={{ fontSize: 11, color: "var(--purple)", marginTop: 3, display: "flex", alignItems: "center", gap: 5 }}>
                    <Icon name="target" size={11} />dont {f.bilan.requetes.enQuete} passée{f.bilan.requetes.enQuete > 1 ? "s" : ""} en quête de guilde
                  </div>
                )}
                {f.bilan.quetesOuvertes > 0 && (
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3, display: "flex", alignItems: "center", gap: 5 }}>
                    <Icon name="target" size={11} />
                    {f.bilan.quetesOuvertes} quête{f.bilan.quetesOuvertes > 1 ? "s" : ""} de guilde ouverte{f.bilan.quetesOuvertes > 1 ? "s" : ""}
                    {f.bilan.quetesLivrees > 0 && <span style={{ color: "var(--green)" }}>· {f.bilan.quetesLivrees} livrée{f.bilan.quetesLivrees > 1 ? "s" : ""}</span>}
                  </div>
                )}
              </div>
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                <div style={etiquetteBilan}>Ce qu&apos;il a rendu</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,140px),1fr))", gap: 8 }}>
                  <Chiffre n={f.bilan.apports} couleur={f.bilan.apports ? "var(--orange)" : undefined}
                    onClick={f.detail.apports.length ? () => bascule("apports") : undefined} ouvert={replie === "apports"}
                    label={`quête${f.bilan.apports > 1 ? "s" : ""} aidée${f.bilan.apports > 1 ? "s" : ""}${f.bilan.quantiteApportee ? ` · ${f.bilan.quantiteApportee} objets` : ""}`} />
                  <Chiffre n={f.bilan.fournitures} label="objets fournis à un membre" couleur={f.bilan.fournitures ? "var(--orange)" : undefined}
                    onClick={f.detail.fournitures.length ? () => bascule("fournitures") : undefined} ouvert={replie === "fournitures"} />
                </div>
                {replie === "apports" && (
                  <Repli total={f.bilan.apports} montres={f.detail.apports.length}>
                    {f.detail.apports.map((l, i) => <LigneRepli key={i} titre={l.quete} quantite={l.quantite} date={l.date} />)}
                  </Repli>
                )}
                {replie === "fournitures" && (
                  <Repli total={f.bilan.fournitures} montres={f.detail.fournitures.length}>
                    {f.detail.fournitures.map((l, i) => (
                      <LigneRepli key={i} titre={l.item} quantite={l.quantite} date={l.date}
                        note={`pour ${l.pour}${l.prix ? ` · ${l.prix.toLocaleString("fr-FR")} périns` : ""}${l.prixAp ? ` · ${l.prixAp.toLocaleString("fr-FR")} AP` : ""}`} />
                    ))}
                  </Repli>
                )}
              </div>
            </div>

            {/* Réservé au staff — le serveur ne l'envoie même pas aux autres. */}
            {f.staff && (
              <div style={{ display: "grid", gap: 7, padding: "11px 14px", borderRadius: 11, background: "rgba(255,210,74,.06)", border: "1px solid rgba(255,210,74,.35)", marginBottom: 14 }}>
                <div style={{ ...etiquetteBilan, color: "var(--gold)", marginBottom: 0, display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon name="shield" size={12} />Réservé au staff
                </div>
                {/* La demande de Maxime : pouvoir cliquer et savoir ce qui a
                    ete vendu, a qui et a quel prix. C'est la meme liste que
                    « objets fournis », vue sous son angle marchand. */}
                <Repliable n={f.staff.ventes} ouvert={replie === "ventes"} onToggle={() => bascule("ventes")} enfants={f.detail.fournitures.length}>
                  <span className="font-heading" style={{ fontSize: 19, fontWeight: 700 }}>{f.staff.ventes}</span>
                  <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>vente{f.staff.ventes > 1 ? "s" : ""} conclue{f.staff.ventes > 1 ? "s" : ""}</span>
                  {f.staff.perinsEncaisses > 0 && <span style={{ fontSize: 11.5, color: "var(--gold)" }}>· {f.staff.perinsEncaisses.toLocaleString("fr-FR")} périns</span>}
                  {f.staff.airpointsEncaisses > 0 && <span style={{ fontSize: 11.5, color: "var(--gold)" }}>· {f.staff.airpointsEncaisses.toLocaleString("fr-FR")} AP</span>}
                  {!f.staff.ventes && <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>— rien vendu pour l&apos;instant</span>}
                </Repliable>
                {replie === "ventes" && (
                  <Repli total={f.staff.ventes} montres={f.detail.fournitures.length}>
                    {f.detail.fournitures.map((l, i) => (
                      <LigneRepli key={i} titre={l.item} quantite={l.quantite} date={l.date} noteCouleur="var(--gold)"
                        note={[l.prix ? `${l.prix.toLocaleString("fr-FR")} périns` : "", l.prixAp ? `${l.prixAp.toLocaleString("fr-FR")} AP` : "", `à ${l.pour}`].filter(Boolean).join(" · ")} />
                    ))}
                  </Repli>
                )}
                {(f.staff.ventesEnCours > 0 || f.staff.achatsACredit > 0) && (
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11.5, color: "var(--text-muted)" }}>
                    {f.staff.ventesEnCours > 0 && <span><b style={{ color: "var(--orange)" }}>{f.staff.ventesEnCours}</b> engagement{f.staff.ventesEnCours > 1 ? "s" : ""} en cours</span>}
                    {f.staff.achatsACredit > 0 && <span><b style={{ color: "var(--gold)" }}>{f.staff.achatsACredit}</b> achat{f.staff.achatsACredit > 1 ? "s" : ""} à crédit</span>}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 7 }}>
              <span style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: .8, color: "var(--text-muted)" }}>
                Personnages{f.personnages.length ? ` — ${f.personnages.length}` : ""}
              </span>
              {f.personnages.length > 0 && (
                <span style={{ fontSize: 10.5, color: "var(--text-muted)" }}>· clique pour voir son build (lecture seule)</span>
              )}
            </div>
            {f.personnages.length === 0 ? (
              <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Aucun personnage déclaré.</div>
            ) : (
              <div style={{ display: "grid", gap: 5 }}>
                {f.personnages.map((c) => (
                  <a key={c.nom} href={`/builder/${encodeURIComponent(f.nom)}`}
                    title={`Voir le build de ${f.nom} — lecture seule, rien n'est modifié`}
                    style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 9px", borderRadius: 9, background: "var(--bg-3)", border: "1px solid var(--border)", textDecoration: "none", color: "inherit" }}>
                    <ClassLogo name={c.classe} size={22} />
                    <b style={{ fontSize: 13 }}>{c.nom}</b>
                    {c.principal && <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: .5, color: "var(--orange)", border: "1px solid var(--orange)", borderRadius: 6, padding: "1px 6px" }}>principal</span>}
                    <span style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--text-muted)" }}>niv. {c.niveau} · P{c.prestige}</span>
                    <Icon name="chevron-right" size={13} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                  </a>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

/**
 * Le pseudo cliquable. `nu` rend le texte tel quel (dans un titre déjà stylé) ;
 * sinon un pointillé discret indique qu'il y a quelque chose derrière.
 */
export function Pseudo({ nom, nu = false, style }: { nom: string; nu?: boolean; style?: React.CSSProperties }) {
  const [ouvert, setOuvert] = useState(false);
  if (!nom) return null;
  return (
    <>
      <span role="button" tabIndex={0}
        onClick={(e) => { e.stopPropagation(); setOuvert(true); }}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOuvert(true); } }}
        title={`Voir la fiche de ${nom}`}
        style={{ cursor: "pointer", borderBottom: nu ? "none" : "1px dotted currentColor", ...style }}>
        {nom}
      </span>
      {ouvert && <FicheJoueur nom={nom} onClose={() => setOuvert(false)} />}
    </>
  );
}
