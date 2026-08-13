"use client";
import Link from "next/link";
import { Icon, type IconName } from "@/components/Icon";
import { Bulle, Invisible } from "@/components/Bulle";
import { EnteteVolet, VoletSections, type SectionVolet } from "@/components/VoletSections";
import { useCardFx } from "@/components/VgFx";
import { DeStat, STATS } from "@/components/jeu/Interface";
import { NomObjet } from "@/components/objets/NomObjet";
import BUTIN from "@/data/monstres-butin.json";
import { CarteMonstre } from "./Recherche";
import { Resistances, SchemaSeuils, SchemaVies, type EvenementSeuil } from "./Graphiques";
import {
  bornesInversees, cadence, coupMax, coupMin, court, ELEMENT_FR, entier, iconeButin,
  iconeElement, parSeconde, portraitDe, TON_ELEMENT, tonRang, type Monstre,
} from "./vocabulaire";

/**
 * LA FICHE D'UN MONSTRE.
 *
 * Le rail sert ici parce que la fiche a vraiment plusieurs facettes qui ne se
 * lisent pas au même moment : on regarde « ce qu'il encaisse » avant le combat,
 * « ce qu'il fait » pendant, « ce qu'il lâche » après, et « où il est » avant de
 * partir.
 *
 * ┌──────── UNE SECTION VIDE N'EXISTE PLUS ────────┐
 * │ « Aucune mécanique scriptée pour ce monstre »,  │
 * │ « aucun point d'apparition dans les cartes »,   │
 * │ « une fiche sans butin ne veut pas dire… » :    │
 * │ trois sections qui, les trois quarts du temps,  │
 * │ ne portaient qu'un constat d'ignorance et sa    │
 * │ statistique de consolation. Elles ne sont plus  │
 * │ CONSTRUITES quand elles sont vides. Le rail est │
 * │ donc court et tout ce qu'il annonce existe —    │
 * │ chaque entrée portant son compte, on sait ce    │
 * │ qu'il y a dedans sans l'ouvrir.                │
 * └────────────────────────────────────────────────┘
 *
 * Ce qui est parti aussi : l'expérience, la penya, les points Madrigal et les taux
 * de butin. Les objets, eux, sont RESTÉS — c'est leur NOM qui sert, et il est
 * maintenant montré avec l'icône du client.
 *
 * ┌────── CE QUE CETTE PASSE A CHANGÉ : LE BUTIN MÈNE TROIS FOIS ────────┐
 * │ « Ce qu'il lâche » affichait une grille d'icônes et de noms MORTS,    │
 * │ puis des liens vers la fiche de l'objet. Il manquait encore les deux  │
 * │ questions suivantes, qui sont celles qu'on se pose vraiment devant un │
 * │ butin : d'OÙ ÇA VIENT D'AUTRE, et COMMENT JE L'OBTIENS. C'est ce que  │
 * │ `NomObjet` sait faire — la fiche, la provenance (chargée seulement à  │
 * │ l'ouverture de la bulle) et « le demander à la guilde », qui dépose   │
 * │ le nom dans la boutique. Les trois briques existaient, elles          │
 * │ n'étaient pas branchées ici.                                          │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * ┌──── LES QUATRE DÉS DU JEU À LA PLACE DE QUATRE MOTS ────┐
 * │ « Force · Endurance · Dextérité · Intelligence » puis    │
 * │ quatre nombres : huit mots pour une ligne que le jeu     │
 * │ dessine lui-même. Les dés de `jeu/Interface` portent     │
 * │ FOR, END, DEX et INT GRAVÉS dans la pierre — on ne       │
 * │ réécrit donc pas ces mots à côté.                        │
 * └─────────────────────────────────────────────────────────┘
 */

/** Ce que le pont sait d'un objet lâché : son nom, son identifiant de fiche, et son
 *  icône QUAND elle existe sur le disque — huit des 106 n'en ont pas, et on ne
 *  pointe jamais un fichier absent. */
