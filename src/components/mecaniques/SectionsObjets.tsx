import {
  CARTES_ATTAQUE, CARTES_DEFENSE, COULEUR_CARTE,
  ICONE_ELEMENT, ICONE_EVEIL, ICONE_SCROLL, ICONE_DIAMANT, ICONE_HOLO, ICONE_GEMME, ICONE_UPGRADE,
  ICONE_RARETE, COULEUR_RARETE, ICONE_RUNE_ARME, ICONE_RUNE_MARTEAU, ICONE_RUNE_STAT, ICONE_RUNE_VIERGE,
  ETIQUETTE_ARTEFACT, ETIQUETTE_ULTIME, ETOILE_PLEINE, ETOILE_VIDE,
  planAscension, essenceArme,
} from "@/lib/assetsJeu";
import {
  RARETES, STATS_DIAMANT, STATS_HOLO, STATS_GEMME, STATS_EVEIL, STATS_SCROLL, reglagesDeSlot,
} from "@/lib/specsFlyff";
import { Bareme, Bonus, Case, Chip, Deux, Groupe, LigneObjet, Point, Vignette, grille, note } from "./Blocs";
import {
  ECHELLE, PARCHEMINS_ABSOLUS, PARCHEMINS_TAUX,
  cartesDElement, cartesDePercage, comptoirDeLuca, famillesDeJoyau, iconeDe, iconePercage,
  nombreDeGemmesMenteuses, nombreDeGemmesNommees, objet, objets, runes, tableauDesGemmes,
} from "./releves";

/**
 * LES MÉCANIQUES D'UNE PIÈCE — huit facettes, une par question qu'on se pose en
 * regardant son arme.
 *
 * Ce fichier lit le relevé du client (`./releves`), donc il touche au disque : il
 * ne doit JAMAIS être importé par un composant client. La page qui l'emploie est
 * un composant serveur, et c'est ce qui permet d'afficher des comptes exacts sans
 * envoyer 3 Mo de JSON au navigateur.
 *
 * Règle de toute la planche, héritée de la première version : on ne dit ici que ce
 * que les fichiers disent. Là où le client ne fournit rien — la rareté Commune, la
 * Mythique, l'image d'un palier de carte —, on l'écrit au lieu d'emprunter l'image
 * du palier voisin.
 */

/** Les neuf familles d'ascension du client. Le glaive et la doloire n'en font
 *  qu'une : c'est le nom de fichier lui-même qui le dit. On garde ici un nom
 *  d'arme réel par famille, parce que `planAscension` lit un NOM d'arme — la
 *  planche se sert donc de la même fonction que les formulaires. */
export const FAMILLES: { arme: string; label: string }[] = [
  { arme: "Épée", label: "Épée" },
  { arme: "Hache", label: "Hache" },
  { arme: "Glaive", label: "Glaive & Doloire" },
  { arme: "Arc", label: "Arc" },
  { arme: "Baguette", label: "Baguette" },
  { arme: "Bâton", label: "Bâton" },
  { arme: "Sceptre", label: "Sceptre" },
  { arme: "Poing", label: "Poing" },
  { arme: "Yoyo", label: "Yoyo" },
];

/** Les ressources d'artefact, telles que le client les nomme. On les montre sans
 *  expliquer leur recette : les crafts d'artefact ne sont pas dans nos données, et
 *  inventer une recette ici enverrait quelqu'un farmer pour rien. */
const RESSOURCES: { f: string; nom: string }[] = [
  { f: "artefact-pierre", nom: "Pierre d'artefact" },
  { f: "artefact-plan", nom: "Plan" },
  { f: "artefact-morceau-parchemin", nom: "Morceau de parchemin" },
  { f: "artefact-coffret-plans", nom: "Coffret de plans" },
  { f: "artefact-boite-pierres", nom: "Boîte de pierres" },
  { f: "artefact-protection", nom: "Protection" },
  { f: "artefact-orichalque-pure", nom: "Orichalque pur" },
  { f: "artefact-orichalque-scintillant", nom: "Orichalque scintillant" },
  { f: "artefact-roche-lunaire", nom: "Roche lunaire" },
  { f: "artefact-diamant-holographique", nom: "Diamant holographique" },
];

/** La pièce de référence de toute la page : une arme passée en artefact. C'est
 *  elle qui porte les plafonds les plus hauts, et tous les chiffres de la planche
 *  sortent de cette table plutôt que du clavier. */
