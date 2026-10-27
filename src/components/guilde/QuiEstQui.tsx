"use client";
import { useMemo, useRef, useState } from "react";
import { AvatarCadre } from "@/components/AvatarCadre";
import { ClassLogo } from "@/components/ClassLogo";
import { Icon, type IconName } from "@/components/Icon";
import { VgSelect } from "@/components/VgSelect";
import { pastille } from "@/components/staff/MesuresStuff";
import { CLASSES, findClass } from "@/data/classes";
import { ROLE_RANK } from "@/config/roles";
import { ROLE_LIBELLE, nomClasse, type RoleMesure } from "@/lib/mesures";
import { ORDRE_ROLES, survol, type LigneRecensement } from "@/lib/recensement";
import type { MembreGuilde } from "@/lib/guilde";

/**
 * « QUI EST QUI » — l'annuaire de la guilde, pour TOUS les membres (SPEC-INFORMATION-
 * GUILDE §2.2 ; Maxime : « connaître les personnes (DiscordID et personnages de la
 * personne) pour apprendre à se connaître ou savoir qui est qui »).
 *
 * C'est la carte de membre du GuildViewer, MOINS tout ce qui est interne : pas de dernière
 * visite, pas de compte d'absences, pas de bouton « Dossier » ni « Versions », et le build
 * seulement s'il a été partagé. À la place, ce que le GuildViewer ne disait pas et que
 * tout le monde cherche : le nom Discord, et son identifiant à copier d'un clic (pour une
 * mention ou un MP, Discord ne le montre qu'en mode développeur).
 *
 * Les chiffres de chaque perso sont CEUX DU RECENSEMENT (mêmes lignes, même route) : un
 * même perso dit le même chiffre dans les deux sections, avec sa date et son « à
 * remesurer ».
 */

/* Les rangs, comme la pastille du GuildViewer : même icône, même couleur, même mot. */
const RANG: Record<string, { icon: IconName; label: string; color: string }> = {
  DIRECTION: { icon: "shield", label: "Direction", color: "var(--red)" },
  VANGUARD: { icon: "crown", label: "Vanguard", color: "var(--gold)" },
  GENERAL: { icon: "compass", label: "Général", color: "var(--gn-accent)" },
  OFFICIER: { icon: "flame", label: "Officier", color: "var(--gn-accent)" },
  VETERAN: { icon: "clipboard", label: "Vétéran", color: "var(--blue)" },
  GUARD: { icon: "sword-cross", label: "Guard", color: "var(--blue)" },
};
/* La teinte suit le RÔLE du chiffre, comme les pastilles de stuff du GuildViewer. */
const teinteRole = (r: RoleMesure) => (r === "tank" ? "var(--blue)" : r === "offtank" ? "var(--purple)" : "var(--gn-accent)");
const dateCourte = (ms: number) => new Date(ms).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
const cle = (joueur: string, perso: string) => `${joueur.toLowerCase()}|${perso.toLowerCase()}`;

