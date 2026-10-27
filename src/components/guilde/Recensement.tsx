"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ClassLogo } from "@/components/ClassLogo";
import { VgSelect } from "@/components/VgSelect";
import { Icon, type IconName } from "@/components/Icon";
import { pastille } from "@/components/staff/MesuresStuff";
import { CLASSES, findClass } from "@/data/classes";
import type { RoleMesure } from "@/lib/mesures";
import { ORDRE_ROLES, type LigneRecensement } from "@/lib/recensement";

/**
 * LE RECENSEMENT — une SECTION d'Information Guilde (`/guilde#recensement`) depuis le
 * 2026-10-21 (SPEC-INFORMATION-GUILDE §2.4). C'était la page /recensement du lot 1 des
 * Chambres ; son adresse redirige ici, filtres compris (next.config.js).
 *
 * Le bot de Dracarys le tenait dans un salon Discord, `📋・recensement`, que personne ne
 * pouvait trier. Ici on filtre une classe ou un rôle, on trie par chiffre, et on repère
 * d'un coup d'œil les mesures à refaire. La SAISIE reste dans l'AirBuilder : cette
 * section ne fait que lire, et y renvoie.
 *
 * DES CHIFFRES DÉCLARÉS (décision de Maxime du 2026-10-21) : chaque chiffre porte sa date
 * et le témoin « à remesurer » au-delà de 30 jours. La section ne dit jamais « vérifié ».
 *
 * CE QUI A CHANGÉ EN DEVENANT UNE SECTION : les lignes arrivent de GET /api/guilde (la
 * seule route de la page) au lieu de /api/recensement, et elles sont LES MÊMES POUR TOUS,
 * bras droits compris — Information Guilde ne montre ni dossier ni build qui n'a pas été
 * partagé. Le lien « dossier » sur le joueur et le filtre « Comptes sans aucun chiffre »
 * du staff sont donc partis ; ils vivent dans le Suivi des bras droits. Les compteurs de
 * tête aussi : le récap de la page et « Le suivi des mesures » disent déjà ces nombres.
 *
 * Les filtres vivent dans l'adresse (?classe=Arcaniste&role=dps&vieux=1&manque=1) pour
 * qu'un lien collé sur Discord ouvre la même vue — c'est ce que fera `/recensement
 * classe:` du bot, et ce que font les liens du Suivi des bras droits.
 */

type Tri = { col: "chiffre" | "date" | "perso"; sens: 1 | -1 };

const ROLES_FILTRE = [
  { value: "", label: "Tous les rôles" },
  { value: "dps", label: "DPS" },
  { value: "offtank", label: "Off tank" },
  { value: "tank", label: "Tank" },
];
/* Le titre de chaque groupe, et ce que veut dire son chiffre : on ne compare pas des PV
   en sceptre et des PV en poing sans le dire. Des h3 : la section porte le h2. */
const GROUPES: Record<RoleMesure | "aucun", { titre: string; icon: IconName; sous: string }> = {
  tank: { titre: "Tank", icon: "shield", sous: "Les PV en poing (Primat, Chanoine) ou en doloire (Templier), relevés dans la fenêtre du personnage." },
  offtank: { titre: "Off tank", icon: "shield-check", sous: "Le Primat, PV en sceptre — le stuff qui tanke les boss. Ses dégâts s'il en a déclaré." },
  dps: { titre: "DPS", icon: "sword", sous: "Mesurés sur le totem de l'Oasis. Pour les classes qui relèvent un minimum et un maximum, le tri prend le milieu." },
  aucun: { titre: "Sans mesure", icon: "help", sous: "Aucun stuff mesuré dans l'AirBuilder pour l'instant." },
};
const CLES_CLASSES = Object.keys(CLASSES);

/** « 12/10 », ou « 12/10/25 » pour une mesure d'une autre année. */
function dateCourte(ms: number, maintenant: number): string {
  const d = new Date(ms);
  const memeAnnee = d.getFullYear() === new Date(maintenant).getFullYear();
  return d.toLocaleDateString("fr-FR", memeAnnee ? { day: "2-digit", month: "2-digit" } : { day: "2-digit", month: "2-digit", year: "2-digit" });
}

