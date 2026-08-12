"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { findClass } from "@/data/classes";
import { Cadre, Encart, Pastille, SousTitre, TD, TH } from "./ui";
import { coutCumule, fmt, type Entree, type HorsClasse, type Lignee } from "./donnees";

/**
 * Les quatre sections qui EXPLIQUENT, à côté du catalogue qui liste.
 *
 * Elles existent parce que les chiffres du client mentent par omission : la
 * table de coût laisse croire à une courbe régulière alors qu'elle a deux murs,
 * et les paliers Maître et Héros ont un niveau 5 qui n'est pas la suite des
 * quatre premiers. Un catalogue seul ne dit rien de ça.
 */

const NUM = { fontVariantNumeric: "tabular-nums" } as const;

// ══════════════════════════════════════════════════════════════════════════
//  CE QUE ÇA COÛTE
// ══════════════════════════════════════════════════════════════════════════

/**
 * Les marches où le prix d'un palier DOUBLE, trouvées dans les données plutôt
 * que recopiées : si la table change un jour, la page suit.
 *
 * Deux garde-fous appris à la première tentative, qui en signalait neuf :
 *  · on ne regarde qu'à partir du niveau 5 — en bas de table, la base est si
 *    petite (40 points) que passer à 100 fait un ×2,5 qui ne coûte rien ;
 *  · le seuil est à ×1,9, pas ×1,35. Une hausse de 40 % est le rythme ordinaire
 *    de cette table ; appeler ça un mur revenait à dire que tout est un mur.
 */
function marches(table: { niveau: number; xp: number }[]) {
  return table
    .filter((x) => x.niveau >= 5)
    .map((x) => {
      const avant = table.find((y) => y.niveau === x.niveau - 1);
      return { niveau: x.niveau, xp: x.xp, facteur: avant && avant.xp > 0 ? x.xp / avant.xp : null };
    })
    .filter((x) => x.facteur != null && x.facteur >= 1.9);
}

const COMPTE_MOT = ["aucune", "une", "deux", "trois", "quatre", "cinq"];