export function QuiEstQui({ membres, recensement }: { membres: MembreGuilde[]; recensement: LigneRecensement[] }) {
  const [q, setQ] = useState("");
  const [classe, setClasse] = useState("");
  const [rang, setRang] = useState("");

  /* Les lignes du recensement, rangées par perso : le joueur (nom Discord) et le nom du
     perso les relient aux cartes, comme la route les a écrites. */
  const chiffres = useMemo(() => {
    const m = new Map<string, LigneRecensement[]>();
    for (const l of recensement) {
      if (!l.role) continue;
      const k = cle(l.joueur, l.perso);
      m.set(k, [...(m.get(k) ?? []), l]);
    }
    for (const l of m.values()) l.sort((a, b) => ORDRE_ROLES.indexOf(a.role!) - ORDRE_ROLES.indexOf(b.role!));
    return m;
  }, [recensement]);

  /* Les rangs et les classes qu'on peut filtrer : ceux qui existent dans la guilde. */
  const rangs = useMemo(() => ROLE_RANK.filter((r) => membres.some((m) => m.rang === r)), [membres]);

  const visibles = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return membres.filter((m) =>
      (!rang || m.rang === rang)
      && (!classe || m.persos.some((p) => findClass(p.classe)?.key === classe))
      && (!needle
        || m.pseudo.toLowerCase().includes(needle)
        || m.discord.nom.toLowerCase().includes(needle)
        || m.discord.id.includes(needle)
        || m.persos.some((p) => p.nom.toLowerCase().includes(needle) || nomClasse(p.classe).toLowerCase().includes(needle))));
  }, [membres, q, classe, rang]);

  const inp: React.CSSProperties = { background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 9, padding: "10px 13px", color: "var(--text)", fontSize: 14 };

  return (
    <>
      {/* Les filtres du GuildViewer : la recherche, puis les déroulants. */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 18 }}>
        <input style={{ ...inp, flex: 1, minWidth: 220 }} placeholder="Chercher un pseudo, un perso, un nom Discord, une classe…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Chercher un membre" />
        <div style={{ minWidth: 190 }}><VgSelect value={classe} onChange={setClasse} options={[{ value: "", label: "Toutes les classes" }, ...Object.values(CLASSES).map((c) => ({ value: c.key, label: c.label }))]} /></div>
        <div style={{ minWidth: 190 }}><VgSelect value={rang} onChange={setRang} options={[{ value: "", label: "Tous les rangs" }, ...rangs.map((r) => ({ value: r, label: RANG[r]?.label ?? r }))]} /></div>
      </div>

      {visibles.length === 0
        ? <div className="glass-card" style={{ padding: 28, textAlign: "center", color: "var(--text-muted)" }}>{membres.length ? "Aucun membre ne correspond." : "Personne dans la guilde pour l'instant."}</div>
        : visibles.map((m) => <CarteMembre key={m.discord.id} m={m} chiffres={chiffres} classe={classe} />)}
    </>
  );
}

