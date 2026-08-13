"use client";
import { useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { findClass } from "@/data/classes";
import { Cadre, Encart, Pastille, SousTitre, TD, TH } from "./ui";
import { classeAffichee, coutCumule, fmt, nbHorsClasse, type Entree, type HorsClasse, type Lignee } from "./donnees";

/**
 * Les blocs qui EXPLIQUENT, à côté du catalogue qui liste.
 *
 * Ils existent parce que les chiffres du client mentent par omission : la
 * table de coût laisse croire à une courbe régulière alors qu'elle a deux murs,
 * et les paliers Maître et Héros ont un niveau 5 qui n'est pas la suite des
 * quatre premiers. Un catalogue seul ne dit rien de ça.
 *
 * Ils sont montés dans le rail de /classes : depuis la fusion des deux pages,
 * les classes et leurs compétences se lisent au même endroit.
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

/** Les clefs de lignée du relevé sont accentuées de façon inégale : on désaccentue
 *  avant de comparer, comme le fait `norm()` du côté de /classes. */
const estArcaniste = (cle: string) =>
  cle.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes("arcaniste");

export function Budget({ table, lignees }: { table: { niveau: number; xp: number }[]; lignees: Lignee[] }) {
  const [vise, setVise] = useState(10);
  const paliers = useMemo(() => table.filter((x) => x.niveau >= 1), [table]);
  const durs = useMemo(() => marches(table), [table]);
  const cumul = coutCumule(table, vise);
  // Combien de compétences on aurait pu monter à 10 pour le même prix : c'est la
  // seule façon de rendre le coût comparable à autre chose que lui-même.
  const equivalent = Math.floor(cumul / coutCumule(table, 10));
  /* LES DEUX EXTRÊMES DU TABLEAU, comptés et non écrits. La phrase sous le tableau
     nommait « 45 » et « 32 » à la main : deux chiffres qui vivaient à côté de la
     colonne qui les contient déjà, et qui la contrediraient au premier relevé neuf.
     On prend le plus fourni et le plus maigre en nombre de COMPÉTENCES — c'est le
     nombre dont la phrase parle, pas le coût en points par lequel le tableau trie. */
  const parNombre = useMemo(
    () => [...lignees].sort((a, b) => b.nbCompetences - a.nbCompetences),
    [lignees],
  );
  const plusFournie = parNombre[0];
  const plusMaigre = parNombre[parNombre.length - 1];

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
          {/* ┌──── DEUX DÉFAUTS CORRIGÉS DANS UNE SEULE PHRASE ────┐
                 1. RENVOI MORT. Elle finissait par « — voir "Ce qu'on ne sait pas" »,
                    et ce volet a été retiré de la page (règle 2). Le lecteur cliquait
                    dans le rail pour chercher une entrée qui n'existe plus.
                 2. DEUX CHIFFRES EN DUR. « L'Arcaniste en a 45… le Spadassin 32 » :
                    exactement le défaut reproché au paragraphe de « Maître et Héros »,
                    vingt lignes plus bas, et laissé ici. Les deux extrêmes se lisent
                    sur `lignees`, la même liste que le tableau juste au-dessus — donc
                    le texte et le tableau ne peuvent plus se contredire, et une lignée
                    ajoutée les déplace tous les deux.
                 La mention « recalculés depuis la liste dédoublonnée » part avec le
                 renvoi : c'est de la méthode, pas du jeu, et c'est ce que le volet
                 retiré disait déjà — le garder sans lui laissait une allusion sans
                 antécédent. */}
          {plusFournie && plusMaigre && plusFournie.cle !== plusMaigre.cle && (
            <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6, marginTop: 9 }}>
              L&apos;écart n&apos;est pas un réglage d&apos;équilibrage : il vient du <b>nombre</b> de compétences
              héritées. {findClass(plusFournie.cle)?.label ?? plusFournie.cle} en a{" "}
              <b>{plusFournie.nbCompetences}</b>
              {/* La RAISON n'est vraie que de l'Arcaniste : ses cinq écoles élémentaires.
                  Elle ne s'affiche donc que si c'est bien lui qui mène le tableau — un
                  relevé qui changerait de tête ne lui emprunterait pas son explication. */}
              {estArcaniste(plusFournie.cle) ? " à cause des cinq écoles élémentaires" : ""},{" "}
              {findClass(plusMaigre.cle)?.label ?? plusMaigre.cle} <b>{plusMaigre.nbCompetences}</b>.
            </p>
          )}
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
      {/* ┌──── LE PARAGRAPHE D'INTRODUCTION EST PARTI ────┐
             Il disait, en trente-cinq mots : « Seize compétences se comportent
             autrement que les deux cents autres… sur ces seize, le seul niveau qui
             compte est le cinquième — et pour deux raisons différentes selon le
             palier. » Trois problèmes, dans l'ordre de gravité :
              1. « SEIZE » ET « DEUX CENTS » ÉTAIENT ÉCRITS EN DUR, dans une phrase,
                 sur une page dont tous les autres chiffres se calculent. Le relevé
                 fait foi partout ailleurs ; ici il était contredit d'avance.
              2. LE RAIL DIT DÉJÀ « Les 16 compétences où seul le niveau 5 compte »,
                 et l'en-tête du volet le répète juste au-dessus. Troisième copie.
              3. « pour deux raisons différentes selon le palier » annonçait les deux
                 encarts qui suivent, et qui portent leur titre.
             Ce qui reste est donc les deux encarts eux-mêmes : ils passent le test de
             la règle 2 — ils changent le geste (ne pas monter jusqu'à 4, ne pas
             compter sur les joyaux) — et le compte des deux listes est désormais lu
             sur le relevé. */}
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

      {/* Les deux comptes sont LUS sur le relevé, comme partout ailleurs sur la page :
          « Les 8 compétences de Maître » était écrit en dur pour une liste dont la
          longueur est juste à côté, dans `items`. */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 14, marginTop: 4 }}>
        <ListePalier titre={`Les ${maitres.length} compétences de Maître`} icon="medal" items={maitres} />
        <ListePalier titre={`Les ${heros.length} compétences de Héros`} icon="trophy" items={heros} />
      </div>

      {/* LE RENVOI VERS « Les échelles » EST PARTI : cette entrée du rail est à
          l'écran, à deux cents pixels à gauche, avec son icône et son compte. Une
          phrase de vingt-cinq mots pour désigner un bouton visible se lit comme si le
          bouton n'existait pas. */}
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
                <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{classeAffichee(e.classe)}</div>
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
        {fmt(nbHorsClasse(h))} compétences ne s&apos;apprennent dans aucun arbre de classe, et
        n&apos;apparaissent donc pas dans la fenêtre où on a l&apos;habitude de les chercher. Elles
        viennent d&apos;un titre, d&apos;un groupe ou d&apos;un mariage.
      </p>

      <div style={{ marginBottom: 14 }}>
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

      <div style={{ marginBottom: 14 }}>
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
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
     LE VOLET « CE QU'ON NE SAIT PAS » A ÉTÉ RETIRÉ — RÈGLE 2 DE LA MAISON.
   ══════════════════════════════════════════════════════════════════════════

   « Si les renseignements ne sont pas complets, dans ce cas tu oublies. » Ce volet
   était l'inverse exact : cinq encarts de trois cents mots dont le SUJET était
   l'incomplétude du relevé. Le test appliqué à chacun — est-ce que ça change le
   geste du joueur ?

     · « Le client liste 5 compétences deux fois » ................ NON. C'était la
       méthode : pourquoi nos budgets diffèrent de ceux qu'annonce le fichier brut.
       Le lecteur n'a rien à en faire, et les huit budgets affichés sont déjà les
       bons (voir vue.ts, qui recalcule sur la liste dédoublonnée).
     · « Rien de fiable en JcJ » .................................. NON. Le constat
       porte sur quatre colonnes vides d'un fichier. Aucun geste au bout.
     · « Les prérequis oui, le dessin de l'arbre non » ............ NON. La fiche de
       chaque compétence donne déjà ses prérequis ; l'absence de coordonnées de
       placement est notre problème, pas celui du joueur.
     · « Une compétence muette, et un palier absent » ............. NON. Un constat
       d'ignorance, mot pour mot.
     · « Aucun chiffre de dégâts final » .......................... OUI, et c'est la
       seule exception prévue par la règle : sans elle, on bâtit un build sur les
       « 164–211 dégâts » du tableau, qui ne sont pas ce qu'on tape. Elle ne
       disparaît donc pas — elle DÉMÉNAGE là où l'erreur se commet, sur l'en-tête
       de la colonne Dégâts du catalogue (Catalogue.tsx), en une phrase dans une
       bulle au lieu d'un encart dans un volet qu'il faut penser à ouvrir.

   La provenance du relevé, elle, n'est pas une réserve : elle est passée dans le
   sous-titre de la page (« relevées dans le client d'octobre 2025 »), qui se lit
   sans ouvrir quoi que ce soit. */