const ARME_ARTEFACT = reglagesDeSlot("weapon", { artefact: true });
const ARME_SIMPLE = reglagesDeSlot("weapon");
const TENUE = reglagesDeSlot("suit");
const BIJOU = reglagesDeSlot("jewel");
const FASHION = reglagesDeSlot("fashion");

/* ═══ 1. Les gemmes mentent ══════════════════════════════════════════════════ */

export function Gemmes() {
  const table = tableauDesGemmes();
  const menteuses = nombreDeGemmesMenteuses();
  const familles = famillesDeJoyau();
  const sertisseur = familles.find((f) => f.sertisseur)?.sertisseur ?? "";
  const neufs = table.map((g) => g.neuf).filter((o): o is NonNullable<typeof o> => !!o);

  return (
    <>
      <Point titre="Le nom de la gemme et son effet réel ne correspondent plus" marque="profit">
        <p>
          Sertir une arme ultime demande une arme <b>+6 au minimum</b> ; le joyau brut tire
          une statistique <b>au hasard parmi {STATS_DIAMANT.length}</b>, et chaque joyau du même
          type renforce toujours la même. À côté du joyau brut, le jeu vend {table.length} gemmes
          <b> nommées</b> qui, elles, forcent la statistique — c&apos;est la seule façon de choisir
          ce qu&apos;on obtient{sertisseur ? <>, et ça se passe chez <b>{sertisseur}</b></> : null}.
        </p>
        <p>
          Sauf que <b>{menteuses} de ces {table.length} noms sont faux</b>. AirFlyff a changé
          l&apos;ordre des {STATS_DIAMANT.length} statistiques de sertissage dans son fichier de
          données sans jamais retoucher les textes d&apos;objets, restés sur l&apos;ordre du Flyff
          d&apos;origine. Le nom que tu lis dans l&apos;infobulle décrit donc l&apos;effet
          d&apos;une <i>autre</i> gemme.
        </p>
        <Deux
          gauche="Ce que dit l'infobulle"
          droite="Ce que la gemme donne"
          lignes={table.map((g) => [g.nom, g.reel, g.juste] as [React.ReactNode, React.ReactNode, boolean?])}
        />
        <p className="mc-src">
          La colonne de droite n&apos;est pas notre interprétation : c&apos;est le <b>libellé des
          {" "}{neufs.length} Diamants qu&apos;AirFlyff a ajoutés</b>, recopié tel quel, coquilles
          comprises. Ces neuf-là disent ce qu&apos;ils font et suivent l&apos;ordre du fichier ;
          c&apos;est la preuve que c&apos;est le fichier qui fait loi, pas l&apos;infobulle.
        </p>
        <p className="mc-src">
          L&apos;exemple est pris sur la Topaze, mais le décalage est le même rang 01→09 dans les
          {" "}{familles.length} familles — <b>{nombreDeGemmesNommees()} gemmes nommées</b> en tout.
          Le joyau à employer dépend du niveau de l&apos;arme :{" "}
          {familles.map((f) => `${f.nom} ${f.plage}`).join(", ")}.
        </p>
      </Point>

      <div className="mc-vignettes">
        {familles.map((f) => <Vignette key={f.nom} src={f.img} legende={`${f.nom} ${f.plage}`} />)}
      </div>

      <Point titre="Ce qu'on en fait, concrètement">
        <p>
          Tu veux des <b>PV</b> ? Prends celle « de maîtrise ». De la <b>Force</b> ? Celle
          « de puissance ». De l&apos;<b>Endurance</b> ? Celle « de force ». Et quand tu as le
          choix, prends l&apos;un des {neufs.length} Diamants ci-dessous : leur libellé ne peut pas
          te tromper.
        </p>
        <div style={{ display: "grid", gap: 5 }}>
          {neufs.map((o) => <LigneObjet key={o.cle} o={o} />)}
        </div>
        <p className="mc-src">
          En cas d&apos;échec du sertissage (90 % de réussite annoncés), seul le joyau est
          perdu — l&apos;arme ne risque rien. C&apos;est la seule opération de la forge dans ce cas.
        </p>
      </Point>

      <Point titre="Avant d'en faire une règle" marque="verifier">
        <p>
          Le décalage est celui du client d&apos;octobre 2025 ; le serveur peut avoir été corrigé
          depuis. Que le premier qui sertit une gemme nommée dise dans le vocal ce qu&apos;il a
          réellement obtenu : deux confirmations et on grave, une contradiction et on retire cette
          section.
        </p>
      </Point>
    </>
  );
}