function CarteMembre({ m, chiffres, classe }: { m: MembreGuilde; chiffres: Map<string, LigneRecensement[]>; classe: string }) {
  const r = RANG[m.rang] ?? { icon: "user" as IconName, label: m.rang, color: "var(--text-muted)" };
  return (
    <div className={`gn-qui glass-card fx-card${m.moi ? " moi" : ""}`} style={{ borderLeft: `3px solid ${r.color}` }}>
      <div className="gn-qui-tete" style={{ background: `linear-gradient(90deg, color-mix(in srgb, ${r.color} 9%, transparent), transparent 55%)` }}>
        <AvatarCadre src={m.discord.avatar} nom={m.discord.nom} taille={46} />
        <div className="gn-qui-ident">
          <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
            <span className="font-heading gn-qui-nom">{m.pseudo}</span>
            {m.moi && <span className="gn-rec-toi">toi</span>}
          </div>
          <span className="gn-qui-rang" style={{ color: r.color, background: `color-mix(in srgb, ${r.color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${r.color} 40%, transparent)` }}>
            <Icon name={r.icon} size={12} />{r.label}
          </span>
        </div>
        <div className="gn-qui-discord">
          <span className="gn-qui-dnom" title="Son nom d'utilisateur Discord"><Icon name="discord" size={15} style={{ color: "var(--text-muted)", flexShrink: 0 }} /><span className="gn-qui-dnom-t">{m.discord.nom}</span></span>
          <CopierId id={m.discord.id} nom={m.discord.nom} />
        </div>
      </div>

      {m.persos.length === 0 ? (
        <div className="gn-qui-vide">Pas encore de personnage : ils arrivent ici dès qu&apos;il les crée dans l&apos;AirBuilder.</div>
      ) : (
        <div className="gn-qui-persos">
          {m.persos.map((p) => {
            const lignes = chiffres.get(cle(m.discord.nom, p.nom)) ?? [];
            // Le filtre de classe éclaire les persos de cette classe, sans cacher les autres :
            // on cherche une personne, pas une ligne.
            const eteint = !!classe && findClass(p.classe)?.key !== classe;
            return (
              <div key={p.nom} className="gn-qui-perso" style={eteint ? { opacity: 0.45 } : undefined}>
                <div className="gn-qui-logo"><ClassLogo name={p.classe} size={23} /></div>
                <div style={{ minWidth: 130 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{p.nom} {p.principal && <span title="Personnage principal" style={{ display: "inline-flex", color: "var(--gold)" }}><Icon name="star" size={12} /></span>}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{nomClasse(p.classe)} · Niv {p.niveau} · P{p.prestige}</div>
                </div>
                <div className="gn-qui-droite">
                  {lignes.length === 0
                    ? <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>aucun chiffre déclaré</span>
                    : lignes.map((l) => (
                        <span key={l.role} className="gn-qui-chiffre" title={l.texte ? `${ROLE_LIBELLE[l.role!]} — ${survolLigne(l)}` : `${ROLE_LIBELLE[l.role!]} : des chiffres obligatoires manquent dans l'AirBuilder`}
                          style={{ borderColor: teinteRole(l.role!), color: teinteRole(l.role!), background: `color-mix(in srgb, ${teinteRole(l.role!)} 13%, transparent)` }}>
                          {ROLE_LIBELLE[l.role!]}{l.texte ? ` · ${l.texte}` : ""}{l.mesureLe ? ` · ${dateCourte(l.mesureLe)}` : ""}
                        </span>
                      ))}
                  {lignes.some((l) => l.complet === false) && <span style={pastille("var(--gn-crimson-texte)")} title="Des chiffres obligatoires manquent dans l'AirBuilder"><Icon name="alert" size={11} />à renseigner</span>}
                  {lignes.some((l) => l.aRemesurer) && <span style={pastille("var(--gold)")} title="Mesuré il y a plus de 30 jours : le stuff a pu bouger"><Icon name="clock" size={11} />à remesurer</span>}
                  {p.build && (
                    m.moi
                      ? <a className="gn-qui-build vg-touch" href={p.build} title={`Ouvrir ${p.nom} dans mon AirBuilder`}><Icon name="shirt" size={12} />Mon AirBuilder</a>
                      : <a className="gn-qui-build vg-touch" href={p.build} target="_blank" rel="noopener noreferrer" title="Le build qu'il a partagé depuis l'AirBuilder"><Icon name="sword" size={12} />Voir le build ↗</a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Le survol d'un chiffre, à partir d'une ligne : la même phrase que sur la compo. */
function survolLigne(l: LigneRecensement): string {
  return survol({
    role: l.role!, valeur: l.chiffre ?? 0, texte: l.texte ?? "", arme: l.arme, detail: l.detail,
    mesureLe: l.mesureLe, aRemesurer: l.aRemesurer, complet: l.complet, poudres: l.poudres, buffs: l.buffs, avec: l.avec,
  });
}

/**
 * L'IDENTIFIANT DISCORD, COPIÉ D'UN CLIC. Il reste affiché après la copie (la ligne ne
 * bouge pas) ; seule l'icône passe à la coche, et un message discret le dit aux lecteurs
 * d'écran. Le presse-papiers exige une page sûre (https ou localhost) : ailleurs, on
 * passe par une zone de texte, l'ancienne méthode.
 */
function CopierId({ id, nom }: { id: string; nom: string }) {
  const [copie, setCopie] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copier = async () => {
    let ok = false;
    try { await navigator.clipboard.writeText(id); ok = true; } catch { /* repli ci-dessous */ }
    if (!ok) {
      const z = document.createElement("textarea");
      z.value = id; z.setAttribute("readonly", ""); z.style.position = "fixed"; z.style.opacity = "0";
      document.body.appendChild(z); z.select();
      try { ok = document.execCommand("copy"); } catch { ok = false; }
      z.remove();
    }
    if (!ok) return;
    setCopie(true);
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => setCopie(false), 1600);
  };
  return (
    <button type="button" className="gn-qui-copier" onClick={copier} data-copie={copie || undefined}
      title={`Copier l'identifiant Discord de ${nom}`} aria-label={`Copier l'identifiant Discord de ${nom} : ${id}`}>
      <Icon name={copie ? "check" : "clipboard"} size={13} />ID {id}
      <span className="sr-only" role="status">{copie ? "Identifiant copié" : ""}</span>
    </button>
  );
}
