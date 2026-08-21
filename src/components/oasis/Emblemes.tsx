import Link from "next/link";
import { Icon } from "@/components/Icon";
import { DEBOUCHES, EMBLEME_SIMPLE, EMBLEME_SUP, ICONE_EMBLEME, nb, type Bilan } from "./modele";

/**
 * CE QUE TU RAPPORTES, ET CE QUE ÇA T'ACHÈTE.
 *
 * Sur 52 vagues, il n'y a que DEUX objets de prime : l'emblème de protection et
 * sa version supérieure. Dit comme ça, le mode a l'air maigre. Sauf que la table
 * d'échanges d'Airborn réclame ces emblèmes par MILLIERS pour les parchemins de
 * prestige 6, 7 et 10 : ce ne sont pas des trophées, c'est la monnaie du haut du
 * jeu. C'est cette information qui manquait au site, et sans elle un joueur ne
 * peut pas décider si le mode vaut sa soirée.
 *
 * Le calcul qui suit est fait à partir des données, pas recopié : le jour où une
 * prime change, les nombres suivent.
 */
export function Emblemes({ b }: { b: Bilan }) {
  const parTour = b.primeSimple + b.primeSup;
  /** Le mur le plus proche : le parchemin de prestige 6 réclame 5 000 ordinaires. */
  const cible = 5000;
  const toursSansConvertir = Math.ceil(cible / b.primeSimple);
  const toursEnConvertissant = Math.ceil(cible / parTour);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 10, marginBottom: 16 }}>
        <Prime nom={EMBLEME_SIMPLE} qte={b.primeSimple} vagues={b.vaguesSimples} tone="var(--text)" />
        <Prime nom={EMBLEME_SUP} qte={b.primeSup} vagues={b.vaguesSup} tone="var(--gold)" />
      </div>

      <p style={{ fontSize: 13, lineHeight: 1.65, color: "var(--text-muted)", marginBottom: 16 }}>
        Un tour complet te laisse <b style={{ color: "var(--text)" }}>{nb(parTour)} emblèmes</b>, et la
        courbe monte fort sur la fin : la vague 1 paie 1 emblème, la vague 52 en paie 150. Rien d&apos;autre
        ne tombe de garanti — <b style={{ color: "var(--text)" }}>deux objets de prime pour 52 vagues</b>,
        c&apos;est tout ce que le mode annonce.
      </p>

      <SousTitre>Ce que les emblèmes achètent</SousTitre>
      <div style={{ display: "grid", gap: 9, marginBottom: 18 }}>
        {DEBOUCHES.map((d) => (
          <div key={d.donne} className="fx-card" style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px" }}>
            <div className="font-heading" style={{ fontSize: 13.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="swap" size={14} style={{ color: "var(--orange)", flexShrink: 0 }} />{d.donne}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {d.cout.map((c) => {
                const embleme = c.quoi === EMBLEME_SIMPLE || c.quoi === EMBLEME_SUP;
                return (
                  <span key={c.quoi} style={{
                    display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, borderRadius: 6, padding: "3px 9px",
                    fontVariantNumeric: "tabular-nums",
                    background: embleme ? "rgba(255,140,26,0.09)" : "var(--bg-3)",
                    border: `1px solid ${embleme ? "var(--orange-dark)" : "var(--border)"}`,
                    color: embleme ? "var(--orange)" : "var(--text-muted)",
                  }}>
                    {embleme && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={ICONE_EMBLEME} alt="" width={14} height={14} style={{ objectFit: "contain" }} />
                    )}
                    {c.quoi} ×{nb(c.qte)}
                  </span>
                );
              })}
            </div>
            {d.note && <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 8, lineHeight: 1.55 }}>{d.note}</div>}
          </div>
        ))}
      </div>

      <SousTitre>Combien de tours pour un parchemin de prestige</SousTitre>
      <div style={{ background: "var(--bg-3)", borderRadius: 12, padding: 14, fontSize: 13, lineHeight: 1.7 }}>
        Le parchemin qui fait passer au <Link href="/prestige" style={{ color: "var(--orange)", textDecoration: "none" }}>prestige 6</Link> réclame
        {" "}<b style={{ fontVariantNumeric: "tabular-nums" }}>{nb(cible)} emblèmes ordinaires</b>. Or un tour complet n&apos;en donne
        que <b style={{ fontVariantNumeric: "tabular-nums" }}>{nb(b.primeSimple)}</b> : à ce rythme,
        il faut <b style={{ color: "var(--red)", fontVariantNumeric: "tabular-nums" }}>{toursSansConvertir} tours complets</b> des
        52 vagues.
        <div style={{ marginTop: 9, paddingTop: 9, borderTop: "1px solid var(--border)" }}>
          Sauf qu&apos;un emblème supérieur s&apos;échange contre un ordinaire, <b>un pour un</b> — et le mode
          en distribue {nb(b.primeSup)} par tour. En convertissant, le même parchemin tombe
          à <b style={{ color: "var(--green)", fontVariantNumeric: "tabular-nums" }}>{toursEnConvertissant} tours</b>.
          {" "}C&apos;est le seul calcul de cette page qui change vraiment une soirée de farm, alors
          vérifie d&apos;abord que le menu d&apos;échange est bien ouvert : il est rangé sous un menu de
          Noël, et on n&apos;a pas pu confirmer qu&apos;il tourne toute l&apos;année.
        </div>
      </div>
    </div>
  );
}

function Prime({ nom, qte, vagues, tone }: { nom: string; qte: number; vagues: number; tone: string }) {
  return (
    <div className="fx-card" style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={ICONE_EMBLEME} alt="" width={34} height={34} style={{ objectFit: "contain", flexShrink: 0 }} />
      <div style={{ minWidth: 0 }}>
        <div className="font-heading" style={{ fontSize: 17, fontWeight: 700, color: tone, fontVariantNumeric: "tabular-nums" }}>{nb(qte)}</div>
        <div style={{ fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.4 }}>{nom}, sur {vagues} vagues</div>
      </div>
    </div>
  );
}

/** Même forme de sous-titre que le panneau voisin : une seule police, une seule casse. */
function SousTitre({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-heading" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.1, color: "var(--orange)", margin: "0 0 10px" }}>
      {children}
    </div>
  );
}
