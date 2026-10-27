"use client";
import { Icon } from "@/components/Icon";
import { survolFige, type ChiffreFige } from "@/lib/evenements";

/**
 * LE CHIFFRE D'UN JOUEUR DE LA SÉANCE, TEL QU'IL L'AVAIT DÉCLARÉ (décision 9 de Maxime) : la
 * clôture et les bilans le montrent avec sa date de mesure (au survol) et, s'il avait vieilli
 * ce soir-là, le témoin « à remesurer » — jamais comme une valeur vérifiée.
 *
 * La pastille recopie celle de la page des Chambres (`ChiffresPoste`, compositions/page.tsx :
 * 9,5 px, rayon 99, filet or, horloge) : le même témoin dit la même chose partout.
 */
export function ChiffreDeclare({ enLigne, chiffres, style }: { enLigne: string; chiffres: ChiffreFige[]; style?: React.CSSProperties }) {
  if (!enLigne) return null;
  const vieux = chiffres.some((c) => c.aRemesurer);
  const titre = chiffres.length ? chiffres.map(survolFige).join("\n") : "Chiffre déclaré dans l'AirBuilder, jamais vérifié";
  return (
    <span title={titre} style={{ display: "inline-flex", alignItems: "center", gap: 5, flexWrap: "wrap", fontVariantNumeric: "tabular-nums", minWidth: 0, ...style }}>
      <span style={{ whiteSpace: "nowrap" }}>{enLigne}</span>
      {vieux && (
        <span style={{ fontSize: 9.5, fontWeight: 400, color: "var(--gold)", border: "1px solid var(--gold)", borderRadius: 99, padding: "1px 7px", display: "inline-flex", alignItems: "center", gap: 3, whiteSpace: "nowrap" }}>
          <Icon name="clock" size={9} />à remesurer
        </span>
      )}
    </span>
  );
}