/** Les conditions de la mesure, en clair : sans elles, deux chiffres ne se comparent pas. */
function conditions(l: LigneRecensement): string {
  return [
    l.poudres.length ? `poudres ${l.poudres.join(", ")}` : "",
    l.buffs.length ? l.buffs.join(", ") : "",
    l.avec.length ? `avec ${l.avec.join(", ")}` : "",
  ].filter(Boolean).join(" · ");
}

/**
 * La section. `useSearchParams` exige une frontière Suspense : c'est la page qui la pose,
 * autour de cette section seulement, pour que le reste se rende sans attendre.
 */
export function SectionRecensement({ lignes, maintenant }: { lignes: LigneRecensement[]; maintenant: number }) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const classe = CLES_CLASSES.find((c) => c === sp.get("classe")) ?? "";
  const role = ROLES_FILTRE.some((r) => r.value && r.value === sp.get("role")) ? (sp.get("role") as RoleMesure) : "";
  const vieux = sp.get("vieux") === "1";
  const manque = sp.get("manque") === "1";
  // L'ancre suit : un filtre posé ne doit pas renvoyer le lecteur en haut de la page.
  const changer = (modifs: Record<string, string | null>) => {
    const p = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(modifs)) if (!v) p.delete(k); else p.set(k, v);
    const q = p.toString();
    router.replace(`${pathname}${q ? `?${q}` : ""}#recensement`, { scroll: false });
  };

  const [q, setQ] = useState("");
  const [tri, setTri] = useState<Tri>({ col: "chiffre", sens: -1 });

  const visibles = useMemo(() => {
    const libelle = classe ? findClass(classe)?.label : "";
    const needle = q.trim().toLowerCase();
    return lignes.filter((l) =>
      (!libelle || l.classe === libelle)
      && (!role || l.role === role)
      && (!vieux || l.aRemesurer)
      && (!manque || l.chiffre === null || l.complet === false)
      && (!needle || l.perso.toLowerCase().includes(needle) || l.joueur.toLowerCase().includes(needle)));
  }, [lignes, classe, role, vieux, manque, q]);

  /* Groupés par rôle, triés DANS chaque groupe : des PV et des DPS ne se rangent jamais
     ensemble. Un chiffre manquant va au fond quel que soit le sens du tri. */
  const groupes = useMemo(() => {
    const cmp = (a: LigneRecensement, b: LigneRecensement) => {
      if (tri.col === "perso") return tri.sens * a.perso.localeCompare(b.perso, "fr");
      const va = tri.col === "chiffre" ? a.chiffre : a.mesureLe;
      const vb = tri.col === "chiffre" ? b.chiffre : b.mesureLe;
      if (va === null && vb === null) return a.perso.localeCompare(b.perso, "fr");
      if (va === null) return 1;
      if (vb === null) return -1;
      return tri.sens * (va - vb) || a.perso.localeCompare(b.perso, "fr");
    };
    return [...ORDRE_ROLES, "aucun" as const]
      .map((g) => ({ g, l: visibles.filter((x) => (x.role ?? "aucun") === g).sort(cmp) }))
      .filter((x) => x.l.length);
  }, [visibles, tri]);

  const filtre = Boolean(classe || role || vieux || manque || q.trim());

  const trier = (col: Tri["col"]) => setTri((t) => (t.col === col ? { col, sens: (t.sens * -1) as 1 | -1 } : { col, sens: col === "perso" ? 1 : -1 }));
  const inp: React.CSSProperties = { background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 9, padding: "10px 13px", color: "var(--text)", fontSize: 14 };
  /* La case à cocher des filtres du GuildViewer (`filtreCase`), recopiée telle quelle. */
  const filtreCase = (actif: boolean, onChange: (v: boolean) => void, ic: IconName, label: string) => (
    <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: actif ? "var(--gn-accent)" : "var(--text-muted)", cursor: "pointer", background: "var(--bg-3)", border: `1px solid ${actif ? "var(--gn-accent)" : "var(--border)"}`, borderRadius: 9, padding: "9px 14px", transition: "border-color .15s, color .15s" }}>
      <input type="checkbox" checked={actif} onChange={(e) => onChange(e.target.checked)} /><Icon name={ic} size={14} />{label}
    </label>
  );

  return (
    <div className="gn-rec">
      {/* Les huit classes en puces, puis le rôle, les témoins et la recherche. */}
      <div className="gn-rec-puces" role="group" aria-label="Classe">
        <button type="button" className="gn-rec-puce" aria-pressed={!classe} onClick={() => changer({ classe: null })}>Toutes</button>
        {CLES_CLASSES.map((c) => (
          <button key={c} type="button" className="gn-rec-puce" aria-pressed={classe === c} title={CLASSES[c].label}
            onClick={() => changer({ classe: classe === c ? null : c })}>
            <ClassLogo name={c} size={18} /><span className="gn-rec-puce-t">{CLASSES[c].label}</span>
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", margin: "10px 0 4px" }}>
        <div style={{ minWidth: 190 }}><VgSelect value={role} onChange={(v) => changer({ role: v || null })} options={ROLES_FILTRE} /></div>
        {filtreCase(vieux, (v) => changer({ vieux: v ? "1" : null }), "clock", "À remesurer")}
        {filtreCase(manque, (v) => changer({ manque: v ? "1" : null }), "alert", "Sans mesure ou incomplet")}
        <input style={{ ...inp, flex: 1, minWidth: 200 }} placeholder="Chercher un perso ou un joueur…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {groupes.length === 0 ? (
        <div className="glass-card" style={{ padding: 28, textAlign: "center", color: "var(--text-muted)", marginTop: 24 }}>
          {lignes.length === 0 ? "Aucun personnage déclaré dans la guilde pour l'instant." : filtre ? "Personne dans ce cas." : "Aucune ligne."}
        </div>
      ) : groupes.map(({ g, l }) => (
        <section key={g}>
          <TitreGroupe icon={GROUPES[g].icon} sous={GROUPES[g].sous} droite={`${l.length} ligne${l.length > 1 ? "s" : ""}`}>{GROUPES[g].titre}</TitreGroupe>
          <div className="gn-rec-liste">
            {/* Pas d'aria-hidden ici : l'en-tête porte les boutons du tri, et un bouton
                qu'on atteint au clavier ne doit pas être caché aux lecteurs d'écran. */}
            <div className="gn-rec-tete">
              <Entete col="perso" tri={tri} onTri={trier} className="gn-rec-perso">Perso</Entete>
              <span className="gn-rec-classe">Classe</span>
              <span className="gn-rec-joueur">Joueur</span>
              <Entete col="chiffre" tri={tri} onTri={trier} className="gn-rec-chiffre">Chiffre</Entete>
              <span className="gn-rec-cond">Conditions</span>
              <Entete col="date" tri={tri} onTri={trier} className="gn-rec-date">Mesuré le</Entete>
              <span className="gn-rec-poste">Poste CS</span>
              <span className="gn-rec-build">Build</span>
            </div>
            {l.map((x) => <Ligne key={`${x.joueur}|${x.perso}|${x.role ?? "-"}`} l={x} maintenant={maintenant} />)}
          </div>
        </section>
      ))}

      {/* Le seul geste de la section : la saisie est ailleurs, et c'est voulu. */}
      <Link href="/builder" className="glass-card fx-card gn-rec-pied">
        <Icon name="shirt" size={18} style={{ color: "var(--gn-accent)", flexShrink: 0 }} />
        <span style={{ minWidth: 0 }}>Tes chiffres sont faux, ou vieux de plus de 30 jours ? Mets-les à jour dans l&apos;AirBuilder, stuff par stuff.</span>
        <span className="gn-rec-pied-geste">AirBuilder →</span>
      </Link>
    </div>
  );
}

