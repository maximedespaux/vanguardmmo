"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Bloc, Chiffre, Chiffres, Source, Tableau, td, tdNum, th } from "./briques";
import { nb, type Ange, type Collections } from "./donnees";

/**
 * LES ANGES — la seule question qui compte : combien ça coûte.
 *
 * Un tableau de 49 lignes par ange, vingt fois, ne répond pas à « j'en suis au
 * niveau 27, il me faut combien pour aller au 40 ». D'où le calculateur : deux
 * curseurs, un total. Le tableau des paliers reste dessous, parce que « quand
 * est-ce que le buff monte » est l'autre question.
 *
 * Et une découverte qu'il faut dire, sinon la page mentirait par omission :
 * sur les vingt anges du client, CINQ se montent. Les quinze autres — relooks
 * et fées de Noël — tiennent un seul niveau et portent tous rigoureusement le
 * même buff. Ce sont des habillages, pas une progression. Vingt lignes
 * alignées auraient laissé croire à vingt chantiers.
 */
export function Anges({ anges, poudre, source }: {
  anges: Ange[]; poudre: Collections["poudre"]; source: string;
}) {
  const montables = useMemo(() => anges.filter((a) => a.montable), [anges]);
  const habillages = useMemo(() => anges.filter((a) => !a.montable), [anges]);

  const [choisi, setChoisi] = useState(0);
  const [de, setDe] = useState(1);
  const [a, setA] = useState(50);

  const ange = montables[choisi] ?? montables[0];
  // `couts[i]` paie le passage du niveau i+1 au i+2 : le niveau maximum vaut
  // donc `couts.length + 1`.
  const max = (ange?.couts.length ?? 0) + 1;
  const depart = Math.min(Math.max(1, de), max);
  const cible = Math.min(Math.max(depart, a), max);
  const cout = useMemo(
    () => (ange?.couts ?? []).slice(depart - 1, cible - 1).reduce((s, x) => s + x, 0),
    [ange, depart, cible]);

  if (!ange) return null;

  const Poudre = () => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      {poudre.ic && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/jeu/icones/${poudre.ic}`} alt="" width={16} height={16} style={{ imageRendering: "pixelated" }} />
      )}
      {poudre.n}
    </span>
  );

  return (
    <div>
      <Chiffres>
        {/* Le nom de la monnaie de montée vient du client : on ne le met NI au
            pluriel ni en minuscules à la main, « Poudre féerique » ne se
            pluralise pas en collant un s. */}
        <Chiffre valeur={nb(ange.cumul)} quoi={`${poudre.n} — pour monter un ange au bout`} icon="fairy" />
        <Chiffre valeur={max} quoi="niveaux par ange qui se monte" icon="upgrade" couleur="var(--orange)" />
        <Chiffre valeur={`${montables.length} / ${anges.length}`} quoi="anges qui se montent réellement" icon="wings" couleur="var(--blue)" />
      </Chiffres>

      {/* ── LE CALCULATEUR ─────────────────────────────────────────────── */}
      <div className="fx-card" style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 12, padding: 15 }}>
        <h3 className="font-heading" style={{ margin: "0 0 3px", fontSize: 14.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="gauge" size={16} style={{ color: "var(--orange)" }} />
          Ce qu&apos;il te reste à payer
        </h3>
        <p style={{ margin: "0 0 13px", fontSize: 12.5, color: "var(--text-muted)" }}>
          Dis où en est ton ange et où tu veux l&apos;emmener.
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          {/* L'icône de l'ange choisi. Les vingt anges du relevé portent tous la
              leur, mais un <select> ne peut pas afficher d'image : sans cette
              tuile, les cinq anges qui se montent ne se distinguaient que par
              leur nom, alors qu'en jeu on les reconnaît à leur apparence. */}
          <span style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
            background: "var(--bg-3)", border: "1px solid var(--border)", overflow: "hidden",
          }}>
            {ange.ic ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/jeu/icones/${ange.ic}`} alt="" width={32} height={32}
                style={{ objectFit: "contain", imageRendering: "pixelated" }} />
            ) : <Icon name="wings" size={18} style={{ color: "var(--text-muted)" }} />}
          </span>
          <label style={{ display: "grid", gap: 4, flex: "1 1 210px", minWidth: 0 }}>
            <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>Ton ange</span>
            <select value={choisi} onChange={(e) => setChoisi(Number(e.target.value))} className="vg-select" style={{ width: "100%" }}>
              {montables.map((x, i) => <option key={x.n} value={i}>{x.n}</option>)}
            </select>
          </label>
          {/* La largeur est portee par le LABEL, pas par le champ. */}
          <label style={{ display: "grid", gap: 4, flex: "0 0 auto" }}>
            <span style={{ fontSize: 11.5, color: "var(--text-muted)", whiteSpace: "nowrap" }}>Niveau actuel</span>
            <input value={depart} inputMode="numeric"
              onChange={(e) => setDe(Number(e.target.value.replace(/\D/g, "")) || 1)}
              style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 9, padding: "9px 10px", color: "var(--text)", fontSize: 13.5, fontFamily: "inherit", width: "100%", textAlign: "center", fontVariantNumeric: "tabular-nums" }} />
          </label>
          <label style={{ display: "grid", gap: 4, flex: "0 0 auto" }}>
            <span style={{ fontSize: 11.5, color: "var(--text-muted)", whiteSpace: "nowrap" }}>Niveau visé</span>
            <input value={cible} inputMode="numeric"
              onChange={(e) => setA(Number(e.target.value.replace(/\D/g, "")) || 1)}
              style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 9, padding: "9px 10px", color: "var(--text)", fontSize: 13.5, fontFamily: "inherit", width: "100%", textAlign: "center", fontVariantNumeric: "tabular-nums" }} />
          </label>
        </div>

        <div style={{ marginTop: 14, paddingTop: 13, borderTop: "1px solid var(--border)", display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          <span className="font-heading" style={{ fontSize: 27, fontWeight: 700, color: "var(--gold)", fontVariantNumeric: "tabular-nums" }}>
            {nb(cout)}
          </span>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {poudre.oid
              ? <Link href={`/objets/${poudre.oid}`} style={{ color: "var(--text-muted)", textDecoration: "none", borderBottom: "1px dotted var(--border)" }}><Poudre /></Link>
              : <Poudre />}
            {" "}du niveau {depart} au niveau {cible}
          </span>
        </div>
        {cible === max && depart === 1 && (
          <p style={{ margin: "9px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
            C&apos;est le trajet complet. Le dernier passage à lui seul en coûte {nb(ange.couts[ange.couts.length - 1])} : le prix double presque tous les cinq niveaux.
          </p>
        )}
      </div>

      {/* ── LES PALIERS DE BUFF ────────────────────────────────────────── */}
      <Bloc titre={`Ce que ${ange.n} apporte`} icon="sparkles"
        sous={ange.sous ? `${ange.sous} — le buff change tous les dix niveaux.` : "Le buff change tous les dix niveaux."}>
        <Tableau>
          <thead>
            <tr>
              <th style={th}>Niveau</th>
              <th style={th}>Buff</th>
              <th style={{ ...th, textAlign: "right" }}>Cumul depuis le 1</th>
            </tr>
          </thead>
          <tbody>
            {ange.paliers.map((p) => (
              <tr key={p.niv}>
                <td style={{ ...td, fontVariantNumeric: "tabular-nums", fontWeight: 700, color: "var(--orange)", whiteSpace: "nowrap" }}>{p.niv}</td>
                <td style={td}>{p.buff}</td>
                <td style={tdNum}>{nb(ange.couts.slice(0, Math.max(0, p.niv - 1)).reduce((s, x) => s + x, 0))}</td>
              </tr>
            ))}
          </tbody>
        </Tableau>
      </Bloc>

      {/* ── LES HABILLAGES ────────────────────────────────────────────── */}
      <Bloc titre={`Les ${habillages.length} habillages`} icon="wings"
        sous="Un seul niveau, aucun coût de montée, et rigoureusement le même buff pour tous : ce sont des apparences, pas des chantiers.">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {habillages.map((h) => (
            <span key={h.n} title={h.sous ?? undefined}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, padding: "5px 10px 5px 6px", borderRadius: 20, background: "var(--bg-3)", border: "1px solid var(--border)" }}>
              {h.ic ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/jeu/icones/${h.ic}`} alt="" width={20} height={20} style={{ objectFit: "contain", imageRendering: "pixelated" }} />
              ) : <Icon name="wings" size={14} style={{ color: "var(--text-muted)" }} />}
              {h.n}
            </span>
          ))}
        </div>
        {habillages[0]?.paliers[0] && (
          <p style={{ margin: "10px 0 0", fontSize: 12.5, color: "var(--text)", background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 10, padding: "9px 12px" }}>
            Leur buff commun : <b style={{ color: "var(--gold)" }}>{habillages[0].paliers[0].buff}</b>
          </p>
        )}
      </Bloc>

      <Source fichier={source}
        avertissement={<>Les vingt anges viennent tous du même fichier. Les quinze habillages y portent un coût de montée de 1 et un seul palier : ce n&apos;est pas une extraction incomplète, c&apos;est ce que le client déclare.</>} />
    </div>
  );
}
