"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { SectionTabs } from "@/components/SectionTabs";
import { VgSelect } from "@/components/VgSelect";
import { Icon, type IconName } from "@/components/Icon";
import { useCardFx } from "@/components/VgFx";

/**
 * ACCÈS DES AMIS — le réglage du rôle Discord Friend (SPEC-INFORMATION-GUILDE §9).
 *
 * Maxime, 2026-10-21 : « donner un accès pour les personnes ayant un rôle spécifique :
 * Friend […] qui permet d'avoir accès à la section Astuces et AirBuilder, c'est tout ; avoir
 * un espace paramétrable si jamais on souhaite changer. » Cette page est cet espace : quels
 * rôles font un ami, et quels espaces ils lui ouvrent. La règle qui les lit est dans
 * config/amis.ts ; la route, /api/admin/acces-amis.
 *
 * Les contrôles sont ceux de « Bot Discord », sa voisine de rubrique : la carte, la ligne
 * encadrée avec son icône, l'interrupteur à deux boutons, et l'enregistrement immédiat qui
 * revient en arrière si le serveur refuse — l'écran ne dit jamais un état que la base n'a
 * pas.
 */

type Ouvrable = { cle: string; label: string; pages: string[]; reservees: string[] };
type Etat = {
  reglage: { roles: string[]; espaces: string[] };
  defaut: { roles: string[]; espaces: string[] };
  parDefaut: boolean;
  majLe: string | null;
  ouvrables: Ouvrable[];
  rolesServeur: { id: string; nom: string; couleur: number }[];
  amis: number;
  peutRegler: boolean;
  maxRoles: number;
};

/* Ce qu'un espace ouvre AU-DELÀ de ses pages réservées : des routes, que la carte ne
   nomme pas. Les recettes de /crafts et la provenance d'un objet passent par
   apiEspace("astuces") ; la page /crafts, elle, est publique. */
const AUSSI: Record<string, string> = {
  astuces: "les recettes de Crafts & collections et la provenance de chaque objet",
};
const ICONE: Record<string, IconName> = { astuces: "compass", airbuilder: "shirt" };

const card: React.CSSProperties = { background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 14, padding: 20, marginBottom: 16 };
const inp: React.CSSProperties = { background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 9, padding: "9px 12px", color: "var(--text)", fontSize: 14, width: "100%" };
const titreCarte: React.CSSProperties = { fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--gn-accent)", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 };
const sousTitre: React.CSSProperties = { fontSize: 12.5, color: "var(--text-muted)", marginBottom: 14, lineHeight: 1.55 };
const ligne: React.CSSProperties = { display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 11, padding: "12px 14px", minWidth: 0 };

