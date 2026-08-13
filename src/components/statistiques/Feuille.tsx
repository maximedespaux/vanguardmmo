import { Bulle } from "@/components/Bulle";
import { DeStat, STATS, STAT_FR, type Stat } from "@/components/jeu/Interface";
import { Emplacements } from "@/components/jeu/Rarete";
import {
  CERTITUDE_MOT, CERTITUDE_TON, FAMILLE_TITRE, estExacte, familleDe,
  type Certitude, type Etape, type Feuille as TFeuille, type LigneDeStat, type SourceDuPanneau, type Terme,
} from "./moteur";
import "./statistiques.css";

/**
 * L'ÉCRAN QUI MONTRE LE CALCUL — « un peu à la DofusBook » selon Maxime.
 *
 * ┌──────── LA RÈGLE QUI TIENT TOUT CE FICHIER ────────┐
 * │ AUCUN NOMBRE NE S'AFFICHE SANS SA SOURCE. Pas un.   │
 * │ Chaque terme porte une pastille de certitude, et sa │
 * │ source se lit dans une bulle au survol — et au clic, │
 * │ pour le doigt. Un moteur dont on ne peut pas         │
 * │ remonter le chemin ne se vérifie pas, donc ne se     │
 * │ corrige pas, donc ne sert à rien.                    │
 * └─────────────────────────────────────────────────────┘
 *
 * AUCUN COMPOSANT CLIENT ICI. Ces briques ne font que du rendu, et la page qui les
 * emploie est un composant serveur qui lit des relevés de plusieurs mégaoctets. Un
 * `"use client"` ici enverrait ces relevés au navigateur. Les deux seules choses
 * clientes sont `Bulle` et `Invisible`, importées : c'est leur métier.
 *
 * MAIS ATTENTION AU PAQUET RSC : la planche des mécaniques enveloppe tout dans
 * `VoletSections`, qui est CLIENT. Le contenu part donc en entier au navigateur,
 * volet ouvert ou pas, et POUR CHAQUE COMPOSANT rendu le paquet porte en plus son
 * nom, sa pile d'appel et ses props sérialisées. D'où la règle du fichier voisin
 * `mecaniques/Blocs.tsx`, reprise ici : UNE BRIQUE PREND SA LISTE. `Termes` est
 * appelée une fois et rend N lignes d'HTML, plutôt que N composants `<Terme/>`.
 */

/* ── La pastille de certitude ───────────────────────────────────────────────── */

/**
 * QUATRE DEGRÉS, QUATRE TEINTES, ET LA COULEUR NE COMPARE RIEN.
 *
 * C'est une distinction qui a déjà coûté une reprise ailleurs sur ce site : la
 * couleur ne doit jamais porter une GRANDEUR (le vert et le doré ne se distinguent
 * pas pour un daltonien protan, 5,8 de deltaE mesuré). Ici elle ne porte pas une
 * grandeur, elle porte une CATÉGORIE — et le mot est écrit dedans, en clair, donc
 * la couleur n'est qu'un renfort.
 *
 * `absent` mérite un mot : c'est le degré qui fait la valeur de tout l'écran. Un
 * moteur ordinaire ne montre pas ce qu'il ignore ; celui-ci le met dans la liste,
 * en pointillés, avec la raison. C'est la règle de Maxime : « un dégât faux est pire
 * qu'un dégât absent. »
 */
const CERT_COURT: Record<Certitude, string> = {
  client: "client", deduit: "calculé", hypothese: "hypothèse", absent: "absent",
};

function pastille(c: Certitude, source: string, detail?: string) {
  return (
    <Bulle
      largeur={300}
      quoi={
        <>
          <b style={{ color: CERTITUDE_TON[c] }}>{CERTITUDE_MOT[c]}.</b> {source}
          {detail && <><br /><span style={{ color: "var(--text-muted)" }}>{detail}</span></>}
        </>
      }
    >
      <span className="st-cert" style={{ ["--ton" as string]: CERTITUDE_TON[c] }}>{CERT_COURT[c]}</span>
    </Bulle>
  );
}

/* ── Les termes d'une étape ─────────────────────────────────────────────────── */

/** Une liste de termes. Fonction et non composant : appelée, elle ne laisse aucune
 *  annotation dans le paquet RSC — cf. l'en-tête du fichier. */