export function Budget({ table, lignees }: { table: { niveau: number; xp: number }[]; lignees: Lignee[] }) {
  const [vise, setVise] = useState(10);
  const paliers = useMemo(() => table.filter((x) => x.niveau >= 1), [table]);
  const durs = useMemo(() => marches(table), [table]);
  const cumul = coutCumule(table, vise);
  // Combien de compétences on aurait pu monter à 10 pour le même prix : c'est la
  // seule façon de rendre le coût comparable à autre chose que lui-même.
  const equivalent = Math.floor(cumul / coutCumule(table, 10));

  return (
    <>
      <p style={{ fontSize: 13, lineHeight: 1.65, margin: "0 0 14px" }}>
        Un niveau de compétence s&apos;achète en points, et les points s&apos;obtiennent en lançant la
        compétence. La table est <b>la même pour toutes les classes</b> : rien, dans les fichiers,
        n&apos;accorde de remise à l&apos;une ou de surcoût à l&apos;autre.
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 11, flexWrap: "wrap", marginBottom: 14, padding: "13px 15px",
        background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 11 }}>
        <label htmlFor="vise" style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Tu veux la monter au niveau</label>
        <input id="vise" type="range" min={2} max={20} value={vise} onChange={(e) => setVise(Number(e.target.value))}
          style={{ flex: "1 1 150px", minWidth: 120, accentColor: "var(--orange)" }} />
        <span className="font-heading" style={{ ...NUM, fontSize: 17, fontWeight: 700, color: "var(--orange)", minWidth: 26, textAlign: "center" }}>{vise}</span>
        <span style={{ ...NUM, fontSize: 13 }}>
          <b className="font-heading" style={{ fontSize: 16 }}>{fmt(cumul)}</b> points
          {equivalent >= 2 && <span style={{ color: "var(--text-muted)" }}> — soit {equivalent} compétences montées à 10</span>}
        </span>
      </div>

      {durs.length > 0 && (
        <Encart icon="trending-up" ton="gold" titre={`Les ${COMPTE_MOT[durs.length] ?? durs.length} marches où le prix double`}>
          Le coût ne monte pas régulièrement : il double d&apos;un coup{" "}
          {durs.map((m, i) => (
            <span key={m.niveau}>
              {i > 0 && (i === durs.length - 1 ? " et " : ", ")}
              <b>au niveau {m.niveau}</b> (×{m.facteur!.toFixed(1).replace(".", ",")})
            </span>
          ))}
          . C&apos;est là que se décide un build : monter UNE compétence au niveau 13 coûte{" "}
          {fmt(coutCumule(table, 13))} points, de quoi en monter{" "}
          <b>{Math.floor(coutCumule(table, 13) / coutCumule(table, 10))} à 10</b>. Et la deuxième
          moitié de la table écrase la première —{" "}
          <b>{fmt(coutCumule(table, 10))} points pour atteindre le niveau 10</b>, puis{" "}
          <b>{fmt(coutCumule(table, 20) - coutCumule(table, 10))} de plus</b> pour les dix suivants.
        </Encart>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 14 }}>
        <div>
          <SousTitre icon="coins" apres="cumulé depuis le niveau 1">Le prix d&apos;un niveau</SousTitre>
          <Cadre minWidth={230}>
            <thead>
              <tr><th style={TH}>Niveau</th><th style={TH}>Ce palier</th><th style={TH}>Total</th></tr>
            </thead>
            <tbody>
              {paliers.map((x) => {
                const dur = durs.some((m) => m.niveau === x.niveau);
                return (
                  <tr key={x.niveau} style={dur ? { background: "rgba(255,210,74,.07)" } : undefined}>
                    <td style={{ ...TD, color: x.niveau === vise ? "var(--orange)" : "var(--text)", fontWeight: x.niveau === vise ? 700 : 400 }}>{x.niveau}</td>
                    <td style={{ ...TD, color: dur ? "var(--gold)" : "var(--text)", fontWeight: dur ? 700 : 400 }}>{x.xp === 0 ? "—" : fmt(x.xp)}</td>
                    <td style={{ ...TD, color: "var(--text-muted)" }}>{fmt(coutCumule(table, x.niveau))}</td>
                  </tr>
                );
              })}
            </tbody>
          </Cadre>
        </div>

        <div>
          <SousTitre icon="crown" apres={`${lignees.length} classes`}>Tout monter, par classe</SousTitre>
          <Cadre minWidth={250}>
            <thead>
              <tr><th style={TH}>Classe</th><th style={TH}>Compétences</th><th style={TH}>Points</th></tr>
            </thead>
            <tbody>
              {[...lignees].sort((a, b) => b.coutPoints - a.coutPoints).map((l) => (
                <tr key={l.cle}>
                  <td style={TD}>
                    <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      {findClass(l.cle)?.embleme && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={findClass(l.cle)!.embleme} alt="" width={20} height={20} style={{ objectFit: "contain", flexShrink: 0 }} />
                      )}
                      {findClass(l.cle)?.label ?? l.cle}
                    </span>
                  </td>
                  <td style={TD}>{l.nbCompetences}</td>
                  <td style={{ ...TD, color: "var(--orange)", fontWeight: 600 }}>{fmt(l.coutPoints)}</td>
                </tr>
              ))}
            </tbody>
          </Cadre>
          <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6, marginTop: 9 }}>
            L&apos;écart n&apos;est pas un réglage d&apos;équilibrage : il vient du <b>nombre</b> de compétences
            héritées. L&apos;Arcaniste en a 45 à cause des cinq écoles élémentaires, le Spadassin 32.
            Ces totaux sont recalculés depuis la liste dédoublonnée, pas recopiés du fichier —
            voir « Ce qu&apos;on ne sait pas ».
          </p>
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════
//  MAÎTRE ET HÉROS
// ══════════════════════════════════════════════════════════════════════════