/**
 * Le titre d'un groupe. Sur la page /recensement c'était un TitreStaff (h2) ; dans la
 * section, qui porte déjà le h2 « Recensement », c'est un h3 — celui de « Nos objectifs »
 * dans la section « La guilde » de la même page (LaGuilde : 14 px, capitales, accent,
 * icône de 16), recopié tel quel. Le sous-titre est celui de TitreStaff.
 */
function TitreGroupe({ icon, children, sous, droite }: { icon: IconName; children: React.ReactNode; sous?: string; droite?: React.ReactNode }) {
  return (
    <div style={{ margin: "28px 0 12px" }}>
      <h3 className="font-heading" style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--gn-accent)", display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
        <Icon name={icon} size={16} />{children}
        {droite && <span className="gn-titre-droite">{droite}</span>}
      </h3>
      {sous && <p style={{ margin: "8px 0 0", fontFamily: "'Alef',sans-serif", fontSize: 13, color: "var(--text-muted)", letterSpacing: ".2px" }}>{sous}</p>}
    </div>
  );
}

function Entete({ col, tri, onTri, className, children }: { col: Tri["col"]; tri: Tri; onTri: (c: Tri["col"]) => void; className: string; children: React.ReactNode }) {
  const actif = tri.col === col;
  return (
    <button type="button" className={`gn-rec-tri ${className}`} onClick={() => onTri(col)} data-actif={actif || undefined}
      title={`Trier par ${String(children).toLowerCase()}`}>
      {children}{actif && <span aria-hidden="true">{tri.sens === 1 ? " ↑" : " ↓"}</span>}
    </button>
  );
}

