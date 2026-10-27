"use client";
import { Icon } from "@/components/Icon";
import { BUFFS, CONDITIONS, ETAT_LIBELLE, POUDRES, ROLE_LIBELLE, champsMesures, type EtatStuff, type RoleMesure } from "@/lib/mesures";
import { chiffreCourt } from "@/lib/recensement";

/**
 * LES MESURES D'UN STUFF, côté staff — les mêmes briques pour le GuildViewer, le dossier
 * d'un membre et le suivi, pour qu'un stuff se lise pareil sur les trois.
 *
 * Les mots sont ceux du builder (« À renseigner », « À remesurer », « Complet ») : le
 * staff lit ce que le joueur a lu en saisissant. Les pastilles reprennent la forme des
 * pastilles de stuff du GuildViewer (11,5 px, 700, rayon 6, filet et teinte à 13 %).
 */

const TEINTE: Record<EtatStuff, string> = {
  complet: "var(--green)", "a-remesurer": "var(--gold)", "a-renseigner": "var(--red)", vide: "var(--text-muted)",
};

export const pastille = (c: string): React.CSSProperties => ({
  fontSize: 11.5, fontWeight: 700, padding: "3px 9px", borderRadius: 6, whiteSpace: "nowrap",
  border: `1px solid ${c}`, background: `color-mix(in srgb, ${c} 13%, transparent)`, color: c,
  display: "inline-flex", alignItems: "center", gap: 5,
});

export function EtatMesures({ etat }: { etat: EtatStuff }) {
  const c = TEINTE[etat];
  return (
    <span style={pastille(c)}>
      <Icon name={etat === "complet" ? "check" : etat === "vide" ? "x" : "alert"} size={11} />
      {etat === "a-renseigner" ? "Mesures manquantes" : ETAT_LIBELLE[etat]}
    </span>
  );
}

/** « Bulle 45 k · DPS/s 180 k » — les chiffres que la classe et le rôle exigent, nommés. */
export function chiffresEnClair(classe: string, role: RoleMesure, v: Record<string, number>): string {
  return champsMesures(classe, role)
    .filter((f) => v[f.clef])
    .map((f) => `${f.libelle} ${chiffreCourt(v[f.clef])}`)
    .join(" · ");
}

/** Ce qui conditionne la mesure : sans ça, deux chiffres ne se comparent pas. */
export function conditionsEnClair(m: { poudres: string[]; buffs: string[]; cond?: string[] }): string {
  const p = m.poudres.map((k) => POUDRES[k] ?? k);
  const b = m.buffs.map((k) => BUFFS[k] ?? k);
  const c = (m.cond ?? []).map((k) => CONDITIONS[k] ?? k);
  return [
    p.length ? p.join(", ") : "sans poudre",
    b.length ? `buffs ${b.join(", ")}` : "sans buff",
    c.length ? `avec ${c.join(", ").toLowerCase()}` : "",
  ].filter(Boolean).join(" · ");
}

export const roleLibelle = (r: RoleMesure) => ROLE_LIBELLE[r];