export function Paliers({ entrees }: { entrees: Entree[] }) {
  const maitres = entrees.filter((e) => e.palier === "maitre");
  const heros = entrees.filter((e) => e.palier === "heros");

  return (
    <>
      <p style={{ fontSize: 13, lineHeight: 1.65, margin: "0 0 14px" }}>
        Seize compétences se comportent autrement que les deux cents autres : une de Maître et une
        de Héros par classe, cinq niveaux chacune. Sur ces seize, <b>le seul niveau qui compte est
        le cinquième</b> — et pour deux raisons différentes selon le palier.
      </p>

      <Encart icon="medal" ton="gold" titre="Maître : le niveau 5 remplace l'effet, il ne l'augmente pas">
        Aux niveaux 1 à 4, la compétence donne son effet d&apos;origine (de l&apos;attaque, de la vitesse,
        des dégâts contre joueurs). Au niveau 5, cet effet <b>disparaît</b> et laisse place à
        +15 % sur une statistique, avec une durée qui passe de 10 à 30 minutes. Monter jusqu&apos;à 4
        ne rapproche donc pas du 5.
      </Encart>

      <Encart icon="ban" ton="red" titre="Héros : les niveaux 1 à 4 sont volontairement injouables">
        Sept compétences de Héros sur huit coûtent <b>9 999 999 aux niveaux 1 à 4, en PM comme en
        PF</b>, et 500 PM au niveau 5. Ce n&apos;est pas un réglage, c&apos;est un mur. Et le niveau ne se
        choisit pas : on
        monte une compétence de Héros avec un joyau de chaque type (topaze, rubis, saphir,
        émeraude, diamant), et <b>le tirage est aléatoire</b>, plafonné à 5. Tant qu&apos;il n&apos;a pas
        donné 5, les joyaux dépensés n&apos;ont rien acheté d&apos;utilisable.
      </Encart>

      <Encart icon="star" ton="blue" titre="Le Meneur échappe aux deux, et c'est la même classe">
        <b>Bénédiction du sage</b> (Meneur Maître) porte ses +15 % d&apos;Intelligence et ses +25 de
        puissance de soin <b>dès le niveau 1</b>, avec les 30 minutes de durée : ses cinq niveaux
        sont identiques. Et <b>Marque de vulnérabilité</b> (Meneur Héros) est la seule des huit
        compétences de Héros à coûter 500 PM dès le niveau 1. La lignée du Meneur — celle qui
        mène au Primat — est donc la seule à ne pas dépendre du tirage aux joyaux pour ces deux
        paliers. Ça vaut cher en début de vie de personnage.
      </Encart>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 14, marginTop: 4 }}>
        <ListePalier titre="Les 8 compétences de Maître" icon="medal" items={maitres} />
        <ListePalier titre="Les 8 compétences de Héros" icon="trophy" items={heros} />
      </div>

      <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6, marginTop: 12 }}>
        La chaîne de promotion complète — quel palier vient après lequel, et où ces deux-là se
        placent — est sur <Link href="/classes" style={{ color: "var(--orange)", textDecoration: "none" }}>la page des classes</Link>.
      </p>
    </>
  );
}

