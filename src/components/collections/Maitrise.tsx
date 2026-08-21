"use client";
import { useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { Bloc, Chiffre, Chiffres, Source, Tableau, td, tdNum, th } from "./briques";
import { nb, type Maitrise as TMaitrise } from "./donnees";

/**
 * LA MAÎTRISE D'ARME — ce que le niveau 100 demande vraiment.
 *
 * Les treize paliers du client sont une table d'XP par niveau : lue telle
 * quelle, elle ne dit pas combien de monstres il faut tuer, ce qui est la seule
 * chose qu'on veuille savoir. On la traduit donc en monstres et en boss, avec
 * les taux du client (5 XP par monstre normal, 25 par coup sur un boss).
 *
 * La table a DEUX colonnes parce que l'XP demandée dépend du niveau de l'arme :
 * au-delà du niveau 120, la même tranche coûte jusqu'à vingt fois plus. C'est
 * l'information la plus utile de la section, donc elle est côte à côte et pas
 * dans deux tableaux séparés.
 *
 * UN MOT POUR DEUX CHOSES, ET IL FAISAIT UN FAUX CALCUL. Cette page appelait
 * « paliers » les treize TRANCHES D'XP du client (2-10, 11-20 … 99-100) ET les
 * paliers de BONUS, qui tombent tous les dix niveaux. Les deux comptes lus côte
 * à côte invitent à multiplier le gain par treize, là où le jeu et le wiki
 * officiel affichent dix versements au maximum. Les tranches d'XP portent donc
 * ici leur vrai nom ; « palier » ne désigne plus que le versement du bonus.
 */
export function Maitrise({ m, source }: { m: TMaitrise; source: string }) {
  const [haut, setHaut] = useState(true);
  const [de, setDe] = useState(1);

  const seuil = m.paliers[0]?.seuilHaut ?? 120;

  /** L'XP à poser entre le niveau actuel et le 100.
   *
   *  Un palier du client couvre une TRANCHE (« 41 à 50 ») et son tarif
   *  s'applique à chacun des niveaux de la tranche — pas une fois pour toute la
   *  tranche. D'où la multiplication par le nombre de niveaux restants dedans :
   *  celui qui est déjà au 45 ne paie que cinq niveaux du palier 41-50. */
  const total = useMemo(() => {
    const depart = Math.min(Math.max(1, de), m.niveauMax);
    let x = 0;
    for (const p of m.paliers) {
      const premier = Math.max(p.de, depart + 1);
      if (p.a >= premier) x += (p.a - premier + 1) * (haut ? p.haut : p.bas);
    }
    return x;
  }, [de, haut, m]);

  const monstres = Math.ceil(total / (m.xp["monstre normal tué"] || 5));
  const boss = Math.ceil(total / (m.xp["boss frappé en instance"] || 25));
  const geants = Math.ceil(total / (m.xp["monstre géant tué"] || 100));

  // Le gain PAR PALIER est le même à toutes les raretés non nulles (« commun »
  // ne rapporte rien) : le dire épargne un tableau de six colonnes identiques.
  // Ce qui change d'une rareté à l'autre, c'est le NOMBRE de paliers — et ce
  // plafond-là n'est pas dans collections.json ; voir la note du bloc.
  const gainsParStat = useMemo(() => {
    const par = new Map<string, { stat: string; gain: number; armes: string[] }>();
    for (const a of m.armes) {
      const gain = Math.max(...Object.values(a.gain));
      const k = `${a.stat}|${gain}`;
      const e = par.get(k) ?? { stat: a.stat, gain, armes: [] };
      e.armes.push(a.n);
      par.set(k, e);
    }
    return [...par.values()];
  }, [m.armes]);

  return (
    <div>
      <Chiffres>
        <Chiffre valeur={nb(total)} quoi={`XP du niveau ${Math.min(Math.max(1, de), m.niveauMax)} au ${m.niveauMax}`} icon="trending-up" />
        <Chiffre valeur={nb(monstres)} quoi="monstres normaux, si tu ne fais que ça" icon="skull" couleur="var(--orange)" />
        <Chiffre valeur={nb(boss)} quoi="coups sur un boss d'instance" icon="dragon" couleur="var(--red)" />
        <Chiffre valeur={nb(geants)} quoi="géants, la voie la plus courte" icon="crown" couleur="var(--blue)" />
      </Chiffres>

      <div className="fx-card" style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 12, padding: 15, display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
        {/* La largeur est portée par le LABEL, pas par le champ : un champ de
            84 px sous un intitulé de 140 px laissait le texte déborder sur le
            menu voisin. Le champ suit son étiquette. */}
        <label style={{ display: "grid", gap: 4, flex: "0 0 auto" }}>
          <span style={{ fontSize: 11.5, color: "var(--text-muted)", whiteSpace: "nowrap" }}>Ta maîtrise actuelle</span>
          <input value={Math.min(Math.max(1, de), m.niveauMax)} inputMode="numeric"
            onChange={(e) => setDe(Number(e.target.value.replace(/\D/g, "")) || 1)}
            style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 9, padding: "9px 10px", color: "var(--text)", fontSize: 13.5, fontFamily: "inherit", width: "100%", textAlign: "center", fontVariantNumeric: "tabular-nums" }} />
        </label>
        <label style={{ display: "grid", gap: 4, flex: "1 1 220px", minWidth: 0 }}>
          <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>Le niveau de l&apos;arme</span>
          <select value={haut ? "1" : "0"} onChange={(e) => setHaut(e.target.value === "1")} className="vg-select" style={{ width: "100%" }}>
            <option value="0">Arme de niveau {seuil - 1} ou moins</option>
            <option value="1">Arme de niveau {seuil} et plus</option>
          </select>
        </label>
        <p style={{ margin: 0, flex: "1 1 240px", fontSize: 12, color: "var(--text-muted)", lineHeight: 1.45 }}>
          Une arme de haut niveau demande jusqu&apos;à vingt fois plus d&apos;XP pour le même palier. C&apos;est le piège de la maîtrise : on la monte à bas niveau, pas sur sa pièce finale.
        </p>
      </div>

      <Bloc titre="Ce qui donne de l'XP de maîtrise" icon="zap"
        sous="Les cinq sources, et rien d'autre : la maîtrise ne monte pas en craftant ni en récoltant.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(232px,1fr))", gap: 8 }}>
          {Object.entries(m.xp).map(([quoi, x]) => (
            <div key={quoi} style={{ display: "flex", alignItems: "center", gap: 9, background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 10, padding: "9px 12px" }}>
              <span style={{ flex: 1, minWidth: 0, fontSize: 12.5 }}>{quoi.charAt(0).toUpperCase() + quoi.slice(1)}</span>
              <b className="font-heading" style={{ color: "var(--gold)", fontVariantNumeric: "tabular-nums", fontSize: 14 }}>{x}</b>
            </div>
          ))}
        </div>
      </Bloc>

      <Bloc titre={`Les ${m.paliers.length} tranches d'XP, jusqu'au niveau ${m.niveauMax}`} icon="layers"
        sous="L'XP demandée pour CHAQUE niveau de la tranche. La colonne qui compte est celle du niveau de ton arme.">
        <Tableau>
          <thead>
            <tr>
              <th style={th}>Niveaux de maîtrise</th>
              <th style={{ ...th, textAlign: "right" }}>Arme ≤ {seuil - 1}</th>
              <th style={{ ...th, textAlign: "right" }}>Arme ≥ {seuil}</th>
              <th style={{ ...th, textAlign: "right" }}>Rapport</th>
            </tr>
          </thead>
          <tbody>
            {m.paliers.map((p) => (
              <tr key={p.de}>
                <td style={{ ...td, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                  {p.de} <span style={{ color: "var(--text-muted)" }}>à</span> {p.a}
                </td>
                <td style={{ ...tdNum, color: haut ? "var(--text-muted)" : "var(--text)" }}>{nb(p.bas)}</td>
                <td style={{ ...tdNum, color: haut ? "var(--gold)" : "var(--text-muted)", fontWeight: haut ? 700 : 400 }}>{nb(p.haut)}</td>
                <td style={{ ...tdNum, color: "var(--text-muted)" }}>×{(p.haut / p.bas).toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </Tableau>
      </Bloc>

      {/* CE QUE CE BLOC NE PEUT PAS ENCORE DIRE. Le gain se CUMULE d'un palier à
          l'autre, et la rareté plafonne le niveau de maîtrise atteignable — donc
          le nombre de paliers. Ce plafond n'existe pas dans le client : il vient
          du wiki officiel, et il est aujourd'hui dans mecaniques.json
          (`faits.maitrise.plafondNiveau`), pas dans collections.json. Tant qu'il
          n'est pas ici, cette page montre le gain d'UN palier et se garde de
          laisser croire qu'il vaut le total. */}
      <Bloc titre="Ce que la maîtrise rapporte, par arme" icon="sword"
        sous="Le gain d'UN palier de maîtrise — il se cumule d'un palier au suivant, et ce n'est pas le total. Une arme commune n'en gagne aucun ; à partir de Rare, toutes les raretés donnent le même gain par palier, mais pas le même nombre de paliers : le builder montre la progression complète.">
        <div style={{ display: "grid", gap: 8 }}>
          {gainsParStat.map((g) => (
            <div key={g.stat + g.gain} style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                <b className="font-heading" style={{ fontSize: 13.5, color: "var(--gold)" }}>+{g.gain} {g.stat}</b>
                <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>par palier de maîtrise</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 7 }}>
                {g.armes.map((a) => (
                  <span key={a} style={{ fontSize: 11.5, padding: "3px 8px", borderRadius: 7, background: "var(--bg-2)", border: "1px solid var(--border)" }}>{a}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Bloc>

      <Source fichier={source}
        avertissement={<>Les équivalences en monstres et en boss sont un calcul, pas une donnée du client : elles supposent qu&apos;on ne fait que ça, et un bonus d&apos;XP de maîtrise (carte, ange) les fait fondre.</>} />
    </div>
  );
}
