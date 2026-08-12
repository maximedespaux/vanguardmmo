"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { useCardFx } from "@/components/VgFx";
import {
  cadence, court, ELEMENT_FR, ELEMENTS, entier, faiblesses, iconeElement,
  TON_ELEMENT, tonRang, type Compteurs, type Monstre,
} from "./vocabulaire";

/**
 * CHERCHER UN MONSTRE — les 1 124 fiches du client du jeu.
 *
 * Rien n'arrive en bloc : le catalogue pèse 612 Ko, la route en renvoie 48 lignes
 * à la fois. On ne pagine pas non plus, exprès — au-delà de cinquante réponses la
 * bonne façon d'avancer est d'affiner le mot-clé ou de poser un filtre, pas de
 * tourner des pages. Le compte total est affiché pour qu'on sache qu'on n'a pas
 * tout vu.
 *
 * La frappe est amortie de 220 ms, et le `jeton` écarte les réponses qui
 * reviennent après la suivante : sans lui, taper « azharyon » lançait huit
 * requêtes et la plus lente écrasait la bonne.
 */

type Reponse = {
  monstres: Monstre[]; total: number; montres: number;
  rangs: Record<string, number>;
  elements: Record<string, number>;
  catalogue: { total: number; genere?: string; compteurs: Compteurs };
};

const RANGS = [
  { clef: "faible", label: "Jeune" },
  { clef: "normal", label: "Normal" },
  { clef: "capitaine", label: "Capitaine" },
  { clef: "boss", label: "Géant" },
  { clef: "demi-boss", label: "Demi-boss" },
  { clef: "super", label: "Donjon / event" },
  { clef: "materiau", label: "Récolte" },
] as const;

const TRIS = [
  { clef: "pertinence", label: "Au plus proche" },
  { clef: "pvEff", label: "PV à sortir" },
  { clef: "niveau", label: "Niveau" },
  { clef: "degats", label: "Dégâts par coup" },
  { clef: "exp", label: "Expérience" },
] as const;

const champ: React.CSSProperties = {
  background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 10,
  padding: "11px 13px", color: "var(--text)", fontSize: 14, fontFamily: "inherit", width: "100%",
};

/** Une pastille de filtre. La même forme partout : c'est ce qui la rend lisible. */
function Pastille({ on, onClick, children, couleur = "var(--orange)" }: {
  on: boolean; onClick: () => void; children: React.ReactNode; couleur?: string;
}) {
  return (
    <button onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", fontFamily: "inherit",
      fontSize: 12.5, fontWeight: 600, padding: "6px 12px", borderRadius: 20,
      color: on ? "#0A0A0C" : "var(--text)",
      background: on ? couleur : "var(--bg-3)",
      border: `1px solid ${on ? couleur : "var(--border)"}`,
    }}>{children}</button>
  );
}

