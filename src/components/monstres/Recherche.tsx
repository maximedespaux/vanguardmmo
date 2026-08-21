"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { useCardFx } from "@/components/VgFx";
import { Faiblesses } from "./Graphiques";
import {
  cadence, cadenceCourte, coupMax, court, ELEMENT_FR, ELEMENTS, entier, iconeElement,
  portraitDe, TON_ELEMENT, tonRang, type Compteurs, type Monstre,
} from "./vocabulaire";

/**
 * CHERCHER UN MONSTRE — les 1 123 fiches du client du jeu.
 *
 * Rien n'arrive en bloc : le catalogue pèse 612 Ko, la route en renvoie 48 lignes
 * à la fois. On ne pagine pas non plus, exprès — au-delà de cinquante réponses la
 * bonne façon d'avancer est d'affiner le mot-clé ou de poser un filtre, pas de
 * tourner des pages.
 *
 * La frappe est amortie de 220 ms, et le `jeton` écarte les réponses qui
 * reviennent après la suivante : sans lui, taper « azharyon » lançait huit
 * requêtes et la plus lente écrasait la bonne.
 *
 * ┌──────── CE QUI A CHANGÉ DE PLACE, ET POURQUOI ────────┐
 * │ « Contenu Airborn » était une pastille parmi treize.   │
 * │ C'est le tri qui a le plus de valeur sur un serveur    │
 * │ privé, et il ouvre donc la recherche, en trois         │
 * │ branches qui portent leurs comptes — comptes RENVOYÉS  │
 * │ par la route, jamais écrits ici : un nombre tapé dans  │
 * │ un commentaire devient faux à la fouille suivante,     │
 * │ celui-ci l'était (235 quand le relevé en marque 256).  │
 * │ Le tri « Expérience » est parti : l'expérience ne      │
 * │ s'affiche nulle part, et ranger sur une colonne        │
 * │ invisible classe sans dire pourquoi.                   │
 * └───────────────────────────────────────────────────────┘
 */

type Reponse = {
  monstres: Monstre[]; total: number; montres: number;
  rangs: Record<string, number>;
  elements: Record<string, number>;
  provenances: { maison: number; base: number; tout: number };
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
] as const;

type Provenance = "" | "maison" | "base";

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

/** Les trois branches de provenance : plus hautes et plus larges que les pastilles,
 *  parce qu'elles ne sont pas un filtre parmi d'autres mais l'entrée de la page. */