/* ═══ 2. Rareté ══════════════════════════════════════════════════════════════ */

export function Rarete() {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <p style={note}>
        La rareté est le premier chiffre qu&apos;on lit sur une arme : c&apos;est elle qui donne
        les lignes bonus. Chaque palier a sa couleur — la même que dans l&apos;AirBuilder.
      </p>
      <div style={grille}>
        {RARETES.map((r) => <Case key={r} src={ICONE_RARETE[r]} nom={r} couleur={COULEUR_RARETE[r]} />)}
      </div>
      <p style={note}>
        Tu ne verras que {Object.keys(ICONE_RARETE).length} parchemins : <b>Commun</b> est
        l&apos;état de base et le client n&apos;en livre pas pour <b>Mythique</b>. Plutôt que de te
        montrer celui du palier d&apos;à côté, on n&apos;en montre aucun.
      </p>
    </div>
  );
}

/* ═══ 3. Artefact & ascension ════════════════════════════════════════════════ */

export function Artefact() {
  const source = objets(["II_SYS_SYS_PLAN_ARTEFACT", "II_SYS_SYS_STONE_ARTEFACT"]);
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <p style={note}>
        Jusqu&apos;à +{ARME_SIMPLE.upMax}, tu améliores. À partir de +{ARME_SIMPLE.upMax + 1} ta
        pièce devient un <b>artefact</b> : elle porte ce bandeau, elle gagne jusqu&apos;à trois
        étoiles d&apos;ascension, elle monte jusqu&apos;à +{ARME_ARTEFACT.upMax} et elle ouvre les
        {" "}{ARME_ARTEFACT.sertissage?.holo} diamants holographiques.
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ETIQUETTE_ARTEFACT} alt="Artefact" style={{ height: 24, width: "auto", imageRendering: "pixelated" }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ETIQUETTE_ULTIME} alt="Ultime" style={{ height: 24, width: "auto", imageRendering: "pixelated" }} />
        <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
          {[1, 2, 3].map((i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={i <= 2 ? ETOILE_PLEINE : ETOILE_VIDE} alt="" style={{ width: 20, height: 20, imageRendering: "pixelated" }} />
          ))}
          <span style={{ fontSize: 11.5, color: "var(--text-muted)", marginLeft: 6 }}>2 étoiles sur 3</span>
        </span>
        <Case src={ICONE_UPGRADE} nom="Amélioration" taille={26} />
      </div>

      <Groupe titre="Le plan d'ascension dépend de ton arme">
        <p style={note}>
          {FAMILLES.length} familles, et une seule pour le glaive et la doloire. Si ton arme
          n&apos;est pas dans cette liste, le client ne dessine pas son plan : le site te le dira
          en mots plutôt qu&apos;avec l&apos;image d&apos;une autre arme.
        </p>
        {/* `flexWrap` et non une largeur fixe sur la ligne de famille : « nom +
            trois plans + essence » fait 355 px, et sur un telephone cette seule
            ligne poussait la PAGE entiere en defilement horizontal. Elle se
            replie maintenant dans son propre cadre.
            Et le commentaire est ICI, pas dans le `map` : entre accolades, a
            l'interieur d'un retour de fonction flechee, il compte comme une
            expression a part et met la page en 500. */}
        <div style={{ display: "grid", gap: 6 }}>
          {FAMILLES.map((f) => (
            <div key={f.arme} className="fx-card" style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10, padding: "7px 10px", borderRadius: 10, background: "var(--bg-2)", border: "1px solid var(--border)" }}>
              <span style={{ flex: "0 0 auto", minWidth: 110, fontSize: 12.5, fontWeight: 700 }}>{f.label}</span>
              {[1, 2, 3].map((n) => {
                const src = planAscension(f.arme, n);
                if (!src) return null;
                return (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={n} src={src} alt="" title={`${f.label} — ascension ${n}`} style={{ width: 28, height: 28, objectFit: "contain", imageRendering: "pixelated" }} />
                );
              })}
              <span style={{ fontSize: 11.5, color: "var(--text-muted)", marginLeft: 4 }}>1 · 2 · 3</span>
              {/* Jamais de `src=""` en repli : le navigateur recharge alors la
                  page courante comme si c'était une image, et l'icône cassée est
                  plus bruyante que l'absence. */}
              {essenceArme(f.arme) && (
                <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={essenceArme(f.arme)!} alt="" title={`Essence — ${f.label}`} style={{ width: 26, height: 26, objectFit: "contain", imageRendering: "pixelated" }} />
                  <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>essence</span>
                </span>
              )}
            </div>
          ))}
        </div>
      </Groupe>

      <Groupe titre="Ce que tu ramasses pour ça">
        <div style={grille}>
          {RESSOURCES.map((r) => <Case key={r.f} src={`/jeu/mecaniques/${r.f}.webp`} nom={r.nom} />)}
        </div>
        {source.length > 0 && (
          <>
            <p style={note}>
              Deux de ces objets disent eux-mêmes où ils tombent — c&apos;est écrit dans leur
              infobulle, et ça ne l&apos;est nulle part ailleurs :
            </p>
            <div style={{ display: "grid", gap: 5 }}>
              {source.map((o) => <LigneObjet key={o.cle} o={o} />)}
            </div>
          </>
        )}
        <p style={note}>
          Ce qui vient <i>après</i> le passage en artefact — de +{ARME_SIMPLE.upMax + 1} à
          +{BIJOU.upMax}, et le sertissage au-delà de {ARME_ARTEFACT.sertissage?.diamants} — est
          dans <b>Les plafonds cachés</b>.
        </p>
      </Groupe>
    </div>
  );
}