function Ligne({ l, maintenant }: { l: LigneRecensement; maintenant: number }) {
  const cond = conditions(l);
  return (
    <div className={`gn-rec-ligne${l.moi ? " moi" : ""}`}>
      <span className="gn-rec-perso" title={`Niveau ${l.niveau} · prestige ${l.prestige}`}>
        <ClassLogo name={l.classe} size={22} />
        <b className="gn-rec-nom">{l.perso}</b>
        {l.moi && <span className="gn-rec-toi">toi</span>}
      </span>
      <span className="gn-rec-classe">{l.classe}</span>
      <span className="gn-rec-joueur">{l.joueur}</span>
      <span className="gn-rec-chiffre">
        {l.texte
          ? <><b>{l.texte}</b>{(l.detail || l.arme) && <span className="gn-rec-sous">{[l.role !== "dps" && l.arme ? `en ${l.arme}` : "", l.detail].filter(Boolean).join(" · ")}</span>}</>
          : l.role === null
            ? <span style={{ color: "var(--text-muted)" }}>sans mesure</span>
            : null}
        {l.complet === false && <span style={{ ...pastille("var(--gn-crimson-texte)"), marginTop: l.texte ? 3 : 0 }} title="Des chiffres obligatoires manquent dans l'AirBuilder"><Icon name="alert" size={11} />à renseigner</span>}
        {l.role === null && l.moi && <Link href="/builder" className="gn-rec-sous gn-rec-lien">Mettre à jour dans l&apos;AirBuilder</Link>}
      </span>
      <span className="gn-rec-cond" title={cond || undefined}>{cond || <span style={{ opacity: 0.6 }}>—</span>}</span>
      <span className="gn-rec-date">
        {l.mesureLe
          ? <span title={`Déclaré le ${new Date(l.mesureLe).toLocaleDateString("fr-FR")}`}>{dateCourte(l.mesureLe, maintenant)}</span>
          : <span style={{ color: "var(--text-muted)" }}>—</span>}
        {l.aRemesurer && <span style={pastille("var(--gold)")} title="Mesuré il y a plus de 30 jours : le stuff a pu bouger"><Icon name="clock" size={11} />à remesurer</span>}
      </span>
      <span className="gn-rec-poste" title={l.posteCS ? "Son inscription sur la composition des Chambres" : undefined}>{l.posteCS ?? <span style={{ color: "var(--text-muted)" }}>—</span>}</span>
      <span className="gn-rec-build">
        {l.lienBuild
          ? <a className="gn-rec-build-a vg-touch" href={l.lienBuild} target={l.moi ? undefined : "_blank"} rel="noopener noreferrer" title={l.moi ? "Ouvrir mon AirBuilder" : "Voir le build qu'il a partagé"}><Icon name="sword" size={13} /></a>
          : <span title="Build non partagé" style={{ color: "var(--text-muted)" }}>—</span>}
      </span>
    </div>
  );
}