function Branche({ on, onClick, icon, label, compte, couleur }: {
  on: boolean; onClick: () => void; icon: Parameters<typeof Icon>[0]["name"];
  label: string; compte?: number; couleur: string;
}) {
  return (
    <button onClick={onClick} className="fx-card" style={{
      flex: "1 1 150px", display: "flex", alignItems: "center", gap: 9, cursor: "pointer",
      fontFamily: "inherit", textAlign: "left", padding: "10px 13px", borderRadius: 11,
      background: on ? `color-mix(in srgb, ${couleur} 15%, var(--bg-3))` : "var(--bg-3)",
      border: `1px solid ${on ? couleur : "var(--border)"}`,
    }}>
      <Icon name={icon} size={17} style={{ color: couleur, flexShrink: 0 }} />
      <span style={{ minWidth: 0, flex: 1 }}>
        <span className="font-heading" style={{ display: "block", fontSize: 13, fontWeight: 700, color: on ? couleur : "var(--text)" }}>{label}</span>
        <span className="font-heading" style={{ display: "block", fontSize: 11.5, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
          {compte == null ? "—" : entier(compte)}
        </span>
      </span>
    </button>
  );
}

export function RechercheMonstres({ depart = "", departObjet = "", departProvenance = "", departVies = false }: {
  depart?: string;
  departObjet?: string;
  /**
   * DEUX FILTRES POSÉS DE L'EXTÉRIEUR — par les compteurs en tête de page.
   *
   * « 235 ajoutés par Airborn » et « 94 se relèvent » étaient de la décoration : on
   * lisait le nombre, et il fallait ensuite retrouver le filtre correspondant plus
   * bas. Les tuiles sont devenues l'entrée de la recherche, et ces deux propriétés
   * portent leur choix. Le composant est remonté par sa `key` côté parent — c'est
   * plus simple qu'un effet de synchronisation, et il n'y a rien à préserver.
   */
  departProvenance?: Provenance;
  departVies?: boolean;
}) {
  useCardFx();
  const [q, setQ] = useState(depart);
  const [objet, setObjet] = useState(departObjet);
  const [rang, setRang] = useState("");
  const [element, setElement] = useState("");
  const [nivMin, setNivMin] = useState("");
  const [nivMax, setNivMax] = useState("");
  const [provenance, setProvenance] = useState<Provenance>(departProvenance);
  const [vies, setVies] = useState(departVies);
  const [tri, setTri] = useState<(typeof TRIS)[number]["clef"]>("pertinence");
  const [r, setR] = useState<Reponse | null>(null);
  const [charge, setCharge] = useState(false);
  const jeton = useRef(0);

  const chercher = useCallback(async () => {
    const mien = ++jeton.current;
    setCharge(false);
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    // La route exige trois caractères : sous ce seuil, « an » ramènerait la moitié
    // du catalogue et le filtre passerait pour cassé.
    if (objet.trim().length >= 3) p.set("objet", objet.trim());
    if (rang) p.set("rang", rang);
    if (element) p.set("element", element);
    if (nivMin) p.set("nivMin", nivMin);
    if (nivMax) p.set("nivMax", nivMax);
    if (provenance) p.set("provenance", provenance);
    if (vies) p.set("vies", "1");
    if (tri !== "pertinence") p.set("tri", tri);
    const d = await fetch(`/api/monstres?${p}`).then((x) => (x.ok ? x.json() : null)).catch(() => null);
    if (mien !== jeton.current) return; // une réponse en retard n'écrase pas la bonne
    setR(d); setCharge(true);
  }, [q, objet, rang, element, nivMin, nivMax, provenance, vies, tri]);

  useEffect(() => { const t = setTimeout(chercher, 220); return () => clearTimeout(t); }, [chercher]);

  const chercheObjet = objet.trim().length >= 3;
  const filtre = Boolean(q.trim() || objet.trim() || rang || element || nivMin || nivMax || provenance || vies || tri !== "pertinence");

  return (
    <div style={{ display: "grid", gap: 14 }}>

      <div className="glass-card" style={{ padding: 16, display: "grid", gap: 12 }}>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Branche on={!provenance} onClick={() => setProvenance("")} icon="paw"
            label="Tout le catalogue" compte={r?.provenances.tout} couleur="var(--orange)" />
          <Branche on={provenance === "maison"} onClick={() => setProvenance("maison")} icon="sparkles"
            label="Ajoutés par Airborn" compte={r?.provenances.maison} couleur="var(--purple)" />
          <Branche on={provenance === "base"} onClick={() => setProvenance("base")} icon="book"
            label="Jeu d'origine" compte={r?.provenances.base} couleur="var(--text-muted)" />
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ position: "relative", flex: "1 1 260px", minWidth: 0 }}>
            <Icon name="search" size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
            {/* Le placeholder ne dit plus que les accents sont sans importance : la
                recherche le fait, et l'annoncer coûtait dix mots pour un joueur qui
                tape de toute façon sans accents. */}
            <input value={q} onChange={(e) => setQ(e.target.value)} autoFocus
              placeholder="Nom du monstre" style={{ ...champ, paddingLeft: 34 }} />
          </span>
          {/* CHERCHER PAR CE QU'IL LÂCHE — la question du farm, prise dans le bon
              sens. On lisait le butin d'un monstre qu'on avait déjà trouvé ; on ne
              pouvait pas partir de l'objet. Le champ copie la forme de son voisin,
              icône comprise, pour qu'il se lise comme la même mécanique. */}
          <span style={{ position: "relative", flex: "1 1 220px", minWidth: 0 }}>
            <Icon name="package" size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
            <input value={objet} onChange={(e) => setObjet(e.target.value)} aria-label="Ce qu'il lâche"
              placeholder="Ce qu'il lâche" style={{ ...champ, paddingLeft: 34 }} />
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, color: "var(--text-muted)" }}>
            Niveau
            <input value={nivMin} onChange={(e) => setNivMin(e.target.value.replace(/\D/g, "").slice(0, 3))}
              inputMode="numeric" placeholder="de" aria-label="Niveau minimum"
              style={{ ...champ, width: 60, textAlign: "center", padding: "9px 6px", fontVariantNumeric: "tabular-nums" }} />
            <input value={nivMax} onChange={(e) => setNivMax(e.target.value.replace(/\D/g, "").slice(0, 3))}
              inputMode="numeric" placeholder="à" aria-label="Niveau maximum"
              style={{ ...champ, width: 60, textAlign: "center", padding: "9px 6px", fontVariantNumeric: "tabular-nums" }} />
          </span>
        </div>

        {/* Les rangs sous leur nom de jeu : personne ne dit « RANK_LOW », tout le
            monde dit « le Jeune » et « le Géant ». */}
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
          <button onClick={() => { setQ(""); setObjet(""); setRang(""); setElement(""); setNivMin(""); setNivMax(""); setProvenance(""); setVies(false); setTri("pertinence"); }}
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
            {r.total === 1 ? "trouvé" : "trouvés"}
            {r.total > r.montres && <span>· {r.montres} affichés</span>}
          </>
        ) : "La recherche n’a pas répondu."}
      </div>

      {r && r.monstres.length === 0 && (
        <div className="glass-card" style={{ padding: "26px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13.5 }}>
          <Icon name="search" size={22} style={{ opacity: 0.5 }} />
          <p style={{ margin: "9px 0 0" }}>Rien sous ce nom.</p>
          {/* LA SEULE RÉSERVE QUI RESTE, et elle n'apparaît QUE quand elle sert : à
              zéro résultat sur un nom d'objet. Le butin ordinaire d'Airborn est
              calculé côté serveur — un joueur qui lit « aucun monstre » et en conclut
              que l'objet ne tombe pas irait farmer ailleurs pour rien. C'est une mise
              en garde qui change un geste, pas un constat d'ignorance affiché partout. */}
          {chercheObjet ? (
            <p style={{ margin: "6px 0 0", fontSize: 12.5 }}>
              Seul le butin ÉCRIT dans les fichiers est cherchable ici. Le butin ordinaire est décidé
              par le serveur : rien ne dit que cet objet ne tombe pas.
            </p>
          ) : (
            /* LE HORS-SUJET MÈNE À SON PROPRIÉTAIRE. « ni PNJ » était un cul-de-sac :
               un joueur qui tape « Boboko » ici lit qu'il s'est trompé de catalogue et
               doit retrouver le bon dans le menu. /pnj est la page qui répond — un mot,
               un lien, la règle « un sujet, une page » tenue jusqu'au bout. */
            <p style={{ margin: "6px 0 0", fontSize: 12.5 }}>
              Ce catalogue ne porte que ce qui se combat : ni{" "}
              <Link href="/pnj" style={{ color: "var(--orange)" }}>PNJ</Link>, ni familiers, ni œufs.
            </p>
          )}
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
  const seReleve = (m.vies ?? 0) > 1;
  /* Le portrait n'existe que pour une poignée de monstres du catalogue (cf.
     `portraitDe` : les cartes du client dont le dessin a été vérifié, plus les
     rendus détourés du wiki officiel). Quand il manque, on ne met RIEN à sa place —
     un cadre vide ferait croire à une image cassée, et un pictogramme générique
     répété 1 123 fois n'apprend rien. */
  const portrait = portraitDe(m.id);
  return (
    <Link href={`/monstres/${m.id}`} className="glass-card fx-card"
      style={{ padding: 12, display: "grid", gap: 7, textDecoration: "none", color: "var(--text)",
        borderColor: seReleve ? "color-mix(in srgb, var(--red) 32%, var(--border))" : undefined }}>

      <span style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
        {portrait && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={portrait.src} alt="" width={portrait.largeur} height={portrait.hauteur}
            style={{ maxHeight: 59, maxWidth: 66, height: "auto", width: "auto", borderRadius: 5, flexShrink: 0, border: "1px solid var(--border)" }} />
        )}
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

      <span style={{ display: "flex", gap: 6, flexWrap: "wrap", fontSize: 11.5, fontVariantNumeric: "tabular-nums", alignItems: "center" }}>
        {/* « · 15 vies » écrit en clair, c'est un mot de plus sur chacune des
            quarante-huit cartes. « ×15 » dit la même chose et dit en plus l'opération
            qui donne le chiffre d'à côté : les PV affichés SONT les PV d'une vie
            multipliés par ce nombre. L'infobulle porte le mot. */}
        <span style={{ background: "var(--bg-3)", border: `1px solid ${seReleve ? "color-mix(in srgb, var(--red) 45%, var(--border))" : "var(--border)"}`, borderRadius: 6, padding: "2px 8px" }}>
          <Icon name="heart" size={11} style={{ marginRight: 4 }} />
          {court(m.pvEff)} PV
          {seReleve ? (
            <span title={`${m.vies} vies à vider`} style={{ color: "var(--red)", fontWeight: 700, marginLeft: 5 }}>×{m.vies}</span>
          ) : null}
        </span>
        {/* `coupMax` : la même valeur que la fiche du monstre et que le relevé des
            world boss, pour que la vignette et la fiche ne se contredisent pas au clic. */}
        {coupMax(m) ? (
          <span style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 6, padding: "2px 8px" }}>
            <Icon name="sword" size={11} style={{ marginRight: 4 }} />
            {court(coupMax(m))}
          </span>
        ) : null}
        {m.def != null ? (
          <span style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 6, padding: "2px 8px" }}>
            <Icon name="shield" size={11} style={{ marginRight: 4 }} />
            {entier(m.def)}
          </span>
        ) : null}
        <span style={{ marginLeft: "auto" }}><Faiblesses res={m.res} bulle={false} /></span>
      </span>

      {/* LES MÉCANIQUES EN ICÔNES, PLUS EN MOTS.
          « rage 30 % · invoque · se soigne » écrit en clair, c'est jusqu'à quatre mots
          par carte et quarante-huit cartes à l'écran — deux cents mots pour trois faits
          binaires que l'icône dit déjà. Le mot passe dans `title` et dans
          `aria-label` : rien n'est perdu, ni au survol ni pour un lecteur d'écran.
          Le SEUIL de rage reste écrit, lui : c'est un nombre, et aucune icône ne le
          porte. « Airborn » reste écrit aussi — la spécificité du serveur passe
          devant, et une pastille muette n'annonce rien. */}
      <span style={{ display: "flex", gap: 9, flexWrap: "wrap", fontSize: 11, color: "var(--text-muted)", alignItems: "center" }}>
        {m.delai ? (
          <span title={cadence(m.delai) ?? undefined} style={{ fontVariantNumeric: "tabular-nums" }}>
            <Icon name="clock" size={10} style={{ marginRight: 4 }} />{cadenceCourte(m.delai)}
          </span>
        ) : null}
        {m.rage?.length ? (
          <span role="img" aria-label={`Entre en rage sous ${m.rage[0].pv} % de ses PV`} title={`Entre en rage sous ${m.rage[0].pv} % de ses PV`}
            style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "var(--red)", fontVariantNumeric: "tabular-nums" }}>
            <Icon name="flame" size={11} />{m.rage[0].pv} %
          </span>
        ) : null}
        {m.invoque?.length ? (
          <span role="img" aria-label="Il invoque des monstres" title="Il invoque des monstres" style={{ display: "inline-flex", color: "var(--purple)" }}>
            <Icon name="users" size={11} />
          </span>
        ) : null}
        {m.soigne?.length ? (
          <span role="img" aria-label="Il se soigne en combat" title="Il se soigne en combat" style={{ display: "inline-flex", color: "var(--green)" }}>
            <Icon name="sparkles" size={11} />
          </span>
        ) : null}
        {m.maison && <span style={{ color: "var(--purple)", marginLeft: "auto" }}>Airborn</span>}
      </span>
    </Link>
  );
}
