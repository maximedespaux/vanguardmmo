"use client";
import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { useCardFx } from "@/components/VgFx";
import { RechercheMonstres } from "./Recherche";
import {
  AVERTISSEMENT_BUTIN, cadence, court, ELEMENT_FR, entier, faiblesses,
  iconeElement, tonRang, type Compteurs, type Monstre,
} from "./vocabulaire";

/**
 * LES TROIS FAÇONS D'ARRIVER SUR UN MONSTRE.
 *
 * On cherche par nom quand on sait déjà qui on affronte. On lit le classement
 * quand on prépare un run et qu'on veut savoir à quoi on s'attaque. On regarde
 * les frappeurs quand on est tank et que la question est « est-ce que je tiens ».
 * Trois questions différentes, donc trois entrées — pas trois pages, parce
 * qu'elles partagent le même catalogue.
 *
 * Le classement et les frappeurs sont calculés côté serveur et passés en
 * propriétés : ils ne bougent jamais, les recalculer à chaque affichage aurait
 * relu 1 124 lignes pour un résultat identique.
 */

type Onglet = "chercher" | "boss" | "frappeurs";

export function EcranMonstres({ boss, frappeurs, compteurs, total, groupes }: {
  boss: Monstre[]; frappeurs: Monstre[]; compteurs: Compteurs; total: number;
  groupes: { nom: string; n: number }[];
}) {
  useCardFx();
  const [onglet, setOnglet] = useState<Onglet>("chercher");

  return (
    <div style={{ display: "grid", gap: 16 }}>

      {/* Ce que le catalogue contient, en chiffres — avant les filtres. C'est ce
          qui donne l'échelle : « 142 monstres au-dessus du milliard de PV » dit
          plus sur le haut niveau d'AirFlyff qu'un paragraphe. */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(146px,1fr))", gap: 9 }}>
        <Chiffre icon="paw" valeur={entier(total)} quoi="monstres dans le client" />
        <Chiffre icon="skull" valeur={entier(compteurs.vies)} quoi="boss qui se relèvent" ton="var(--red)" />
        <Chiffre icon="heart" valeur={entier(compteurs.milliard)} quoi="au-delà du milliard de PV" ton="var(--orange)" />
        <Chiffre icon="flame" valeur={entier(compteurs.rage)} quoi="entrent en rage" ton="var(--gold)" />
        <Chiffre icon="sparkles" valeur={entier(compteurs.maison)} quoi="ajoutés par AirFlyff" ton="var(--purple)" />
        <Chiffre icon="map-pin" valeur={entier(compteurs.localises)} quoi="localisés sur une carte" ton="var(--blue)" />
      </div>

      {/* L'avertissement est en haut de page, pas au fond d'une fiche : quelqu'un
          qui parcourt la recherche sans ouvrir une seule fiche doit l'avoir lu. */}
      <div style={{ border: "1px dashed var(--border)", borderRadius: 11, padding: "12px 14px", fontSize: 12.5, color: "var(--text-muted)", display: "flex", gap: 9, alignItems: "flex-start" }}>
        <Icon name="alert" size={15} style={{ color: "var(--gold)", flexShrink: 0, transform: "translateY(1px)" }} />
        <span>{AVERTISSEMENT_BUTIN}</span>
      </div>

      <div className="vg-subtabs" style={{ margin: 0 }}>
        {([["chercher", "Chercher un monstre"], ["boss", "Les boss par PV à sortir"], ["frappeurs", "Ceux qui frappent le plus fort"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setOnglet(k)} className={`vg-subtab ${onglet === k ? "active" : ""}`}>{l}</button>
        ))}
      </div>

      {onglet === "chercher" && <RechercheMonstres />}

      {onglet === "boss" && (
        <div style={{ display: "grid", gap: 14 }}>
          <div className="glass-card" style={{ padding: "14px 16px", fontSize: 13, lineHeight: 1.55 }}>
            <b style={{ color: "var(--red)" }}>Un boss à plusieurs vies ne meurt pas quand sa barre atteint zéro.</b>{" "}
            Il repart à plein PV et son compteur descend d&apos;une vie. Les PV à sortir valent donc{" "}
            <b>PV × vies</b>, et le chiffre affiché en jeu ne le dit nulle part : Azharyon annonce 2 milliards,
            il en faut 30. {compteurs.vies} monstres du client fonctionnent comme ça. C&apos;est le premier
            chiffre à connaître avant de composer un groupe.
          </div>

          <TableauBoss lignes={boss} colonne="pvEff" />

          {/* Les regroupements par donjon : utile pour savoir de quel contenu on
              parle quand on voit un boss remonter dans le classement. */}
          <div>
            <div className="font-heading" style={{ fontSize: 12.5, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--orange)", margin: "4px 0 9px" }}>
              Les contenus reconstitués
            </div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {groupes.map((g) => (
                <span key={g.nom} style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 20, padding: "4px 11px", fontSize: 12.5, display: "inline-flex", gap: 6, alignItems: "center" }}>
                  {g.nom}
                  <b style={{ color: "var(--gold)", fontVariantNumeric: "tabular-nums" }}>{g.n}</b>
                </span>
              ))}
            </div>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "8px 0 0" }}>
              Les rosters sont reconstruits par préfixe d&apos;identifiant interne : un monstre créé par le
              serveur au fil d&apos;un run n&apos;y figure pas, et son absence ne veut pas dire qu&apos;il n&apos;existe pas.
            </p>
          </div>
        </div>
      )}

      {onglet === "frappeurs" && (
        <div style={{ display: "grid", gap: 14 }}>
          <div className="glass-card" style={{ padding: "14px 16px", fontSize: 13, lineHeight: 1.55 }}>
            Les PV disent combien de temps dure le combat ; les dégâts par coup et la <b>cadence</b> disent
            si le tank tient. Un monstre ordinaire frappe toutes les 3 à 6 secondes. Les boss des Chambres
            Secrètes sont entre 250 et 375 ms, et certains boss du Chaos descendent à 101 ms — à plusieurs
            millions de dégâts par coup, ce n&apos;est pas le même métier.
          </div>
          <TableauBoss lignes={frappeurs} colonne="degats" />
        </div>
      )}
    </div>
  );
}