type Trouve = { n: string; i: number; ic?: string };
const OBJETS = (BUTIN as { objets: Record<string, Trouve> }).objets;

/** Une ligne chiffrée. `tabular-nums` partout : sans ça, les colonnes de PV et de
 *  dégâts dansent d'une ligne à l'autre et on ne peut plus les comparer d'un œil. */
function Ligne({ quoi, valeur, ton }: { quoi: React.ReactNode; valeur: React.ReactNode; ton?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "7px 0", borderTop: "1px solid color-mix(in srgb, var(--border) 55%, transparent)" }}>
      <span style={{ fontSize: 12.5, color: "var(--text-muted)", flex: "1 1 auto", minWidth: 0 }}>{quoi}</span>
      <span className="font-heading" style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: ton ?? "var(--text)", flexShrink: 0, textAlign: "right" }}>
        {valeur}
      </span>
    </div>
  );
}

/** Une tuile marquante, pour les deux ou trois chiffres qui décident du combat. */
function Tuile({ titre, valeur, sous, ton = "var(--orange)", icon }: {
  titre: React.ReactNode; valeur: React.ReactNode; sous?: string; ton?: string; icon: IconName;
}) {
  return (
    <div style={{ background: "var(--bg-3)", border: `1px solid color-mix(in srgb, ${ton} 26%, var(--border))`, borderRadius: 11, padding: "11px 13px", minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".7px", color: "var(--text-muted)" }}>
        <Icon name={icon} size={11} style={{ color: ton }} />{titre}
      </div>
      <div className="font-heading" style={{ fontSize: 19, fontWeight: 700, color: ton, fontVariantNumeric: "tabular-nums", marginTop: 2, lineHeight: 1.15 }}>{valeur}</div>
      {sous && <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>{sous}</div>}
    </div>
  );
}

