"use client";
import { useEffect, useState } from "react";
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
  bilan: { demandes: number; remises: number; abandons: number; quetes: number; apports: number; quantiteApportee: number; fournitures: number };
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

function Chiffre({ n, label, couleur }: { n: number; label: string; couleur?: string }) {
  return (
    <div style={{ minWidth: 74 }}>
      <div className="font-heading" style={{ fontSize: 19, fontWeight: 700, color: couleur ?? "var(--text)" }}>{n}</div>
      <div style={{ fontSize: 10.5, color: "var(--text-muted)", lineHeight: 1.3 }}>{label}</div>
    </div>
  );
}

export function FicheJoueur({ nom, onClose }: { nom: string; onClose: () => void }) {
  const [f, setF] = useState<Fiche | null>(null);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    let vivant = true;
    fetch(`/api/membres/${encodeURIComponent(nom)}`)
      .then(async (r) => (r.ok ? r.json() : Promise.reject(new Error((await r.json().catch(() => ({}))).error ?? "Fiche indisponible."))))
      .then((d) => { if (vivant) setF(d); })
      .catch((e) => { if (vivant) setErreur(e instanceof Error ? e.message : "Fiche indisponible."); });
    return () => { vivant = false; };
  }, [nom]);

  const rang = RANG[f?.role ?? ""] ?? RANG.RECRUE;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} className="glass-card" style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 14, padding: 20, maxWidth: 460, width: "100%", maxHeight: "86vh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {f?.avatar
            ? <img src={f.avatar} alt="" style={{ width: 46, height: 46, borderRadius: "50%", border: `2px solid ${rang.couleur}` }} />
            : <div style={{ width: 46, height: 46, borderRadius: "50%", border: `2px solid ${rang.couleur}`, display: "grid", placeItems: "center", color: "var(--text-muted)" }}><Icon name="user" size={20} /></div>}
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

            {/* Ce qu'il a demandé, ce qu'il a rendu. Les deux colonnes se lisent
                ensemble : demander beaucoup n'est un problème que si l'on
                n'apporte jamais rien. */}
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", padding: "12px 14px", borderRadius: 11, background: "var(--bg-3)", border: "1px solid var(--border)", marginBottom: 14 }}>
              <Chiffre n={f.bilan.demandes} label="demandes" />
              <Chiffre n={f.bilan.remises} label="objets reçus" couleur="var(--green)" />
              <Chiffre n={f.bilan.abandons} label="abandonnées" couleur={f.bilan.abandons ? "var(--text-muted)" : undefined} />
              <Chiffre n={f.bilan.apports} label="quêtes aidées" couleur="var(--orange)" />
              <Chiffre n={f.bilan.fournitures} label="objets fournis" couleur="var(--orange)" />
            </div>

            <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: .8, color: "var(--text-muted)", marginBottom: 7 }}>
              Personnages{f.personnages.length ? ` — ${f.personnages.length}` : ""}
            </div>
            {f.personnages.length === 0 ? (
              <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Aucun personnage déclaré.</div>
            ) : (
              <div style={{ display: "grid", gap: 5 }}>
                {f.personnages.map((c) => (
                  <div key={c.nom} style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 9px", borderRadius: 9, background: "var(--bg-3)", border: "1px solid var(--border)" }}>
                    <ClassLogo name={c.classe} size={22} />
                    <b style={{ fontSize: 13 }}>{c.nom}</b>
                    {c.principal && <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: .5, color: "var(--orange)", border: "1px solid var(--orange)", borderRadius: 6, padding: "1px 6px" }}>principal</span>}
                    <span style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--text-muted)" }}>niv. {c.niveau} · P{c.prestige}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
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