/* ═══ 4. Les plafonds cachés ═════════════════════════════════════════════════ */

export function Plafonds() {
  const holo = objet("II_SYS_SYS_DIAMOND_ARTEFACT");
  const dia = ARME_ARTEFACT.sertissage?.diamants ?? 0;
  const nHolo = ARME_ARTEFACT.sertissage?.holo ?? 0;
  const luca = comptoirDeLuca();
  const taux = objets(PARCHEMINS_TAUX);
  const absolus = objets(PARCHEMINS_ABSOLUS);
  // Le palier est dans le nom du parchemin (« … Absolu +6 ») : on le lit plutôt
  // que de le déduire du nombre de parchemins, qui ne dit rien du premier.
  const paliersAbsolus = absolus
    .map((o) => Number(/\+(\d+)/.exec(o.n)?.[1] ?? 0))
    .filter((n) => n > 0)
    .sort((a, b) => a - b);
  const plageAbsolue = paliersAbsolus.length
    ? `+${paliersAbsolus[0]} à +${paliersAbsolus[paliersAbsolus.length - 1]}`
    : "";
  const familles = famillesDeJoyau();
  // Les quatre premières familles plafonnent ; la dernière — le Diamant — non.
  const quiPlafonnent = familles.slice(0, -1).map((f) => f.nom).join(", ");
  const quiDepasse = familles[familles.length - 1]?.nom ?? "Diamant";

  return (
    <>
      <Point titre={`Une arme Artefact +${ARME_ARTEFACT.upMax} accepte ${dia + nHolo} gemmes, pas ${dia}`} marque="profit">
        <div className="mc-cote">
          <Vignette src="/jeu/mecaniques/artefact-diamant-holographique.webp" legende="Diamant holographique" />
          <p>
            {quiPlafonnent} plafonnent bien à <b>{dia}</b> gemmes. Le <b>{quiDepasse}</b>, non :
            il a <b>{nHolo} paliers de plus</b>, et chacun rapporte autant que le
            {" "}{dia}<sup>e</sup>. Ce qui les débloque porte un nom dans le jeu, et son infobulle
            le dit mot pour mot.
          </p>
        </div>
        {holo && <LigneObjet o={holo} />}
        <p>
          Conséquence directe : toute comparaison de build faite sur {dia} gemmes
          <b> sous-estime le haut du jeu de {nHolo} paliers</b>. Quand on compare le stuff
          d&apos;un inscrit à un build de référence, c&apos;est là que l&apos;écart se creuse pour
          de bon.
        </p>
      </Point>

      <Point titre={`Et l'échelle d'amélioration ne s'arrête pas à +${ARME_ARTEFACT.upMax}`}>
        <p>
          Elle monte jusqu&apos;à <b>+{BIJOU.upMax}</b>. Chaque étage a ses objets, et le client
          écrit lui-même à quoi ils servent : ce sont ses phrases qui sont citées ci-dessous, pas
          les nôtres.
        </p>
        <div>
          {ECHELLE.map((e) => {
            const l = objets(e.cles);
            if (!l.length) return null;
            return (
              <div key={e.de} className="mc-etage">
                <span className="mc-etage-t"><b>{e.de}</b><span>{e.titre}</span></span>
                <span className="mc-etage-l">
                  {l.map((o) => <LigneObjet key={o.cle} o={o} />)}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mc-src">
          Un anneau, une boucle ou un collier monte à <b>+{BIJOU.upMax}</b> sans passer par
          l&apos;artefact ; une tenue, un casque, des gants s&apos;arrêtent à
          {" "}<b>+{TENUE.upMax}</b>. Ce n&apos;est pas la même échelle, et c&apos;est pour ça
          qu&apos;un « +20 » ne veut rien dire tant qu&apos;on ne sait pas de quelle pièce on parle.
        </p>
      </Point>

      {luca.objets.length > 0 && (
        <Point titre="Un seul PNJ tient la moitié de cette échelle">
          <p>
            {luca.objets.length} de ces objets s&apos;échangent au même endroit :
            le PNJ <b>Donjon Luca</b>. C&apos;est le passage obligé de tout le haut niveau, et
            aucune interface du jeu ne le récapitule.
          </p>
          <ul>
            {luca.objets.map((o) => <li key={o.cle}>{o.n}</li>)}
          </ul>
          {luca.monnaies.length > 0 && (
            <>
              <p className="mc-src">Il prend {luca.monnaies.length} monnaies, et rien d&apos;autre :</p>
              <div style={{ display: "grid", gap: 5 }}>
                {luca.monnaies.map((o) => <LigneObjet key={o.cle} o={o} />)}
              </div>
            </>
          )}
        </Point>
      )}

      <Point titre="Ce que les parchemins ajoutent vraiment">
        <p>
          Les taux affichés sont des <b>bonus</b>, pas des probabilités de base. Les voici avec la
          phrase exacte du client :
        </p>
        <div style={{ display: "grid", gap: 5 }}>
          {taux.map((o) => <LigneObjet key={o.cle} o={o} />)}
        </div>
        {absolus.length > 0 && (
          <>
            <p>
              Et il existe {absolus.length} <b>Parchemins d&apos;Enchantement Absolu</b>, un par
              palier de {plageAbsolue}, qui ne parlent pas de taux du tout : ils amènent la pièce
              au palier <b>à coup sûr</b>, sans objet de protection. Quand un membre en a un, il
              vaut mieux le garder pour le palier qui casse.
            </p>
            {/* Ces cinq-la partagent une seule et meme infobulle, qu'on ne cite
                donc pas cinq fois — et qui parle en passant d'une gamme
                d'armes que ce serveur n'a pas integree. On garde la limite qui
                compte, en une ligne. */}
            <div style={grille}>
              {absolus.map((o) => (
                <Case key={o.cle} src={iconeDe(o)} nom={o.n.replace(/^Parchemin d.Enchantement Absolu\s*/i, "")} />
              ))}
            </div>
            <p className="mc-src">
              Leur infobulle pose une limite : ils <b>ne fonctionnent pas sur une arme Ultime</b>.
            </p>
          </>
        )}
        <p className="mc-src">
          Le taux de <b>base</b>, lui, n&apos;est écrit nulle part dans le client — on ne le
          publiera donc pas, et personne ne devrait le citer de mémoire.
        </p>
      </Point>
    </>
  );
}

/* ═══ 5. Perçage ═════════════════════════════════════════════════════════════ */

/** Un palier de carte : son image si nos assets l'ont, son nom sinon. Les deux
 *  disent la même chose ; ce qu'on refuse, c'est de montrer le dessin du palier
 *  voisin faute d'avoir le bon. */
function Palier({ famille, palier, nom, couleur }: { famille: string; palier: string; nom: string; couleur?: string }) {
  const src = iconePercage(famille, palier);
  if (src) return <Case src={src} nom={nom} couleur={couleur} />;
  return <Chip texte={nom} titre="Le client a ce palier, nos assets n'en ont pas l'image" />;
}

export function Percage() {
  const c = cartesDePercage();
  const sansImage = [...c.attaque, ...c.defense]
    .flatMap((f) => f.paliers.filter((p) => !iconePercage(f.famille, p.palier)).map((p) => p.palier))
    .length;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <p style={note}>
        Le même élément change de nom selon ce qu&apos;il fait : le feu <b>attaque</b> sous
        « Feu » et <b>défend</b> sous « Volcano ». Une arme et un bouclier prennent des cartes
        d&apos;attaque, une tenue prend des cartes de défense — d&apos;où deux séries de dessins,
        {" "}<b>{c.nAttaque}</b> cartes d&apos;un côté, <b>{c.nDefense}</b> de l&apos;autre.
      </p>
      <p style={note}>
        Une arme percée ouvre jusqu&apos;à <b>{ARME_SIMPLE.percage?.max}</b> emplacements,
        {" "}<b>{ARME_ARTEFACT.percage?.max}</b> une fois passée en artefact ; une tenue,
        {" "}<b>{TENUE.percage?.max}</b>. Le nombre d&apos;emplacements et le palier de la carte
        sont deux choses différentes, et c&apos;est le palier que le vendeur oublie d&apos;écrire.
      </p>

      <Groupe titre={`Attaque — arme et bouclier (${CARTES_ATTAQUE.length} éléments)`}>
        <div style={{ display: "grid", gap: 7 }}>
          {c.attaque.map((f) => (
            <div key={f.famille} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ width: 74, flexShrink: 0, fontSize: 12.5, fontWeight: 700, color: COULEUR_CARTE[f.famille] ?? "var(--text)" }}>{f.famille}</span>
              {f.paliers.map((p) => (
                <Palier key={p.palier} famille={f.famille} palier={p.palier} nom={p.palier} couleur={COULEUR_CARTE[f.famille]} />
              ))}
            </div>
          ))}
        </div>
      </Groupe>

      <Groupe titre={`Défense — tenue (${CARTES_DEFENSE.length} éléments)`}>
        <div style={{ display: "grid", gap: 7 }}>
          {c.defense.map((f) => (
            <div key={f.famille} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ width: 74, flexShrink: 0, fontSize: 12.5, fontWeight: 700, color: COULEUR_CARTE[f.famille] ?? "var(--text)" }}>{f.famille}</span>
              {f.paliers.map((p) => (
                <Palier key={p.palier} famille={f.famille} palier={p.palier} nom={`${p.palier} %`} couleur={COULEUR_CARTE[f.famille]} />
              ))}
            </div>
          ))}
        </div>
      </Groupe>

      <p style={note}>
        Les paliers en pointillés existent dans le client mais nos assets n&apos;en ont pas
        l&apos;image ({sansImage} sur {c.total}) : on écrit le palier plutôt que de te montrer le
        dessin d&apos;un autre. Et l&apos;<b>Air</b> n&apos;a pas de rang R là où les quatre autres
        éléments en ont un — ce n&apos;est pas un oubli de notre part, c&apos;est le client.
      </p>
    </div>
  );
}