function Termes({ termes }: { termes: Terme[] }) {
  return (
    <div className="st-termes">
      {termes.map((t, i) => {
        const absent = t.valeur == null;
        const moins = (t.valeur ?? 0) < 0;
        return (
          <div key={i} className={`st-terme${absent ? " st-absent" : ""}${moins ? " st-moins" : ""}`}>
            <span className="st-terme-q">{t.quoi}</span>
            {pastille(t.certitude, t.source, t.detail)}
            <span className="st-terme-v">
              {/* DEUX RAISONS DE N'AVOIR PAS DE NOMBRE, ET ELLES NE SE DISENT PAS
                  PAREIL. « La valeur n'est pas dans le client » est un TROU ; « ces
                  lignes ne s'additionnent pas » est un REFUS D'ADDITIONNER des
                  valeurs pourtant toutes lues. Le terme du cumul des paliers portait
                  la phrase du trou alors que ses trois nombres sont dans le client :
                  `valeurTexte` dit ce qu'il en est à sa place. */}
              {t.valeurTexte
                ? t.valeurTexte
                : absent
                  /* LA PHRASE EXACTE DEMANDÉE, et elle vaut mieux qu'un nombre : elle dit
                     ce qui manque ET pourquoi, là où un « — » laisserait croire à zéro. */
                  ? "non pris en compte : la valeur n'est pas dans le client"
                  : `${t.valeur! > 0 ? "+" : ""}${t.valeur!.toLocaleString("fr-FR")}`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Une feuille de calcul complète ─────────────────────────────────────────── */

/**
 * UNE FEUILLE : le sujet, les étapes, le résultat, les réserves.
 *
 * L'ordre est celui du calcul, pas celui de l'importance : on lit du socle au
 * résultat, comme on lirait une addition à la main. C'est ce qui permet de POINTER
 * l'endroit où l'on n'est pas d'accord — et c'est tout l'intérêt d'afficher un
 * chemin plutôt qu'un nombre.
 */
export function Feuille({ f }: { f: TFeuille }) {
  const exacte = estExacte(f);
  return (
    <div className="st-feuille">
      <h4 className="st-feuille-t">
        {f.titre}
        {exacte && (
          <span className="st-cert" style={{ ["--ton" as string]: "var(--green)" }}>
            calcul exact
          </span>
        )}
      </h4>
      <p className="st-sujet">{f.sujet}</p>

      {f.etapes.map((e, i) => <UneEtape key={i} e={e} unite={f.unite} />)}

      <div className="st-total">
        <span className="st-total-l">
          {f.resultatTexte
            ? "Ce que la feuille a compté"
            : f.resultatMax != null && f.resultatMax !== f.resultat
              ? "Total — le jeu tire entre les deux bornes"
              : "Total"}
        </span>
        <span className="st-total-v">
          {/* `resultatTexte` GAGNE sur le nombre : une feuille dont les lignes ne
              s'additionnent pas (la panoplie mêle des points et des pourcentages) dit
              ce qu'elle a compté au lieu d'afficher une somme sans unité. */}
          {f.resultatTexte
            ? f.resultatTexte
            : f.resultat == null
              ? "non calculable"
              : f.resultatMax != null && f.resultatMax !== f.resultat
                ? `${f.resultat.toLocaleString("fr-FR")} à ${f.resultatMax.toLocaleString("fr-FR")}`
                : f.resultat.toLocaleString("fr-FR")}
          {(f.resultat != null || f.resultatTexte) && (
            <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 400 }}> {f.unite}</span>
          )}
        </span>
      </div>

      {/* LES RÉSERVES SONT SOUS LE TOTAL, pas sous le titre : c'est au moment où l'on
          vient de lire un nombre qu'il faut savoir ce qu'il ne couvre pas. Placées en
          tête, elles se lisent comme un avertissement général qu'on saute. */}
      {f.reserves.length > 0
        ? f.reserves.map((r, i) => (
          <p key={i} className="st-reserve"><span aria-hidden="true">▲</span><span>{r}</span></p>
        ))
        : (
          <p className="st-reserve st-exacte">
            <span aria-hidden="true">✓</span>
            <span>Tous les termes sont lus dans le client ou calculés sur lui : ce total ne repose sur aucune hypothèse.</span>
          </p>
        )}
    </div>
  );
}

function UneEtape({ e, unite }: { e: Etape; unite: string }) {
  return (
    <div className="st-etape">
      <div className="st-etape-t">
        <span className="st-etape-n">{e.nom}</span>
        <code className="st-formule">{e.formule}</code>
      </div>
      <Termes termes={e.termes} />
      {e.resultat != null && (
        <p className="st-sujet" style={{ margin: "6px 0 0", textAlign: "right" }}>
          →{" "}
          <b style={{ color: "var(--text)" }}>
            {e.resultatMax != null && e.resultatMax !== e.resultat
              ? `${e.resultat.toLocaleString("fr-FR")} à ${e.resultatMax.toLocaleString("fr-FR")}`
              : e.resultat.toLocaleString("fr-FR")}
          </b>{" "}
          {e.unite ?? unite}
        </p>
      )}
      {e.reserve && <p className="st-reserve"><span aria-hidden="true">▲</span><span>{e.reserve}</span></p>}
    </div>
  );
}

/* ── Le panneau de caractéristiques ─────────────────────────────────────────── */

/**
 * LE PANNEAU DE CARACTÉRISTIQUES — le total ET le détail, ligne par ligne.
 *
 * ┌──────── LES QUATRE DÉS DISENT DÉJÀ LEUR NOM ────────┐
 * │ `statdice_str`, `statdice_sta`, `statdice_dex` et     │
 * │ `statdice_int` portent FOR, END, DEX et INT GRAVÉS    │
 * │ DANS L'IMAGE. Écrire « Force » à côté du dé « FOR »   │
 * │ dirait la même chose deux fois. Le mot part donc dans │
 * │ le texte de remplacement et dans l'infobulle, où il   │
 * │ sert à qui ne voit pas l'image — et nulle part        │
 * │ ailleurs. C'est déjà la règle de `DeStat`.            │
 * └──────────────────────────────────────────────────────┘
 *
 * LES BARRES : une seule teinte, l'or de la colonne, et la LONGUEUR porte la
 * grandeur. Elles partent du MILIEU parce qu'une ligne de panoplie peut être
 * NÉGATIVE — les Shaitan retirent du taux de dégâts JcJ, les Dryades des dégâts JcJ.
 * Une barre qui ne saurait aller que vers la droite ferait passer un malus pour un
 * petit bonus.
 */
export function PanneauCaracteristiques({ lignes, sources, base, dominante }: {
  lignes: LigneDeStat[];
  /**
   * LES QUATRE STATISTIQUES DE BASE DU PORTEUR, dans l'ordre FOR / END / DEX / INT.
   *
   * Sans elles, la rangée de dés affichait quatre tirets sur le build de l'exemple —
   * et c'était exact : ni l'Épée en Yggdrasil Purifié, ni l'Armure de l'Apocalypse ne
   * donnent un seul point de statistique brute, leur valeur est ailleurs (Attaque %,
   * taux critique, précision). Un panneau de caractéristiques qui montre quatre
   * tirets ne démontre rien, alors que la fenêtre du jeu, elle, montre toujours la
   * base ET le bonus. On montre donc les deux, et le dé porte la somme.
   */
  base?: Record<Stat, number>;
  /** Les sources, une par pièce. Voir `panneauDeCaracteristiques` : elles sortent du
   *  tableau parce qu'une même phrase y partait six fois. */
  sources: SourceDuPanneau[];
  /** L'échelle des barres. Par défaut la plus grande valeur absolue du panneau. */
  dominante?: number;
}) {
  const haut = Math.max(dominante ?? 0, ...lignes.map((l) => Math.abs(l.total)), 1);
  const valeurDe = (fr: string) => lignes.find((l) => l.stat === fr)?.total ?? 0;

  /* Les quatre familles côte à côte plutôt qu'une colonne de quarante lignes : c'est
     le classement que le résumé du builder emploie déjà, et deux écrans qui rangeraient
     la même statistique ailleurs se contrediraient sous les yeux du joueur. */
  const familles = (["offensif", "defensif", "vitalite", "utilitaire"] as const)
    .map((f) => ({ f, l: lignes.filter((x) => familleDe(x.stat) === f) }))
    .filter((x) => x.l.length > 0);

  return (
    <div>
      {/* Les quatre dés restent affichés À ZÉRO : ce sont les quatre lignes que tout
          joueur cherche, et un cadre qui apparaît et disparaît se lit moins bien qu'un
          cadre à zéro. */}
      <div className="st-des">
        {STATS.map((s: Stat) => {
          const bonus = valeurDe(STAT_FR[s]);
          const socle = base?.[s] ?? 0;
          const total = socle + bonus;
          return (
            <span key={s} className={`st-de${total ? "" : " nil"}`}>
              <DeStat stat={s} taille={30} />
              {/* LE MOT N'EST PAS RÉÉCRIT À CÔTÉ DU DÉ : `statdice_str` porte « FOR »
                  gravé dans l'image, et les trois autres de même. Il ne part que dans
                  le texte de remplacement, pour qui ne voit pas l'image. */}
              <b>
                {total ? total.toLocaleString("fr-FR") : "—"}
                {bonus !== 0 && (
                  <span style={{ fontSize: 10.5, fontWeight: 400, color: "var(--text-muted)" }}>
                    {" "}({socle.toLocaleString("fr-FR")} {bonus > 0 ? "+" : "−"} {Math.abs(bonus).toLocaleString("fr-FR")})
                  </span>
                )}
              </b>
            </span>
          );
        })}
      </div>

      {familles.map(({ f, l }) => (
        <div key={f} style={{ marginBottom: 11 }}>
          <p className="mc-groupe-t" style={{ margin: "0 0 5px" }}>{FAMILLE_TITRE[f]}</p>
          <div className="st-lignes">
            {l.map((ligne) => <UneLigne key={ligne.stat} ligne={ligne} haut={haut} />)}
          </div>
        </div>
      ))}

      {/* LES SOURCES, UNE PAR PIÈCE. Elles ne sont pas dans le tableau : « d'où vient
          ce point » est un fait qui appartient à la pièce, et l'écrire dans chaque
          ligne envoyait la même phrase six fois sur le réseau. Le compte de lignes
          alimentées dit lesquelles portent le build. */}
      {sources.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <p className="mc-groupe-t" style={{ margin: "0 0 5px" }}>
            Les {sources.length} sources de ce panneau
          </p>
          <div className="st-lignes">
            {sources.map((s) => (
              <div key={s.de} className="st-ligne-h" style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 9 }}>
                <span className="st-ligne-n">
                  <Bulle largeur={300} quoi={<><b style={{ color: CERTITUDE_TON[s.certitude] }}>{CERTITUDE_MOT[s.certitude]}.</b> {s.source}</>}>
                    {s.de}
                  </Bulle>
                </span>
                <span style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                  {s.lignes} ligne{s.lignes > 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function UneLigne({ ligne, haut }: { ligne: LigneDeStat; haut: number }) {
  const moins = ligne.total < 0;
  /* Plancher à 1,5 % : sans lui une valeur minuscule perd sa barre, et l'absence de
     barre se lit comme une donnée manquante — le contraire du fait qu'on montre. */
  const part = Math.max(1.5, (Math.abs(ligne.total) / haut) * 50);
  return (
    <div className="st-ligne">
      <div className="st-ligne-h">
        <span className="st-ligne-n">
          {ligne.stat}
          {/* LA PASTILLE `Invisible` A ÉTÉ RETIRÉE D'ICI, et c'est la règle de parcimonie
              qui l'exige : « si tout est marqué, plus rien ne l'est ». Ce panneau peut
              porter neuf lignes négatives, donc neuf pastilles identiques, chacune avec
              sa phrase de vingt mots sérialisée trois fois dans le paquet RSC. Le fait
              est le MÊME pour toutes : il est dit UNE fois, sous le panneau, dans le
              volet. Reste ici la seule marque qui change d'une ligne à l'autre — que
              celle-ci, précisément, perd des points. */}
          {ligne.aDuNegatif && (
            <span title="Une pièce retire des points sur cette ligne — le jeu ne l'affiche pas."
              style={{ fontSize: 10.5, color: "var(--red)", fontWeight: 700 }}>une pièce en retire</span>
          )}
        </span>
        <span className={`st-ligne-v${moins ? " moins" : ""}`}>
          {ligne.total > 0 ? "+" : ""}{ligne.total.toLocaleString("fr-FR")}
        </span>
      </div>
      <span className="st-piste" aria-hidden="true">
        <span
          className={`st-plein${moins ? " moins" : ""}`}
          style={moins ? { right: "50%", left: "auto", width: `${part}%` } : { width: `${part}%` }}
        />
      </span>
      {/* LE DÉTAIL EST TOUJOURS OUVERT, et ce n'est pas une facilité : la demande est
          « voir COMMENT on y arrive ». Un détail replié derrière un clic transforme le
          panneau en total, ce qui est exactement ce qu'on cherchait à dépasser. */}
      <div className="st-apports">
        {ligne.apports.map((a, i) => (
          <div key={i} className="st-apport">
            <span>{a.de}</span>
            <b className={a.valeur < 0 ? "moins" : undefined}>
              {a.valeur > 0 ? "+" : ""}{a.valeur.toLocaleString("fr-FR")}
            </b>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── LE SERTISSAGE N'EST PAS ICI, ET C'EST VOLONTAIRE ────────────────────────
   Une brique `SchemaSertissage` a vécu dans ce fichier. Elle a été retirée sans
   jamais être servie : le volet « Sertissage » de la même page dessine DÉJÀ les
   losanges du jeu (`Emplacements` de `jeu/Rarete.tsx`, ligne 135 de
   `mecaniques/SectionsObjets.tsx`) et porte DÉJÀ l'avertissement des huit
   logements contre les cinq annoncés. Deux schémas du même fait sur une seule
   page ne disent rien de plus, et la mesure de prose l'a confirmé : la phrase
   « la fenêtre de sertissage n'annonce que 5 logements » partait deux fois.
   Pour un schéma de sertissage, appeler `Emplacements` directement.            */