export default function AccesAmisPage() {
  useCardFx();
  const [etat, setEtat] = useState<Etat | null>(null);
  const [panne, setPanne] = useState(false);
  const [toast, setToast] = useState("");
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saisie, setSaisie] = useState("");

  const charger = () =>
    fetch("/api/admin/acces-amis")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j: Etat) => { setEtat(j); setPanne(false); })
      .catch(() => setPanne(true));
  useEffect(() => { charger(); }, []);

  const flash = (texte: string, reussi: boolean) => { setOk(reussi); setToast(texte); setTimeout(() => setToast(""), 4200); };

  /** Le réglage ENTIER part à chaque geste ; refusé, l'écran revient à ce que la base dit. */
  const enregistrer = async (suivant: { roles: string[]; espaces: string[] }, message: string) => {
    if (!etat) return false;
    const avant = etat;
    setEtat({ ...etat, reglage: suivant, parDefaut: false });
    setBusy(true);
    const rep = await fetch("/api/admin/acces-amis", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(suivant),
    }).catch(() => null);
    setBusy(false);
    const d = rep ? await rep.json().catch(() => ({})) : {};
    if (!rep || !rep.ok) {
      setEtat(avant);
      flash(d.error ?? "Le serveur n'a pas répondu : rien n'a changé.", false);
      return false;
    }
    flash(message, true);
    charger(); // le compte des amis reconnus suit le nouveau réglage
    return true;
  };

  if (panne) {
    return (
      <div style={{ padding: "28px 32px", maxWidth: 980, margin: "0 auto" }}>
        <PageHeader icon="key" title="Accès des amis" />
        <SectionTabs rubrique="Outils" />
        <div className="gn-panne"><Icon name="alert" size={14} style={{ flexShrink: 0 }} />Le réglage n&apos;a pas pu être lu.</div>
      </div>
    );
  }

  const r = etat?.reglage;
  const nomDe = (id: string) => etat?.rolesServeur.find((x) => x.id === id)?.nom ?? null;
  const ajouter = async (id: string) => {
    if (!etat || !r) return;
    const propre = id.trim();
    if (!propre) return;
    if (r.roles.includes(propre)) { flash("Ce rôle est déjà dans la liste.", false); return; }
    if (await enregistrer({ ...r, roles: [...r.roles, propre] }, `Rôle ajouté : ${nomDe(propre) ?? propre}.`)) setSaisie("");
  };
  const retirer = (id: string) => r && enregistrer({ ...r, roles: r.roles.filter((x) => x !== id) }, `Rôle retiré : ${nomDe(id) ?? id}.`);
  const basculer = (cle: string, ouvert: boolean) => r && enregistrer(
    { ...r, espaces: ouvert ? [...r.espaces, cle] : r.espaces.filter((x) => x !== cle) },
    `${etat?.ouvrables.find((o) => o.cle === cle)?.label ?? cle} ${ouvert ? "ouvert" : "fermé"} aux amis.`,
  );
  const verrou = !etat?.peutRegler || busy;
  // Les rôles du serveur qu'on peut encore ajouter (le cache du bot ; vide en local).
  const proposables = (etat?.rolesServeur ?? []).filter((x) => !r?.roles.includes(x.id));

  return (
    <div style={{ padding: "28px 32px", maxWidth: 980, margin: "0 auto" }}>
      <PageHeader icon="key" title="Accès des amis"
        subtitle="Le rôle Discord Friend ouvre des espaces du site à des amis de la guilde — sans en faire des membres." />
      <SectionTabs rubrique="Outils" />

      {toast && <div className="fx-card" style={{ ...card, padding: "10px 14px", color: ok ? "var(--green)" : "var(--red)", fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>{ok && <Icon name="check" size={16} />}{toast}</div>}

      {/* CE QU'EST UN AMI — avant les réglages : on règle mieux ce qu'on a lu. */}
      <div className="fx-card" style={card}>
        <div className="font-heading" style={titreCarte}><Icon name="heart" size={16} />Ce qu&apos;est un ami</div>
        <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 13, lineHeight: 1.7, color: "var(--text)" }}>
          <li>Un compte <b>hors de la guilde</b> qui porte un des rôles ci-dessous. Un membre qui le porte aussi reste un membre.</li>
          <li>Il voit les espaces ouverts <b>comme un membre</b> — leurs pages et ce qu&apos;elles chargent —, et rien d&apos;autre : ni la Guilde, ni Information Guilde, ni les Chambres, ni les Bras droits.</li>
          <li>Il ne figure dans <b>aucune liste ni aucun compte</b> de la guilde. Ses persos et ses stuffs se lisent dans{" "}
            <Link href="/staff?section=membres" style={{ color: "var(--gn-accent)" }}>Membres &amp; builds</Link>, catégorie « Amis (hors guilde) ».</li>
          <li>Un changement atteint les sessions ouvertes en <b>cinq minutes</b> au plus ; un rôle posé ou retiré sur Discord, après la synchro du bot (dix minutes).</li>
        </ul>
        {etat && (
          <div style={{ marginTop: 12, fontSize: 12.5, color: "var(--text-muted)" }}>
            <b style={{ color: "var(--text)" }}>{etat.amis}</b> compte{etat.amis > 1 ? "s" : ""} reconnu{etat.amis > 1 ? "s" : ""} comme ami{etat.amis > 1 ? "s" : ""} aujourd&apos;hui
            {etat.parDefaut ? " · réglage par défaut, jamais modifié" : etat.majLe ? ` · réglé le ${new Date(etat.majLe).toLocaleString("fr-FR", { day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" })}` : ""}
          </div>
        )}
        {etat && !etat.peutRegler && (
          <div className="gn-panne" style={{ marginTop: 12 }}><Icon name="lock" size={14} style={{ flexShrink: 0 }} />Lecture seule : ce réglage se change par Vanguard et la Direction — il ouvre le site à des comptes hors de la guilde.</div>
        )}
      </div>

      {/* LES RÔLES — chacun sur sa ligne, son nom à côté de l'identifiant quand le bot l'a
          mis en cache : un identifiant seul ne dit pas si c'est le bon rôle. */}
      <div className="fx-card" style={card}>
        <div className="font-heading" style={titreCarte}><Icon name="discord" size={16} />Rôles Discord « Friend »</div>
        <div style={sousTitre}>Un compte qui porte l&apos;un d&apos;eux est un ami. Liste vide : personne ne l&apos;est.</div>
        {!etat ? (
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Chargement…</span>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {r!.roles.length === 0 && (
              <div style={{ ...ligne, color: "var(--text-muted)", fontSize: 13 }}>Aucun rôle : l&apos;accès des amis est coupé.</div>
            )}
            {r!.roles.map((id) => {
              const nom = nomDe(id);
              return (
                <div key={id} style={ligne}>
                  <Icon name="key" framed frameSize={38} tone="gold" />
                  {/* 180 px de base : sur un téléphone, « Retirer » passe dessous plutôt que
                      d'écraser le nom du rôle dans une colonne de trois mots. */}
                  <div style={{ flex: "1 1 180px", minWidth: 0 }}>
                    <div className="font-heading" style={{ fontSize: 13.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {nom ?? (id === etat.defaut.roles[0] ? "Friend" : "Rôle sans nom")}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ fontFamily: "monospace", color: "var(--text)", background: "var(--bg-2)", borderRadius: 6, padding: "2px 7px", fontSize: 11.5 }}>{id}</span>
                      {!nom && <span>nom inconnu tant que le bot n&apos;a pas synchronisé les rôles du serveur</span>}
                    </div>
                  </div>
                  <button onClick={() => retirer(id)} disabled={verrou} title="Retirer ce rôle de la liste"
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 13px", borderRadius: 9, border: "1px solid var(--border)", background: "rgba(0,0,0,.25)", color: "var(--red)", cursor: verrou ? "default" : "pointer", fontSize: 12.5, fontWeight: 700, opacity: verrou ? 0.5 : 1 }}>
                    <Icon name="x" size={13} />Retirer
                  </button>
                </div>
              );
            })}

            {etat.peutRegler && r!.roles.length < etat.maxRoles && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "stretch", marginTop: 4 }}>
                {proposables.length > 0 && (
                  <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                    <VgSelect full value="" onChange={(v) => v && ajouter(v)} placeholder="Choisir un rôle du serveur"
                      options={[{ value: "", label: "Choisir un rôle du serveur" }, ...proposables.map((x) => ({ value: x.id, label: x.nom }))]} />
                  </div>
                )}
                <input style={{ ...inp, flex: "1 1 220px", width: "auto", minWidth: 0 }} inputMode="numeric"
                  value={saisie} onChange={(e) => setSaisie(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") ajouter(saisie); }}
                  placeholder="Identifiant du rôle (clic droit → Copier l'identifiant)" aria-label="Identifiant du rôle Discord" />
                <button className="vg-btn" disabled={busy || !saisie.trim()} style={{ opacity: busy || !saisie.trim() ? 0.6 : 1 }} onClick={() => ajouter(saisie)}>Ajouter</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* LES ESPACES — l'interrupteur des créneaux de « Bot Discord », mot pour mot. */}
      <div className="fx-card" style={card}>
        <div className="font-heading" style={titreCarte}><Icon name="unlock" size={16} />Espaces ouverts aux amis</div>
        <div style={sousTitre}>Guilde et Bras droits ne s&apos;ouvrent jamais à un ami : il n&apos;est pas de la guilde.</div>
        {!etat ? (
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Chargement…</span>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {etat.ouvrables.map((o) => {
              const ouvert = r!.espaces.includes(o.cle);
              const gain = [...o.reservees, ...(AUSSI[o.cle] ? [AUSSI[o.cle]] : [])];
              return (
                <div key={o.cle} style={ligne}>
                  <Icon name={ICONE[o.cle] ?? "compass"} framed frameSize={38} tone="gold" />
                  <div style={{ flex: 1, minWidth: 190 }}>
                    <div className="font-heading" style={{ fontSize: 13.5, fontWeight: 700 }}>{o.label}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, lineHeight: 1.5 }}>
                      {gain.length
                        ? <>Ouvre à l&apos;ami ce qu&apos;un visiteur n&apos;a pas : {gain.join(", ")}.</>
                        : <>Ses pages ({o.pages.join(", ")}) s&apos;ouvrent déjà à tout compte connecté — un candidat y monte son build : la case ne change rien aujourd&apos;hui.</>}
                      {!ouvert && <span style={{ color: "var(--gold)" }}> · fermé aux amis</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: 9, overflow: "hidden", opacity: verrou ? 0.6 : 1 }}>
                    {[false, true].map((v) => (
                      <button key={String(v)} onClick={() => ouvert !== v && basculer(o.cle, v)} disabled={verrou}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 15px", border: 0, cursor: verrou ? "default" : "pointer", fontSize: 12.5, fontWeight: 700,
                          background: ouvert === v ? (v ? "var(--gn-action)" : "var(--bg-4)") : "rgba(0,0,0,.25)",
                          color: ouvert === v ? (v ? "var(--gn-sur-action)" : "var(--text)") : "var(--text-muted)" }}>
                        <Icon name={v ? "unlock" : "lock"} size={13} />{v ? "Ouvert" : "Fermé"}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Seulement quand le réglage s'en écarte : après un retour au défaut, le bouton
          n'aurait plus rien à rétablir. */}
      {etat && etat.peutRegler && JSON.stringify(etat.reglage) !== JSON.stringify(etat.defaut) && (
        <button onClick={() => enregistrer(etat.defaut, "Réglage par défaut rétabli : le rôle Friend, Astuces et AirBuilder.")} disabled={busy}
          style={{ ...inp, width: "auto", cursor: busy ? "default" : "pointer", fontSize: 13, color: "var(--gn-accent)", borderColor: "var(--gn-accent)", padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: 7 }}>
          <Icon name="rotate-ccw" size={15} />Rétablir le réglage par défaut
        </button>
      )}
    </div>
  );
}