/* ═══ 6. Éveil, scroll, élément ══════════════════════════════════════════════ */

export function Eveil() {
  const cartes = cartesDElement();
  const obsoletes = cartes.filter((x) => x.obsolete).length;
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <p style={note}>
        <b>R1</b> et <b>R2</b> sont deux parchemins d&apos;éveil : ils posent une statistique en
        plus sur la pièce, R2 plus fort que R1, prise parmi {STATS_EVEIL.length}. Le <b>scroll de
        stat</b> monte une des {STATS_SCROLL.length} statistiques de base de +1 à +4.
        L&apos;<b>élément</b> de l&apos;arme (jusqu&apos;à +{ARME_ARTEFACT.elementMax}) ne se
        confond pas avec les cartes de perçage.
      </p>
      <div style={grille}>
        <Case src={ICONE_EVEIL.R1} nom="Éveil R1" />
        <Case src={ICONE_EVEIL.R2} nom="Éveil R2" />
        <Case src={ICONE_SCROLL} nom="Scroll de stat" />
      </div>

      <Groupe titre="Élément de l'arme">
        <div style={grille}>
          {Object.entries(ICONE_ELEMENT).map(([nom, src]) => <Case key={nom} src={src} nom={nom} taille={24} />)}
        </div>
      </Groupe>

      <Groupe titre={`Ce qui monte l'élément : ${cartes.length} cartes, et un piège`}>
        <p style={note}>
          Ces cartes-là s&apos;appellent aussi « Carte » et ne percent rien : elles montent
          l&apos;élément. Il y en a deux par élément, et <b>{obsoletes} sont marquées obsolètes par
          le client lui-même</b> parce qu&apos;elles plafonnent à +5. Acheter une Carte Flamma
          plutôt qu&apos;une Carte Brasero, c&apos;est payer un plafond quatre fois plus bas.
        </p>
        <div style={{ display: "grid", gap: 5 }}>
          {cartes.map(({ fiche }) => <LigneObjet key={fiche.cle} o={fiche} />)}
        </div>
        <p style={note}>
          À noter : le client dit « foudre » là où le builder dit
          {" "}« {Object.keys(ICONE_ELEMENT).find((k) => /lectric/i.test(k)) ?? "Électricité"} ».
          Même élément, deux mots.
        </p>
      </Groupe>
    </div>
  );
}

