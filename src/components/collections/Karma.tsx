"use client";
import { Icon } from "@/components/Icon";
import { Bloc, Chiffre, Chiffres, Source, Tableau, td, tdNum, th } from "./briques";
import { nb, type Karma as TKarma } from "./donnees";

/**
 * LE KARMA PK — treize grades, et ce qu'ils coûtent vraiment.
 *
 * Le jeu affiche une couleur au-dessus du pseudo et rien d'autre : personne ne
 * sait qu'à « Meurtrier » on achète au DOUBLE du prix et qu'on revend à la
 * moitié. Ce sont les deux colonnes qui font le sujet, donc elles ne sont pas
 * en bout de tableau.
 *
 * La couleur de chaque grade est celle du client, pas une couleur de la charte :
 * c'est à ça qu'on reconnaît un joueur en jeu, la recopier serait la trahir.
 * Certaines sont très sombres sur notre fond noir — d'où la pastille pleine
 * plutôt que du texte coloré.
 *
 * Deux champs valent « = » sur le dernier grade dans le fichier du client : on
 * les rend tels quels. Recopier la valeur du grade voisin aurait produit un
 * chiffre qui n'existe nulle part.
 */
export function Karma({ grades, source }: { grades: TKarma[]; source: string }) {
  const pire = grades[grades.length - 1];
  const neutre = grades.find((g) => g.grade === 0);

  const prix = (v: number | string) => {
    if (typeof v === "string") return v === "=" ? "idem" : v;
    return v === 1 ? "—" : `×${v}`;
  };

  return (
    <div>
      <Chiffres>
        <Chiffre valeur={grades.length} quoi="grades, de Révéré à Démoniaque" icon="path" />
        <Chiffre valeur="×5" quoi="prix d'achat au grade le plus infâme" icon="cart" couleur="var(--red)" />
        <Chiffre valeur={`${pire?.chance ?? 0} %`} quoi="risque de lâcher un objet en mourant" icon="alert" couleur="var(--red)" />
        <Chiffre valeur={`−${Math.abs(grades[0]?.xp ?? 0)} %`} quoi="XP perdue en mourant, au meilleur grade" icon="shield" couleur="var(--green)" />
      </Chiffres>

      <Tableau>
        <thead>
          <tr>
            <th style={th}>Grade</th>
            <th style={{ ...th, textAlign: "right" }}>Karma</th>
            <th style={{ ...th, textAlign: "right" }}>Achat</th>
            <th style={{ ...th, textAlign: "right" }}>Vente</th>
            <th style={{ ...th, textAlign: "right" }}>XP perdue</th>
            <th style={{ ...th, textAlign: "right" }}>Penyas lâchées</th>
            <th style={{ ...th, textAlign: "right" }}>Risque objet</th>
            <th style={th}>Gardes</th>
          </tr>
        </thead>
        <tbody>
          {grades.map((g) => (
            <tr key={g.grade} style={g.grade === 0 ? { background: "rgba(255,255,255,.025)" } : undefined}>
              <td style={{ ...td, whiteSpace: "nowrap" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <span aria-hidden style={{ width: 11, height: 11, borderRadius: 3, flexShrink: 0, background: g.col, border: "1px solid rgba(255,255,255,.28)" }} />
                  <b style={{ fontWeight: 600 }}>{g.n}</b>
                </span>
              </td>
              <td style={{ ...tdNum, color: "var(--text-muted)" }}>
                {g.grade === pire?.grade ? "au-delà" : nb(g.pts)}
              </td>
              <td style={{ ...tdNum, color: typeof g.remise === "number" && g.remise > 1 ? "var(--red)" : typeof g.remise === "number" && g.remise < 1 ? "var(--green)" : "var(--text-muted)" }}>
                {prix(g.remise)}
              </td>
              <td style={{ ...tdNum, color: typeof g.vente === "number" && g.vente < 1 ? "var(--red)" : typeof g.vente === "number" && g.vente > 1 ? "var(--green)" : "var(--text-muted)" }}>
                {prix(g.vente)}
              </td>
              <td style={{ ...tdNum, color: g.xp > 0 ? "var(--red)" : g.xp < 0 ? "var(--green)" : "var(--text-muted)" }}>
                {g.xp === 0 ? "—" : `${g.xp > 0 ? "+" : "−"}${Math.abs(g.xp)} %`}
              </td>
              <td style={tdNum}>{g.penyas ? `${g.penyas} %` : "—"}</td>
              <td style={{ ...tdNum, color: g.chance >= 40 ? "var(--red)" : undefined }}>{g.chance ? `${g.chance} %` : "—"}</td>
              <td style={{ ...td, whiteSpace: "nowrap" }}>
                {g.gardes
                  ? <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--red)", fontSize: 12 }}><Icon name="alert" size={12} />hostiles</span>
                  : <span style={{ color: "var(--text-muted)" }}>—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </Tableau>

      <Bloc titre="Comment le lire" icon="info">
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.65, color: "var(--text)" }}>
          <li><b>Achat</b> et <b>Vente</b> multiplient les prix des PNJ. Un « Révéré » achète 5 % moins cher et revend 5 % plus cher ; un « Impitoyable » achète cinq fois le prix et revend le cinquième.</li>
          <li><b>XP perdue</b> en négatif est un cadeau : les bons grades perdent MOINS que la normale en mourant.</li>
          {neutre && <li>Le grade <b>{neutre.n}</b> est celui de tout le monde — c&apos;est la ligne de référence, pas un état particulier.</li>}
          <li><b>Gardes hostiles</b> : à partir de « Meurtrier », les gardes des villes attaquent à vue.</li>
        </ul>
      </Bloc>

      <Source fichier={source}
        avertissement={<>Le seuil de karma du dernier grade vaut 0 dans le fichier du client — c&apos;est un « en dessous de tout le reste », pas un zéro. On écrit « au-delà » plutôt que de recopier le chiffre.</>} />
    </div>
  );
}