export function RechercheMonstres({ depart = "" }: { depart?: string }) {
  useCardFx();
  const [q, setQ] = useState(depart);
  const [rang, setRang] = useState("");
  const [element, setElement] = useState("");
  const [nivMin, setNivMin] = useState("");
  const [nivMax, setNivMax] = useState("");
  const [maison, setMaison] = useState(false);
  const [vies, setVies] = useState(false);
  const [tri, setTri] = useState<(typeof TRIS)[number]["clef"]>("pertinence");
  const [r, setR] = useState<Reponse | null>(null);
  const [charge, setCharge] = useState(false);
  const jeton = useRef(0);

  const chercher = useCallback(async () => {
    const mien = ++jeton.current;
    setCharge(false);
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (rang) p.set("rang", rang);
    if (element) p.set("element", element);
    if (nivMin) p.set("nivMin", nivMin);
    if (nivMax) p.set("nivMax", nivMax);
    if (maison) p.set("maison", "1");
    if (vies) p.set("vies", "1");
    if (tri !== "pertinence") p.set("tri", tri);
    const d = await fetch(`/api/monstres?${p}`).then((x) => (x.ok ? x.json() : null)).catch(() => null);
    if (mien !== jeton.current) return; // une réponse en retard n'écrase pas la bonne
    setR(d); setCharge(true);
  }, [q, rang, element, nivMin, nivMax, maison, vies, tri]);

  useEffect(() => { const t = setTimeout(chercher, 220); return () => clearTimeout(t); }, [chercher]);

  const filtre = Boolean(q.trim() || rang || element || nivMin || nivMax || maison || vies || tri !== "pertinence");

  return (
    <div style={{ display: "grid", gap: 14 }}>

      <div className="glass-card" style={{ padding: 16, display: "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ position: "relative", flex: "1 1 260px", minWidth: 0 }}>
            <Icon name="search" size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
            <input value={q} onChange={(e) => setQ(e.target.value)} autoFocus
              placeholder="Le nom du monstre — les accents et les apostrophes n'ont pas d'importance"
              style={{ ...champ, paddingLeft: 34 }} />
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, color: "var(--text-muted)" }}>
            Niveau
            <input value={nivMin} onChange={(e) => setNivMin(e.target.value.replace(/\D/g, "").slice(0, 3))}
              inputMode="numeric" placeholder="de"
              style={{ ...champ, width: 60, textAlign: "center", padding: "9px 6px", fontVariantNumeric: "tabular-nums" }} />
            <input value={nivMax} onChange={(e) => setNivMax(e.target.value.replace(/\D/g, "").slice(0, 3))}
              inputMode="numeric" placeholder="à"
              style={{ ...champ, width: 60, textAlign: "center", padding: "9px 6px", fontVariantNumeric: "tabular-nums" }} />
          </span>
        </div>

        {/* Les rangs, avec leur nom de jeu entre parenthèses : personne ne dit
            « RANK_LOW », tout le monde dit « le Jeune » et « le Géant ». */}
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          <Pastille on={!rang} onClick={() => setRang("")}>Tous les rangs</Pastille>
          {RANGS.map((x) => (
            <Pastille key={x.clef} on={rang === x.clef} couleur={tonRang(x.clef)}
              onClick={() => setRang(rang === x.clef ? "" : x.clef)}>
              {x.label}
              {r?.rangs[x.clef] ? (
                <span style={{ fontVariantNumeric: "tabular-nums", opacity: rang === x.clef ? 0.7 : 0.55 }}>{r.rangs[x.clef]}</span>
              ) : null}
            </Pastille>
          ))}
        </div>

        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: 11 }}>
          {ELEMENTS.map((e) => (
            <Pastille key={e} on={element === e} couleur={TON_ELEMENT[e]}
              onClick={() => setElement(element === e ? "" : e)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={iconeElement(e)!} alt="" width={14} height={14} style={{ objectFit: "contain" }} />
              {ELEMENT_FR[e]}
              {r?.elements[e] ? (
                <span style={{ fontVariantNumeric: "tabular-nums", opacity: element === e ? 0.7 : 0.55 }}>{r.elements[e]}</span>
              ) : null}
            </Pastille>
          ))}
          <Pastille on={element === "aucun"} couleur="var(--text-muted)"
            onClick={() => setElement(element === "aucun" ? "" : "aucun")}>
            Sans élément
            {r?.elements.aucun ? <span style={{ fontVariantNumeric: "tabular-nums", opacity: 0.55 }}>{r.elements.aucun}</span> : null}
          </Pastille>
        </div>

        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: 11 }}>
          <Pastille on={vies} couleur="var(--red)" onClick={() => setVies(!vies)}>
            <Icon name="heart" size={13} /> Ceux qui se relèvent
          </Pastille>
          <Pastille on={maison} couleur="var(--purple)" onClick={() => setMaison(!maison)}>
            <Icon name="sparkles" size={13} /> Contenu AirFlyff
          </Pastille>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7, marginLeft: "auto", flexWrap: "wrap" }}>
            <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Ranger par</span>
            <span className="vg-subtabs" style={{ margin: 0 }}>
              {TRIS.map((t) => (
                <button key={t.clef} onClick={() => setTri(t.clef)} className={`vg-subtab ${tri === t.clef ? "active" : ""}`}>{t.label}</button>
              ))}
            </span>
          </span>
        </div>

        {filtre && (
          <button onClick={() => { setQ(""); setRang(""); setElement(""); setNivMin(""); setNivMax(""); setMaison(false); setVies(false); setTri("pertinence"); }}
            style={{ justifySelf: "start", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, display: "inline-flex", alignItems: "center", gap: 5, padding: 0 }}>
            <Icon name="x" size={13} /> Tout remettre à zéro
          </button>
        )}
      </div>

      {/* Le compte : combien on montre, combien il y en a. Sans ça, quarante-huit
          lignes laissent croire qu'il n'y en a que quarante-huit. */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 12.5, color: "var(--text-muted)", flexWrap: "wrap" }}>
        {!charge && !r ? "Recherche…" : r ? (
          <>
            <b style={{ color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{r.total.toLocaleString("fr-FR")}</b>
            {r.total === 1 ? "monstre trouvé" : "monstres trouvés"}
            {r.total > r.montres && <span>· les {r.montres} premiers sont affichés, affine le nom ou pose un filtre</span>}
            <span style={{ marginLeft: "auto", fontVariantNumeric: "tabular-nums" }}>
              catalogue du client : {r.catalogue.total.toLocaleString("fr-FR")} monstres
            </span>
          </>
        ) : "La recherche n’a pas répondu."}
      </div>

      {r && r.monstres.length === 0 && (
        <div className="glass-card" style={{ padding: "26px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13.5 }}>
          <Icon name="search" size={22} style={{ opacity: 0.5 }} />
          <p style={{ margin: "9px 0 0" }}>Rien sous ce nom. Essaie un mot plus court : la recherche cherche dans le nom, pas dans la description.</p>
          <p style={{ margin: "6px 0 0", fontSize: 12.5 }}>Les PNJ, les gardes, les citoyens, les familiers et les œufs ne sont pas là : ce catalogue ne porte que ce qui se combat.</p>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(288px,1fr))", gap: 10 }}>
        {r?.monstres.map((m) => <CarteMonstre key={m.id} m={m} />)}
      </div>
    </div>
  );
}

/** Une carte de résultat : de quoi juger « est-ce que je peux le prendre ? » sans
 *  ouvrir la fiche. Les PV affichés sont les PV EFFECTIFS quand il y a plusieurs
 *  vies — c'est le seul chiffre qui dit la vérité du combat. */
export function CarteMonstre({ m }: { m: Monstre }) {
  const ic = iconeElement(m.elem);
  const { faible } = faiblesses(m.res);
  const seReleve = (m.vies ?? 0) > 1;
  return (
    <Link href={`/monstres/${m.id}`} className="glass-card fx-card"
      style={{ padding: 12, display: "grid", gap: 7, textDecoration: "none", color: "var(--text)",
        borderColor: seReleve ? "color-mix(in srgb, var(--red) 32%, var(--border))" : undefined }}>

      <span style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
        <span style={{ minWidth: 0, flex: 1 }}>
          <span className="font-heading" style={{ display: "block", fontSize: 13.5, fontWeight: 700, lineHeight: 1.25 }}>{m.nom}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11.5, color: "var(--text-muted)", marginTop: 2, flexWrap: "wrap" }}>
            <b style={{ color: tonRang(m.rang), fontWeight: 600 }}>{m.rang ?? "rang inconnu"}</b>
            {m.niv != null && <span style={{ fontVariantNumeric: "tabular-nums" }}>niv. {m.niv}</span>}
            {m.groupe && <span>· {m.groupe}</span>}
          </span>
        </span>
        {ic && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ic} alt={ELEMENT_FR[m.elem!] ?? ""} title={ELEMENT_FR[m.elem!] ?? ""} width={22} height={22} style={{ objectFit: "contain", flexShrink: 0 }} />
        )}
      </span>

      <span style={{ display: "flex", gap: 6, flexWrap: "wrap", fontSize: 11.5, fontVariantNumeric: "tabular-nums" }}>
        <span style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 6, padding: "2px 8px" }}>
          <Icon name="heart" size={11} style={{ marginRight: 4 }} />
          {court(m.pvEff)} PV{seReleve ? ` (${m.vies} vies)` : ""}
        </span>
        {m.atkMax ? (
          <span style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 6, padding: "2px 8px" }}>
            <Icon name="sword" size={11} style={{ marginRight: 4 }} />
            {court(m.atkMax)} / coup
          </span>
        ) : null}
        {m.def != null ? (
          <span style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 6, padding: "2px 8px" }}>
            <Icon name="shield" size={11} style={{ marginRight: 4 }} />
            {entier(m.def)}
          </span>
        ) : null}
      </span>

      <span style={{ display: "flex", gap: 9, flexWrap: "wrap", fontSize: 11, color: "var(--text-muted)" }}>
        {faible.length > 0 && (
          <span style={{ color: "var(--green)" }}>Faible au {faible.map((e) => ELEMENT_FR[e].toLowerCase()).join(" et au ")}</span>
        )}
        {m.rage?.length ? <span><Icon name="flame" size={10} /> rage sous {m.rage[0].pv} %</span> : null}
        {m.invoque?.length ? <span><Icon name="users" size={10} /> invoque</span> : null}
        {m.soigne?.length ? <span><Icon name="sparkles" size={10} /> se soigne</span> : null}
        {m.maison && <span style={{ color: "var(--purple)", marginLeft: "auto" }}>AirFlyff</span>}
      </span>

      {m.delai ? (
        <span style={{ fontSize: 11, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
          <Icon name="clock" size={10} style={{ marginRight: 4 }} />{cadence(m.delai)}
        </span>
      ) : null}
    </Link>
  );
}