/* ═══ 7. Sertissage & gemmes ═════════════════════════════════════════════════ */

export function Sertissage() {
  const dia = ARME_ARTEFACT.sertissage?.diamants ?? 0;
  const nHolo = ARME_ARTEFACT.sertissage?.holo ?? 0;
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <p style={note}>
        Une arme porte <b>{dia} diamants</b>, et <b>{nHolo} holographiques</b> de plus une fois
        passée en artefact — soit {dia + nHolo} emplacements en tout, ce que presque personne ne
        sait (voir <b>Les plafonds cachés</b>). Les <b>gemmes</b> sont l&apos;affaire des
        costumes : {FASHION.gemmes} emplacements, un dessin par pièce — la tête, le torse, les
        gants et les bottes ne portent pas la même.
      </p>
      <div style={grille}>
        <Case src={ICONE_DIAMANT} nom="Diamant" />
        <Case src={ICONE_HOLO} nom="Diamant holographique" />
        <Case src={ICONE_GEMME.fhead} nom="Gemme — chapeau" />
        <Case src={ICONE_GEMME.ftop} nom="Gemme — haut" />
        <Case src={ICONE_GEMME.fhand} nom="Gemme — gants" />
        <Case src={ICONE_GEMME.ffoot} nom="Gemme — bottes" />
      </div>

      <Groupe titre={`Les ${STATS_DIAMANT.length} statistiques du sertissage, dans l'ordre du fichier`}>
        <p style={note}>
          Cet ordre-là est la clef de tout : c&apos;est lui qu&apos;AirFlyff a changé sans
          retoucher les noms des gemmes, et c&apos;est pour ça que
          {" "}<b>{nombreDeGemmesMenteuses()} noms sur {tableauDesGemmes().length} mentent</b>
          {" "}(section <b>Les gemmes mentent</b>).
        </p>
        <div style={grille}>
          {STATS_DIAMANT.map((s, i) => <Chip key={s} texte={`${String(i + 1).padStart(2, "0")} · ${s}`} />)}
        </div>
      </Groupe>

      <Groupe titre={`Les ${nHolo} holographiques, et ce qu'ils donnent`}>
        <div style={grille}>
          {STATS_HOLO.map((s) => <Chip key={s} texte={s} />)}
        </div>
        <p style={note}>
          {STATS_HOLO.length} valeurs pour {nHolo} emplacements : on choisit, on ne cumule pas
          tout.
        </p>
      </Groupe>

      <Groupe titre={`Les gemmes de costume : ${STATS_GEMME.length} statistiques possibles`}>
        <div style={grille}>
          {STATS_GEMME.map((s) => <Chip key={s} texte={s} />)}
        </div>
      </Groupe>
    </div>
  );
}