function Chiffre({ icon, valeur, quoi, ton = "var(--text)" }: {
  icon: Parameters<typeof Icon>[0]["name"]; valeur: string; quoi: string; ton?: string;
}) {
  return (
    <div className="fx-card" style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 13px", minWidth: 0 }}>
      <div className="font-heading" style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 20, fontWeight: 700, color: ton, fontVariantNumeric: "tabular-nums" }}>
        <Icon name={icon} size={15} style={{ color: ton, opacity: 0.85 }} />{valeur}
      </div>
      <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>{quoi}</div>
    </div>
  );
}

/**
 * Le classement, en tableau et non en cartes : ici on COMPARE des chiffres entre
 * eux, et des cartes côte à côte ne s'alignent pas. Il défile dans son propre
 * conteneur — sinon c'est la page entière qui gagne une barre horizontale sur un
 * téléphone.
 */
function TableauBoss({ lignes, colonne }: { lignes: Monstre[]; colonne: "pvEff" | "degats" }) {
  const th: React.CSSProperties = {
    textAlign: "right", padding: "8px 10px", fontSize: 11, textTransform: "uppercase",
    letterSpacing: ".6px", color: "var(--text-muted)", fontWeight: 700, whiteSpace: "nowrap",
  };
  const td: React.CSSProperties = {
    textAlign: "right", padding: "8px 10px", fontSize: 12.5, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap",
  };
  return (
    <div className="glass-card" style={{ padding: 0, overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            <th style={{ ...th, textAlign: "left", width: 34 }}>#</th>
            <th style={{ ...th, textAlign: "left" }}>Monstre</th>
            <th style={th}>Niv.</th>
            <th style={th}>{colonne === "pvEff" ? "PV à sortir" : "PV"}</th>
            <th style={th}>Vies</th>
            <th style={th}>Dégâts / coup</th>
            <th style={th}>Cadence</th>
            <th style={{ ...th, textAlign: "left" }}>Faible à</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((m, i) => {
            const { faible } = faiblesses(m.res);
            const ic = iconeElement(m.elem);
            return (
              <tr key={m.id} style={{ borderTop: i ? "1px solid color-mix(in srgb, var(--border) 50%, transparent)" : "none" }}>
                <td style={{ ...td, textAlign: "left", color: "var(--text-muted)" }}>{i + 1}</td>
                <td style={{ ...td, textAlign: "left", whiteSpace: "normal", minWidth: 200 }}>
                  <Link href={`/monstres/${m.id}`} style={{ color: "var(--text)", textDecoration: "none", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}>
                    {ic && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={ic} alt="" title={ELEMENT_FR[m.elem!] ?? ""} width={15} height={15} style={{ objectFit: "contain", flexShrink: 0 }} />
                    )}
                    {m.nom}
                  </Link>
                  {m.groupe && <span style={{ display: "block", fontSize: 11, color: "var(--text-muted)" }}>{m.groupe}</span>}
                </td>
                <td style={{ ...td, color: tonRang(m.rang) }}>{m.niv ?? "—"}</td>
                <td style={{ ...td, fontWeight: 700, color: colonne === "pvEff" ? "var(--orange)" : "var(--text)" }}>
                  {court(colonne === "pvEff" ? m.pvEff : m.pv)}
                </td>
                <td style={{ ...td, color: (m.vies ?? 0) > 1 ? "var(--red)" : "var(--text-muted)", fontWeight: (m.vies ?? 0) > 1 ? 700 : 400 }}>
                  {m.vies ?? "1"}
                </td>
                <td style={{ ...td, fontWeight: colonne === "degats" ? 700 : 400, color: colonne === "degats" ? "var(--red)" : "var(--text)" }}>
                  {m.atkMax ? court(m.atkMax) : "—"}
                </td>
                <td style={{ ...td, color: "var(--text-muted)" }}>{cadence(m.delai) ?? "—"}</td>
                <td style={{ ...td, textAlign: "left", color: "var(--green)" }}>
                  {faible.length ? faible.map((e) => ELEMENT_FR[e]).join(", ") : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
