"use client";
import { useMemo, useState } from "react";
import { Icon, type IconName } from "@/components/Icon";
import { Chercher, Chiffre, Chiffres, Pastille, Source } from "./briques";
import { clef, nb, type FamilleSucces } from "./donnees";

/**
 * LES 192 SUCCÈS — par famille, jamais en liste.
 *
 * Deux choses à ne pas trahir ici.
 *
 * 1. Le client nomme les 192 marches, mais leurs SEUILS et leurs lots vivent
 *    côté serveur (`defineachievement.h` le dit lui-même). On montre donc le
 *    gabarit — quelles marches existent, dans quel ordre — et on se garde
 *    d'inventer « ramasser 10 000 penyas » là où le client n'écrit que
 *    « RAMASSER_PENYAS_1 ». Un palier sans chiffre reste utile ; un chiffre
 *    inventé ne l'est jamais.
 *
 * 2. Les sept donjons à succès partagent EXACTEMENT le même gabarit de marches.
 *    Recopier neuf lignes identiques sept fois de suite aurait rempli l'écran
 *    sans rien apprendre : on le dit une fois, et chaque donjon montre ce qui
 *    lui manque par rapport au gabarit.
 */

const BLOCS: { cle: FamilleSucces["bloc"]; label: string; icon: IconName; quoi: string }[] = [
  { cle: "chasse", label: "Chasse de Madrigal", icon: "target", quoi: "Une liste d'espèces par région, puis la région entière." },
  { cle: "donjon", label: "Donjons", icon: "cave", quoi: "Sept instances, le même gabarit de marches pour chacune." },
  { cle: "autre", label: "Le reste", icon: "list", quoi: "Niveaux, métiers, quêtes, guilde — trois paliers en général." },
];

export function Succes({ familles, nbSucces, source }: {
  familles: FamilleSucces[]; nbSucces: number; source: string;
}) {
  const [q, setQ] = useState("");
  const [bloc, setBloc] = useState<string>("");

  const comptes = useMemo(() => {
    const c: Record<string, number> = {};
    for (const f of familles) c[f.bloc] = (c[f.bloc] ?? 0) + 1;
    return c;
  }, [familles]);

  const vues = useMemo(() => {
    const k = clef(q.trim());
    return familles.filter((f) =>
      (!bloc || f.bloc === bloc) &&
      (!k || clef(f.nom).includes(k)
        || f.marches.some((m) => clef(m).includes(k))
        || (f.cibles ?? []).some((c) => clef(c.n).includes(k))));
  }, [familles, q, bloc]);

  const b = BLOCS.find((x) => x.cle === bloc);

  return (
    <div>
      <Chiffres>
        <Chiffre valeur={nb(nbSucces)} quoi="succès nommés par le client" icon="trophy" />
        <Chiffre valeur={familles.length} quoi="familles pour s'y retrouver" icon="layers" couleur="var(--gn-accent)" />
        <Chiffre valeur="0" quoi="seuil connu — ils sont côté serveur" icon="lock" couleur="var(--text-muted)" />
      </Chiffres>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 11 }}>
        <Chercher valeur={q} sur={setQ} invite="Une famille, une espèce, une marche" />
      </div>

      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 5 }}>
        <Pastille on={!bloc} onClick={() => setBloc("")}>Tout <span style={{ fontVariantNumeric: "tabular-nums", opacity: 0.6 }}>{familles.length}</span></Pastille>
        {BLOCS.map((x) => (
          <Pastille key={x.cle} on={bloc === x.cle} onClick={() => setBloc(bloc === x.cle ? "" : x.cle)}>
            <Icon name={x.icon} size={13} />{x.label}
            <span style={{ fontVariantNumeric: "tabular-nums", opacity: bloc === x.cle ? 0.7 : 0.55 }}>{comptes[x.cle] ?? 0}</span>
          </Pastille>
        ))}
      </div>
      <p style={{ margin: "0 0 13px", fontSize: 12, color: "var(--text-muted)", minHeight: 17 }}>
        {b ? b.quoi : "Trois blocs : la chasse au bestiaire, les donjons, et tout le reste."}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(288px,1fr))", gap: 10 }}>
        {vues.map((f) => <CarteFamille key={f.cle} f={f} />)}
      </div>

      {vues.length === 0 && (
        <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13, padding: "26px 0" }}>
          Aucune famille sous ce mot.
        </p>
      )}

      <Source fichier={source}
        avertissement={<>Le client nomme les 192 succès mais garde leurs <b>seuils</b> et leurs <b>lots</b> côté serveur. Ce qu'on montre est donc la liste des marches, pas les chiffres à atteindre.</>} />
    </div>
  );
}

function CarteFamille({ f }: { f: FamilleSucces }) {
  const cibles = f.cibles ?? [];
  const total = cibles.length + f.marches.length;
  return (
    <div className="fx-card" style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 12, padding: 13 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 9 }}>
        <span style={{ width: 30, height: 30, flexShrink: 0, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--gn-accent)" }}>
          <Icon name={f.icon as IconName} size={15} />
        </span>
        <span className="font-heading" style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 700 }}>{f.nom}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--gold)", fontVariantNumeric: "tabular-nums", padding: "1px 8px", borderRadius: 20, background: "var(--bg-3)", border: "1px solid var(--border)" }}>{total}</span>
      </div>

      {/* Les espèces sont des pastilles, pas des phrases : « Chasser les Aibatt,
          chasser les Mushpang… » vingt fois de suite est illisible, alors que
          vingt pastilles se balaient d'un regard. Le niveau va avec l'espèce —
          c'est lui qui dit si c'est à ma portée. */}
      {cibles.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: f.marches.length ? 9 : 0 }}>
          {cibles.map((c) => (
            <span key={c.n} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, padding: "3px 8px", borderRadius: 7, background: "var(--bg-3)", border: "1px solid var(--border)" }}>
              {c.n}
              {c.niv ? <b style={{ color: "var(--text-muted)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{c.niv}</b> : null}
            </span>
          ))}
        </div>
      )}

      {/* Une région sans cible listée n'est pas une erreur d'extraction : le
          client définit bien le succès « premier du serveur » sans lister une
          seule espèce. Le dire évite qu'on cherche la liste manquante. */}
      {f.bloc === "chasse" && cibles.length === 0 && f.cle !== "CHASSE_TOUT" && (
        <p style={{ margin: "0 0 9px", fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.45 }}>
          Le client ne liste aucune espèce pour cette région — seule la marche ci-dessous y existe.
        </p>
      )}

      {f.marches.length > 0 && (
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 5 }}>
          {f.marches.map((m) => (
            <li key={m} style={{ display: "flex", gap: 7, alignItems: "flex-start", fontSize: 12, lineHeight: 1.4 }}>
              <Icon name="chevron-right" size={12} style={{ color: "var(--gn-accent)", flexShrink: 0, marginTop: 3 }} />
              <span>{m}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