/** Un titre de bloc dans une section. */
function Titre({ icon, ton, children, apres }: {
  icon: IconName; ton: string; children: React.ReactNode; apres?: React.ReactNode;
}) {
  return (
    <div className="font-heading" style={{ fontSize: 13.5, fontWeight: 700, color: ton, display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
      <Icon name={icon} size={14} /> {children}
      {apres && <span style={{ fontWeight: 400, color: "var(--text-muted)", fontSize: 12 }}>{apres}</span>}
    </div>
  );
}

/**
 * LES RENFORTS QU'ON A LE DROIT D'AFFICHER.
 *
 * Un monstre du catalogue — Hadeseor — porte un bloc de renfort ENTIÈREMENT VIDE :
 * le client y écrit le nom « 0 », la quantité 0 et le seuil 0. La fiche en faisait
 * « sous 0 % PV · 0 », une ligne qui annonce un renfort qui n'existe pas. Règle du
 * renseignement incomplet : elle disparaît. Les 29 autres blocs sont pleins et
 * portent tous 100, c'est-à-dire « dès l'engagement ».
 */
const renfortUtile = (m: Monstre) =>
  m.renfort && m.renfort.n > 0 && m.renfort.m && m.renfort.m !== "0" ? m.renfort : null;

export function FicheMonstre({ m, voisins }: { m: Monstre; voisins: Monstre[] }) {
  useCardFx();
  const seReleve = (m.vies ?? 0) > 1;
  const vies = m.vies ?? 1;
  const ic = iconeElement(m.elem);
  const portrait = portraitDe(m.id);
  const renfort = renfortUtile(m);

  /**
   * TOUT CE QUI SE DÉCLENCHE À UN SEUIL DE PV, EN UNE SEULE LISTE.
   *
   * La rage, le soin, les renforts et la fuite étaient quatre blocs séparés, chacun
   * avec son titre et ses lignes « sous N % PV ». Or ce sont quatre événements de la
   * MÊME horloge — celle de la barre de vie — et c'est leur ordre qui décide du
   * combat. Une seule liste, dessinée par `SchemaSeuils`, le montre.
   *
   * Les deux conseils de jeu qui ne se devinent pas restent, portés par CHAQUE ligne
   * de leur mécanique — c'est `SchemaSeuils` qui n'en garde qu'un, sur la première
   * ligne AFFICHÉE. Les poser ici sur la ligne d'indice 0 les accrochait à la
   * première ligne DU FICHIER, que le schéma déplace ensuite : sur le Junglosaure, le
   * client écrit ses rages en 20, 10, 30, 30, 2, 30, 20, et le conseil du tank
   * tombait sur la cinquième ligne dessinée au lieu de la première. Répété à chaque
   * seuil il serait du bruit ; accroché au hasard il est invisible.
   */
  const seuils: EvenementSeuil[] = [];
  (m.rage ?? []).forEach((r) => seuils.push({
    pv: r.pv, icon: "flame", ton: "var(--red)",
    astuce: "C'est la fin du combat qui tue, pas le début : le tank doit avoir ses soins prêts au passage du seuil.",
    quoi: (
      <>
        <b style={{ color: "var(--red)", fontVariantNumeric: "tabular-nums" }}>dégâts ×{r.x.toLocaleString("fr-FR")}</b>
        {coupMax(m) ? <span style={{ color: "var(--text-muted)" }}> · jusqu&apos;à {court(Math.round(coupMax(m) * r.x))} par coup</span> : null}
      </>
    ),
  }));
  (m.soigne ?? []).forEach((s) => seuils.push({
    pv: s.pv, icon: "sparkles", ton: "var(--green)",
    astuce: "Le soin ne part qu'une fois. Un groupe qui passe le seuil d'un seul coup ne le déclenche pas — c'est ce qui décide de garder les gros dégâts pour la fin.",
    quoi: <>il rend <b style={{ color: "var(--green)", fontVariantNumeric: "tabular-nums" }}>{s.rend} %</b> de sa vie</>,
  }));
  if (renfort) seuils.push({
    pv: renfort.pv >= 100 ? 100 : renfort.pv, icon: "megaphone", ton: "var(--gold)",
    quoi: <>renforts · <b style={{ color: "var(--gold)" }}>{renfort.m}</b>{renfort.n > 1 ? ` ×${renfort.n}` : ""}</>,
  });
  if (m.fuit != null) seuils.push({
    pv: m.fuit, icon: "arrow-right", ton: "var(--blue)",
    quoi: <b style={{ color: "var(--blue)" }}>il fuit</b>,
  });

  /**
   * LE COMPTE DE LA SECTION EST CELUI DE CE QU'ELLE MONTRE.
   *
   * Il comptait `distance` — l'attaque à distance — qui s'affiche dans la section
   * PRÉCÉDENTE, « ce qu'il te fait ». Conséquences recomptées sur le relevé : le rail
   * de Junglosaure annonçait 26 pour 25 lignes, et 14 monstres n'avaient QUE ce champ
   * pour toute mécanique comptée — 13 ouvraient donc une section « ce qu'il fait en
   * combat » ENTIÈREMENT VIDE, la quatorzième (MI_GIANTTREEK1) n'y montrant que sa
   * ligne de tâche. C'est cette section vide que la fiche a cessé de construire ;
   * elle rentrait par le compteur.
   */
  const nbMecaniques = seuils.length + (m.invoque?.length ?? 0);

  /* Le butin, réduit à ce qui sert : des NOMS, avec l'icône du client. Les taux
     sont partis (« on s'en fiche »), et avec eux l'avertissement qui expliquait
     pourquoi les tables ordinaires manquaient. Un objet dont le relevé ne rend ni
     nom français ni icône est écarté plutôt qu'affiché en clé brute
     (`II_GEN_JEW_RIN_INTRING` n'apprend rien à personne). */
  const objets: Trouve[] = [];
  const vus = new Set<string>();
  for (const b of [...(m.butin ?? []), ...(m.butinClient ?? [])]) {
    const o = OBJETS[b.o];
    if (!o || vus.has(o.n)) continue;
    vus.add(o.n);
    objets.push(o);
  }

  const sections: SectionVolet[] = [

    {
      clef: "encaisse", titre: "Ce qu'il encaisse", sous: "PV, défense, résistances", icon: "shield",
      compte: null,
      contenu: (
        <div style={{ display: "flex", gap: 15, alignItems: "flex-start", flexWrap: "wrap" }}>
          {/* L'illustration de sa carte du client — huit monstres du catalogue en
              ont une dont le dessin a été vérifié (cf. `portraitDe`). Quand il n'y
              en a pas, on ne met rien : ni cadre vide, ni pictogramme générique. */}
          {portrait && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={portrait} alt={m.nom} width={96} height={218}
              style={{ width: 96, height: 218, objectFit: "cover", borderRadius: 10, border: "1px solid var(--border)", flexShrink: 0 }} />
          )}
          <div style={{ display: "grid", gap: 14, flex: "1 1 300px", minWidth: 0 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(148px,1fr))", gap: 9 }}>
              <Tuile icon="heart" ton={seReleve ? "var(--red)" : "var(--orange)"}
                titre={seReleve
                  ? (
                    /* La pastille est POSÉE SUR LE CHIFFRE : c'est ici qu'on lit le
                       nombre, donc ici qu'on doit apprendre que le jeu ne le montre
                       jamais. */
                    <Invisible enJeu={`Sa barre de vie annonce ${entier(m.pv)} PV — les PV d'une seule vie. Il en a ${vies} : un groupe qui se prépare sur le chiffre affiché se trompe d'un facteur ${vies}.`}>
                      <span>PV à sortir</span>
                    </Invisible>
                  )
                  : "PV"}
                valeur={court(m.pvEff)} sous={seReleve ? `${entier(m.pv)} × ${vies} vies` : entier(m.pv)} />
              <Tuile icon="shield" titre="Défense" valeur={entier(m.def)} ton="var(--blue)" />
              <Tuile icon="sparkles" titre="Résistance magique" valeur={entier(m.resMag)} ton="var(--purple)" />
            </div>

            {/* Le schéma remplace le paragraphe rouge de six lignes. */}
            {seReleve && <SchemaVies pv={m.pv} vies={vies} pvEff={m.pvEff} taille="petite" />}

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 7 }}>
                {ic && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ic} alt="" width={20} height={20} style={{ objectFit: "contain" }} />
                )}
                <span className="font-heading" style={{ fontSize: 13.5, fontWeight: 700 }}>
                  {ELEMENT_FR[m.elem ?? "aucun"] ?? "élément inconnu"}
                  {m.elemNiv ? <span style={{ color: "var(--text-muted)", fontWeight: 400 }}> · niveau {m.elemNiv}</span> : null}
                </span>
              </div>
              {/* Les cinq colonnes du client, en graphique : la phrase « il prend
                  plus de dégâts à l'eau et résiste au feu » se lit dans le dessin,
                  et le dessin dit en plus DE COMBIEN. */}
              <Resistances res={m.res} />
            </div>

            <div>
              <Ligne quoi="Points de magie" valeur={entier(m.pm)} />
              <Ligne quoi="Esquive" valeur={entier(m.esq)} />
              <Ligne quoi="Précision" valeur={entier(m.prec)} />
              {/* Les quatre dés du jeu, dans l'ordre où le relevé range `sta` : force,
                  endurance, dextérité, intelligence — le même ordre que `STATS`. Le mot
                  est DANS la pierre, et le texte de remplacement du dé le porte pour
                  qui ne voit pas l'image : rien à réécrire à côté. */}
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", paddingTop: 10, borderTop: "1px solid color-mix(in srgb, var(--border) 55%, transparent)" }}>
                {STATS.map((s, i) => (
                  <DeStat key={s} stat={s} taille={30}
                    valeur={m.sta[i] == null ? "—" : m.sta[i]!} />
                ))}
              </div>
            </div>
          </div>
        </div>
      ),
    },

    {
      clef: "frappe", titre: "Ce qu'il te fait", sous: "dégâts par coup et cadence", icon: "sword-cross",
      compte: null,
      contenu: (
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(148px,1fr))", gap: 9 }}>
            {/* `coupMax` et non `atkMax` : cinq monstres du client portent leurs deux
                bornes à l'envers, et cette tuile annonçait pour eux un coup dix fois
                trop faible — 36 k pour la Divinité du Chaos, là où /worldboss disait
                360 k du même monstre. L'inversion est DITE plutôt que corrigée en
                silence : elle protège d'une préparation faite sur le mauvais chiffre. */}
            <Tuile icon="sword" titre="Dégâts par coup" ton="var(--red)"
              valeur={coupMax(m) ? court(coupMax(m)) : "—"}
              sous={coupMin(m) !== coupMax(m)
                ? `${entier(coupMin(m))} à ${entier(coupMax(m))}${bornesInversees(m) ? " — bornes inversées dans le client" : ""}`
                : undefined} />
            <Tuile icon="clock" titre="Cadence" ton="var(--gold)"
              valeur={cadence(m.delai) ?? "—"} sous={m.delai ? `${entier(m.delai)} ms` : undefined} />
            {parSeconde(m) ? (
              <Tuile icon="gauge" titre="Par seconde" ton="var(--red)" valeur={court(parSeconde(m))}
                sous="sur une cible, avant ta défense" />
            ) : null}
            {m.distance ? <Tuile icon="target" titre="Attaque à distance" ton="var(--blue)" valeur={`${m.distance} m`} /> : null}
          </div>

          {/* CE QUI A QUITTÉ CE BLOC, et pourquoi.
              · « Agressivité » : le relevé n'écrit que trois valeurs, toutes trois
                commençant par « agressif », sur 1 122 monstres des 1 124. Une ligne
                qui dit la même chose sur toutes les fiches n'informe personne, et la
                page d'accueil des monstres porte déjà le fait une fois. Sa précision
                entre parenthèses est soit une redite de la ligne « Attaque à
                distance » juste au-dessus, soit un « 2x » dont rien dans le client ne
                dit ce qu'il compte — règle du renseignement incomplet.
              · « Vole : Non » : vrai sur 18 monstres du catalogue, donc écrit « Non »
                sur les 1 106 autres. Il ne s'affiche plus que quand il est vrai. */}
          {(m.aggro || m.vole) && (
            <div>
              {m.aggro ? <Ligne quoi="Portée d'aggro" valeur={`${m.aggro} m`} /> : null}
              {m.vole ? <Ligne quoi="Il vole" valeur="Oui" ton="var(--blue)" /> : null}
            </div>
          )}
        </div>
      ),
    },
  ];

  /* `|| m.tache` : 18 des 22 monstres qui comptent pour la tâche « tuer un boss »
     n'ont aucune mécanique à seuil ni invocation, et 17 d'entre eux ne construisaient
     donc pas la section qui porte ce fait — un renseignement qui change un geste
     (lequel aller tuer) était perdu pour dix-sept fiches. Le dix-huitième
     (MI_GIANTTREEK1) l'affichait par accident : sa portée d'attaque, comptée à tort,
     ouvrait la section pour lui seul. Le compte, lui, reste celui des lignes de
     mécanique : une pastille « 1 » pour un drapeau n'annoncerait rien. */
  if (nbMecaniques > 0 || m.tache) {
    sections.push({
      clef: "mecaniques", titre: "Ce qu'il fait en combat", icon: "flame",
      // Le sous-titre ne promet que ce qu'il y a dedans : sur les 18 fiches où la
      // seule ligne est la tâche, annoncer « rage, soins, invocations, fuite »
      // ferait ouvrir la section pour rien.
      sous: nbMecaniques > 0 ? "rage, soins, invocations, fuite" : "ce que sa mise à mort valide",
      compte: nbMecaniques || null,
      contenu: (
        <div style={{ display: "grid", gap: 13 }}>
          {/* LES QUATRE MÉCANIQUES À SEUIL EN UN SEUL DESSIN. Elles avaient chacune
              leur titre et leurs lignes « sous N % PV » : quatre blocs pour quatre
              événements de la même horloge, et rien qui dise dans quel ORDRE ils
              arrivent. Les titres « Rage », « Il se soigne » et « Il appelle des
              renforts » sont partis avec eux — l'icône de la ligne les porte, et
              l'effet est écrit à côté. */}
          <SchemaSeuils seuils={seuils} />

          {m.invoque?.length ? (
            <div>
              <Titre icon="users" ton="var(--purple)" apres={`${m.invoque.length} ligne${m.invoque.length > 1 ? "s" : ""}`}>
                Il invoque
              </Titre>
              <div style={{ display: "grid", gap: 4 }}>
                {m.invoque.map((i, k) => (
                  <div key={k} style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 12.5, fontVariantNumeric: "tabular-nums" }}>
                    {/* CE POURCENTAGE-LÀ N'EST PAS UN SEUIL DE PV, c'est une CHANCE
                        d'apparition — et il est écrit nu, dans la même section que la
                        colonne « seuil » du schéma juste au-dessus, depuis que les
                        mots « sous N % PV » en sont partis. Un `title` le dit sans
                        ajouter un mot à l'écran. */}
                    <span title="Sa chance d'apparaître, pas un seuil de vie" style={{ color: "var(--gold)", fontWeight: 700, minWidth: 42 }}>{i.c} %</span>
                    <span style={{ flex: 1, minWidth: 0 }}>{i.m}{i.n > 1 ? ` ×${i.n}` : ""}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Les renforts et la fuite sont passés dans le schéma des seuils : ce sont
              des événements de la barre de vie comme la rage et le soin. */}
          {m.tache ? <Ligne quoi="Compte pour la tâche « tuer un boss »" valeur="Oui" ton="var(--green)" /> : null}
        </div>
      ),
    });
  }

  if (objets.length > 0 || m.titre) {
    sections.push({
      clef: "lache", titre: "Ce qu'il lâche", sous: "les objets nommés dans le client", icon: "package",
      compte: objets.length || null,
      contenu: (
        <div style={{ display: "grid", gap: 14 }}>
          {objets.length > 0 && (
            /* UNE PASTILLE EN RANGÉE, plus une vignette de 92 px. `NomObjet` pose
               l'icône à côté du nom, et un nom de quatre mots dans une colonne de
               92 px se cassait sur trois lignes sous une image centrée. C'est la même
               forme que l'étal d'un PNJ et que les récompenses de /worldboss : un nom
               d'objet se lit pareil partout sur le site.
               `NomObjet` ne reçoit que le NOM et l'icône — c'est tout ce qu'il sait
               prendre. L'identifiant du pont (`o.i`) n'a donc plus d'emploi ici ; il
               reste dans le relevé, prêt pour le jour où la brique acceptera une
               adresse directe. */
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {objets.map((o) => (
                <span key={o.n} style={{ display: "inline-flex", alignItems: "center", background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 10, padding: "6px 11px", fontSize: 12, lineHeight: 1.3 }}>
                  {/* Huit objets du pont arrivaient SANS icône alors que six de leurs
                      fichiers sont là, vérifiés à l'œil : `iconeButin` les rattache
                      (dont le cœur ébréché de Shade, présent sur 265 fiches). Les deux
                      derniers restent sans image — une fleur pour un fragment de cœur
                      est pire que rien. `NomObjet` ne met alors aucune image. */}
                  <NomObjet nom={o.n} icone={iconeButin(o.n, o.ic)} taille={26} />
                </span>
              ))}
            </div>
          )}

          {m.titre ? (
            <div style={{ border: "1px solid color-mix(in srgb, var(--gold) 35%, transparent)", background: "color-mix(in srgb, var(--gold) 7%, transparent)", borderRadius: 10, padding: "11px 13px", fontSize: 13 }}>
              <Icon name="medal" size={14} style={{ marginRight: 6, color: "var(--gold)" }} />
              Titre <b style={{ color: "var(--gold)" }}>{m.titre.t}</b> ·{" "}
              <b style={{ fontVariantNumeric: "tabular-nums" }}>{entier(m.titre.n)}</b> mises à mort
            </div>
          ) : null}
        </div>
      ),
    });
  }

  if (m.lieux?.length) {
    sections.push({
      clef: "ou", titre: "Où le trouver", sous: "les zones où il est posé", icon: "map-pin",
      compte: m.lieux.length,
      contenu: (
        <div style={{ display: "grid", gap: 5 }}>
          {m.lieux.map((l, i) => (
            <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 9, padding: "7px 0", borderTop: i ? "1px solid color-mix(in srgb, var(--border) 55%, transparent)" : "none", fontSize: 13 }}>
              <Icon name="map-pin" size={13} style={{ color: "var(--orange)", flexShrink: 0, transform: "translateY(2px)" }} />
              <span style={{ flex: 1, minWidth: 0, fontWeight: 600 }}>{l.z}</span>
              <span style={{ flexShrink: 0, fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
                <Bulle quoi="Le nombre de points d'apparition posés dans les fichiers de carte, pas le nombre de monstres vivants à un instant donné.">
                  <span>{l.n} apparition{l.n > 1 ? "s" : ""}</span>
                </Bulle>
              </span>
            </div>
          ))}
        </div>
      ),
    });
  }

  if (voisins.length) {
    sections.push({
      clef: "famille", titre: "Sa famille", sous: "les autres paliers, et le même donjon", icon: "layers",
      compte: voisins.length,
      contenu: (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(250px,1fr))", gap: 10 }}>
          {voisins.map((v) => <CarteMonstre key={v.id} m={v} />)}
        </div>
      ),
    });
  }

  return (
    <div style={{ padding: 32, maxWidth: 1150, margin: "0 auto" }}>
      <Link href="/monstres" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--text-muted)", textDecoration: "none", marginBottom: 12 }}>
        <Icon name="arrow-left" size={13} /> Tous les monstres
      </Link>

      <VoletSections
        entete={
          <EnteteVolet
            icon={seReleve ? "skull" : "paw"}
            titre={m.nom}
            marque={seReleve ? { texte: `${vies} vies`, couleur: "var(--red)" } : m.maison ? { texte: "AirFlyff", couleur: "var(--purple)" } : undefined}
            sous={
              <span style={{ display: "flex", gap: 9, flexWrap: "wrap", alignItems: "center" }}>
                <b style={{ color: tonRang(m.rang) }}>{m.rang ?? "rang inconnu"}</b>
                {m.niv != null && <span style={{ fontVariantNumeric: "tabular-nums" }}>niveau {m.niv}</span>}
                {ic && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: TON_ELEMENT[m.elem ?? "aucun"] }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ic} alt="" width={14} height={14} style={{ objectFit: "contain" }} />
                    {ELEMENT_FR[m.elem!]}
                  </span>
                )}
                {m.zone && <span>· {m.zone}</span>}
                {m.groupe && <span>· {m.groupe}</span>}
                {m.maison && seReleve && <span style={{ color: "var(--purple)" }}>· AirFlyff</span>}
              </span>
            }
          />
        }
        sections={sections}
      />
      {/* La règle de survol `.vg-butin` est partie avec la grille de vignettes :
          `NomObjet` porte son propre signal — le pointillé orange sous le nom, celui
          de toutes les bulles du site. Deux affordances pour une même chose valaient
          moins qu'une seule, partout la même. */}
    </div>
  );
}