/* ═══ 8. Runes ═══════════════════════════════════════════════════════════════ */

export function Runes() {
  const r = runes();
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <p style={note}>
        Deux choses portent ce mot. La rune d&apos;<b>arme</b> dépend du palier de l&apos;arme,
        et le <b>marteau</b> a sa propre série. La rune de <b>tenue</b> (aussi cape, familier,
        ramasseur) porte la pierre de la statistique qu&apos;elle donne. Confondre les deux fait
        acheter la mauvaise — et il y en a <b>{r.total}</b> dans le jeu, pas quatre.
      </p>

      <Groupe titre="Rune d'arme">
        <div style={grille}>
          {Object.entries(ICONE_RUNE_ARME).map(([nom, src]) => <Case key={nom} src={src} nom={nom} />)}
          <Case src={ICONE_RUNE_VIERGE} nom="Yggdrasil vierge" />
        </div>
      </Groupe>
      <Groupe titre="Rune de marteau">
        <div style={grille}>
          {Object.entries(ICONE_RUNE_MARTEAU).map(([nom, src]) => <Case key={nom} src={src} nom={nom} />)}
        </div>
      </Groupe>
      <Groupe titre="Rune de tenue, par statistique">
        <div style={grille}>
          {Object.entries(ICONE_RUNE_STAT).map(([nom, src]) => <Case key={nom} src={src} nom={nom} />)}
        </div>
      </Groupe>

      <Groupe titre={`Les ${r.familles.length} familles, et combien chacune en compte`}>
        <Bareme lignes={r.familles.map((f) => [`${f.nom} — ${f.sous}`, String(f.membres.length)] as [string, string])} />
      </Groupe>

      <div style={{ display: "grid", gap: 8, paddingTop: 4 }}>
        <div style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: .8, color: "var(--text-muted)" }}>
          Deux runes à ne pas payer
        </div>

        {r.tankMenteuses.map((o) => (
          <div key={o.cle} className="mc-cote">
            <Vignette src={ICONE_RUNE_ARME.Ancestrale} legende="Rune Luzaka" />
            <Point titre={`« ${o.n} » n'est pas une rune tank`} marque="piege">
              <p>
                Les autres runes TANK de la gamme Luzaka donnent PV max % et Endurance. Celle-là,
                non : le fichier lui met ces deux statistiques, qui sont celles d&apos;une version
                support.
              </p>
              <Bonus b={o.b} />
              {o.d && <p className="mc-src">Et sa propre infobulle annonce autre chose encore : « {o.d} ».</p>}
              <p>
                Elle se vendra pourtant au prix des autres runes TANK, parce que son nom est le
                même. Un Templier au glaive qui la grave a payé une rune de prêtre.
              </p>
            </Point>
          </div>
        ))}

        {r.manquants.map((m) => (
          <Point key={`${m.gamme}-${m.modele}`} titre={`La ${m.modele} ${m.gamme.replace(/^Arme /, "")} n'existe pas dans le relevé`} marque="verifier">
            <p>
              C&apos;est le seul trou de la gamme : les autres modèles d&apos;arme y sont tous,
              celui-là n&apos;a ni nom français ni colonnes de statistiques. Tant que personne
              n&apos;a lu ses bonus en jeu, elle ne vaut <b>rien de prouvé</b> — et surtout pas le
              prix des autres.
            </p>
            <p className="mc-src">
              Le client laisse un indice ailleurs : l&apos;arme
              {" "}« {objet("II_WEA_AXT_VEMPIRE")?.n ?? "Doloire Vampirique"} » porte la note
              {" "}« {objet("II_WEA_AXT_VEMPIRE")?.d ?? ""} ».
            </p>
          </Point>
        ))}

        {r.intruses.map((o) => (
          <Point key={o.cle} titre={`« ${o.n} » détonne dans sa gamme`} marque="verifier">
            <p>
              Toutes ses voisines donnent du critique, de la vitesse ou de la puissance
              magique. Elle, elle donne du défensif :
            </p>
            <Bonus b={o.b} />
            <p>
              Ce n&apos;est peut-être pas une erreur — la doloire est l&apos;arme des tanks — mais
              qui l&apos;achète pour taper se trompe.
            </p>
          </Point>
        ))}

        {r.doublons.map((l) => (
          <Point key={l[0].cle} titre="Et un doublon qui traîne">
            <p>
              La « <b>{l[0].n}</b> » existe {l.length} fois, sous {l.length} clés différentes —
              {" "}{l.map((o) => o.cle.replace("II_SYS_SYS_RUNE_", "")).join(" et ")} — dont une
              rangée du côté des runes d&apos;arme avec les bonus de la rune de tenue. Deux objets
              différents, un seul nom : de quoi se tromper à l&apos;achat comme à la vente.
            </p>
            <Bonus b={l[0].b} />
          </Point>
        ))}
      </div>
    </div>
  );
}