function ListePalier({ titre, icon, items }: { titre: string; icon: "medal" | "trophy"; items: Entree[] }) {
  return (
    <div>
      <SousTitre icon={icon} apres={`niveau ${items[0]?.nivPerso ?? "?"} requis`}>{titre}</SousTitre>
      <Cadre minWidth={250}>
        <thead><tr><th style={TH}>Compétence</th><th style={TH}>Au niveau 5</th></tr></thead>
        <tbody>
          {items.map((e) => (
            <tr key={e.id}>
              <td style={TD}>
                <div className="font-heading" style={{ fontSize: 12.5, fontWeight: 600 }}>{e.nom}</div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{e.classe}</div>
              </td>
              <td style={{ ...TD, color: "var(--green)" }}>{e.resume ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </Cadre>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
//  HORS CLASSE
// ══════════════════════════════════════════════════════════════════════════

export function HorsClasseSection({ h }: { h: HorsClasse }) {
  return (
    <>
      <p style={{ fontSize: 13, lineHeight: 1.65, margin: "0 0 14px" }}>
        {fmt(h.groupe.length + h.souverain.length + h.couple.length + h.runes.length)} compétences ne
        s&apos;apprennent dans aucun arbre de classe, et n&apos;apparaissent donc pas dans la fenêtre où on
        a l&apos;habitude de les chercher. Elles viennent d&apos;un titre, d&apos;un groupe, d&apos;un mariage ou
        d&apos;une gravure.
      </p>

      <div style={{ marginBottom: 16 }}>
        <SousTitre icon="users" apres={`${h.groupe.length} compétences`}>Le groupe</SousTitre>
        <Cadre minWidth={430}>
          <thead>
            <tr><th style={TH}>Compétence</th><th style={TH}>Niv. groupe</th><th style={TH}>Coût</th><th style={TH}>Effet</th></tr>
          </thead>
          <tbody>
            {[...h.groupe].sort((a, b) => (a.niveauGroupe ?? 0) - (b.niveauGroupe ?? 0)).map((g) => (
              <tr key={g.nom} style={g.actif ? undefined : { opacity: 0.55 }}>
                <td style={TD}>
                  <span style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                    <b className="font-heading" style={{ fontSize: 12.5 }}>{g.nom}</b>
                    {!g.actif && <Pastille texte="désactivée" couleur="var(--red)" titre="La ligne est en commentaire dans les fichiers du serveur" />}
                  </span>
                </td>
                <td style={TD}>{g.niveauGroupe ?? "—"}</td>
                <td style={TD}>{g.coutPoints ?? "—"}</td>
                <td style={{ ...TD, color: "var(--text-muted)" }}>{g.description}</td>
              </tr>
            ))}
          </tbody>
        </Cadre>
        <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6, marginTop: 8 }}>
          « Éclaireur » existe dans les données mais sa ligne est mise en commentaire : elle n&apos;est
          pas active sur le serveur. Le bonus de ces compétences dépend du niveau du groupe :
          {" "}{h.bonusGroupe.slice(0, 3).map((b) => `${b.bonus} % au niveau ${b.niveauGroupe}`).join(", ")}
          {" "}… et un plafond à {h.bonusGroupe[h.bonusGroupe.length - 1]?.bonus} % au niveau{" "}
          {h.bonusGroupe[h.bonusGroupe.length - 1]?.niveauGroupe}.
        </p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <SousTitre icon="crown" apres={`${h.souverain.length} compétences`}>Le Souverain</SousTitre>
        <Cadre minWidth={430}>
          <thead>
            <tr><th style={TH}>Compétence</th><th style={TH}>Cible</th><th style={TH}>Recharge</th><th style={TH}>Effet</th></tr>
          </thead>
          <tbody>
            {h.souverain.map((s) => (
              <tr key={s.nom}>
                <td style={TD}>
                  <b className="font-heading" style={{ fontSize: 12.5 }}>{s.nom}</b>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{s.type}</div>
                </td>
                <td style={TD}>{s.cible}</td>
                <td style={TD}>{s.permanente ? "permanente" : s.rechargeS ? `${s.rechargeS} s` : "—"}</td>
                <td style={{ ...TD, color: "var(--text-muted)" }}>{s.description}</td>
              </tr>
            ))}
          </tbody>
        </Cadre>
        <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6, marginTop: 8 }}>
          Cinq des huit passent par un objet consommable et ne portent qu&apos;à 8 mètres. La plus
          lourde est « Escorte du souverain », passive et permanente :{" "}
          <b style={{ color: "var(--text)" }}>+400 % sur la durée des compétences de groupe</b>{" "}
          quand le Souverain mène le groupe.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 14 }}>
        <div>
          <SousTitre icon="rune" apres={`${h.runes.length} runes`}>Les runes d&apos;arme baruna</SousTitre>
          <div style={{ display: "grid", gap: 6 }}>
            {h.runes.map((r) => (
              <div key={r.nom} style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 9, padding: "9px 11px" }}>
                <b className="font-heading" style={{ fontSize: 12.5 }}>{r.nom}</b>
                <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.55, marginTop: 2 }}>{r.description}</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6, marginTop: 8 }}>
            Ce ne sont pas les quatre runes de tenue et de cape : celles-ci se gravent sur une
            <b> arme baruna</b> et déclenchent leur effet au hasard, en attaquant. « Rune du néant »
            tue l&apos;ennemi d&apos;un seul coup.
          </p>
        </div>

        <div>
          <SousTitre icon="heart" apres={`${h.couple.length} compétences`}>Le couple</SousTitre>
          <Cadre minWidth={240}>
            <thead><tr><th style={TH}>Compétence</th><th style={TH}>Niv. couple</th><th style={TH}>Effet</th></tr></thead>
            <tbody>
              {h.couple.flatMap((c) => c.niveaux.map((n, i) => (
                <tr key={`${c.nom}-${n.niveau}`}>
                  <td style={TD}>
                    {i === 0
                      ? <b className="font-heading" style={{ fontSize: 12.5 }}>{c.nom}</b>
                      : <span style={{ color: "var(--text-muted)" }}>niveau {n.niveau}</span>}
                  </td>
                  <td style={TD}>{n.niveauCouple}</td>
                  <td style={{ ...TD, color: "var(--green)" }}>{n.effets}</td>
                </tr>
              )))}
            </tbody>
          </Cadre>
          <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6, marginTop: 8 }}>
            Apprises automatiquement, actives seulement si les deux partenaires sont sur le même
            canal. Un divorce les remet à zéro.
          </p>
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════
//  CE QUE LES DONNÉES NE DISENT PAS
// ══════════════════════════════════════════════════════════════════════════

export function Reserves({ entrees, doublons }: { entrees: Entree[]; doublons: { nom: string }[] }) {
  const sansTexte = entrees.filter((e) => !e.resume).length;
  return (
    <>
      <p style={{ fontSize: 13, lineHeight: 1.65, margin: "0 0 14px" }}>
        Cette page vient des fichiers du client, pas d&apos;une mesure en jeu. Cinq choses qu&apos;elle
        ne peut pas dire, et qu&apos;il vaut mieux savoir avant de bâtir un build dessus.
      </p>

      {doublons.length > 0 && (
        <Encart icon="alert" ton="red" titre={`Le client liste ${doublons.length} compétences deux fois`}>
          Le fichier de compétences contient 202 lignes de joueur, mais{" "}
          {doublons.map((x) => `« ${x.nom} »`).join(", ")} y figurent <b>en double</b>, avec des
          valeurs identiques au champ près. Il y a donc <b>{fmt(entrees.length)} compétences</b>,
          pas 202 — et le catalogue n&apos;en montre qu&apos;une copie.
          <br />
          Ce n&apos;est pas qu&apos;une histoire de comptage : les cinq doublons sont des compétences
          d&apos;arc de l&apos;Acrobate, donc ils gonflaient le budget des deux lignées qui en héritent.
          Le fichier annonce 38 compétences et 1 284 748 points pour la Sylphide et
          l&apos;Arbalétrier ; ce sont en réalité <b>33 compétences et 988 398 points</b>. Les huit
          budgets affichés ici sont recalculés depuis la liste dédoublonnée — la méthode retrouve
          à l&apos;unité les six lignées que le fichier annonce juste.
        </Encart>
      )}

      <Encart icon="ban" ton="red" titre="Aucun chiffre de dégâts final">
        Les fichiers donnent la statistique de référence (Force, Dextérité, Intelligence,
        Endurance) et son coefficient — de 5 à 338 — mais <b>pas l&apos;équation</b> qui combine
        coefficient, arme et statistique. Les « 164–211 dégâts » du tableau sont la valeur de
        base de la compétence, pas ce que tu vas taper à l&apos;écran.
      </Encart>

      <Encart icon="swords" ton="orange" titre="Rien de fiable en JcJ">
        Le fichier de progression a quatre colonnes prévues pour le JcJ
        (dégâts min, dégâts max, probabilité, taux). Elles sont <b>vides sur les 2 500 lignes</b>.
        Les dégâts entre joueurs se calculent ailleurs, sans doute par le multiplicateur « Dégâts
        JcJ » qu&apos;on voit sur onze lignes de buff.
      </Encart>

      <Encart icon="path" ton="blue" titre="Les prérequis, oui ; le dessin de l'arbre, non">
        {fmt(entrees.filter((e) => e.aPrerequis).length)} compétences ont un ou deux prérequis, avec
        le niveau exigé : de quoi reconstruire le graphe, et c&apos;est ce que fait la fiche de chaque
        compétence. Mais aucune coordonnée de placement n&apos;existe dans les fichiers —{" "}
        <b>l&apos;arbre tel que le jeu le dessine</b> n&apos;est pas reproductible ici.
      </Encart>

      <Encart icon="info" ton="gold" titre="Une compétence muette, et un palier absent">
        « Crucifix » (Meneur) est la seule à n&apos;avoir aucun texte français dans le client.
        {sansTexte > 0 && ` ${sansTexte} compétences n'ont par ailleurs aucun chiffre d'effet exploitable : leur ligne de résumé reste vide.`}
        {" "}Et le palier <b>Ultime</b> — les huit classes au-delà des légendaires — n&apos;a aucune
        compétence dans ces fichiers : s&apos;il vit sur le serveur, ses compétences ne sont pas dans
        le client d&apos;octobre 2025.
      </Encart>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6, marginTop: 4 }}>
        <Icon name="info" size={14} style={{ color: "var(--orange)", flexShrink: 0, marginTop: 2 }} />
        <span>
          Source : les fichiers de compétences du client AirFlyff d&apos;octobre 2025.{" "}
          {fmt(entrees.length)} compétences de joueur distinctes,{" "}
          {fmt(entrees.reduce((s, e) => s + e.nivMax, 0))} niveaux de progression relevés. Les 44
          autres entrées du fichier ne sont pas des compétences de joueur — ce sont les états
          infligés par les monstres — et ne figurent pas dans le catalogue.
        </span>
      </div>
    </>
  );
}
