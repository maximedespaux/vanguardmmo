"use client";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { VoletSections, type SectionVolet } from "@/components/VoletSections";
import { ClassBouton } from "@/components/ClassLogo";
import { Icon } from "@/components/Icon";
import { useCardFx } from "@/components/VgFx";
import { CLASSES, findClass } from "@/data/classes";
import { Catalogue } from "@/components/competences/Catalogue";
import { Budget, HorsClasseSection, Paliers } from "@/components/competences/Sections";
import { SousTitre } from "@/components/competences/ui";
import { classeAffichee, fmt, nbHorsClasse, type Catalogue as Cat } from "@/components/competences/donnees";
import { BarresBudget, Chaine, Legendaires, PaliersDeLaClasse, TableLignee } from "@/components/classes/Lignee";
import { Echelles, HuitNomsDeuxEffets } from "@/components/classes/Echelles";
import { NB_NOMS_DE_CLASSE, emblemeDe, indexParClasse, norm, vueLignee } from "@/components/classes/vue";
import { LIGNEES, XP_COMPETENCE, ligneeDe } from "./donnees";

/**
 * CLASSES ET COMPÉTENCES — une seule page, un seul rail.
 *
 * Les deux pages étaient le même sujet coupé en deux. /classes montrait la
 * chaîne de promotion — six paliers, 46 emblèmes — sans une seule compétence ;
 * /competences listait les 197 compétences sans dire de quelle chaîne elles
 * tombaient. On ne pouvait répondre à « qu'est-ce que mon Baladin apprend, et
 * qu'est-ce que ça coûte ? » sans changer d'adresse au milieu.
 *
 * La fusion a fait apparaître ce que la séparation cachait : les deux pages
 * annonçaient des budgets DIFFÉRENTS pour la Sylphide et l'Arbalétrier, parce
 * que l'instantané de la chaîne comptait les cinq compétences d'arc que
 * `propSkill.txt` écrit deux fois. Les chiffres de cette page se recalculent
 * désormais depuis le relevé dédoublonné servi par `/api/competences` (voir
 * `components/classes/vue.ts`) ; l'instantané ne sert plus que de repli.
 *
 * Ce que la classe choisie en haut de page commande : la chaîne, son tableau de
 * paliers, ses deux compétences de palier, ses légendaires, ses barres de budget
 * — et le filtre du catalogue, pour qu'on atterrisse sur ses 34 compétences et
 * pas sur les 197.
 */

const NUM = { fontVariantNumeric: "tabular-nums" } as const;

export default function ClassesPage() {
  useCardFx();
  const [cle, setCle] = useState(LIGNEES[0].cle);
  const [cat, setCat] = useState<Cat | null>(null);
  const [erreur, setErreur] = useState(false);

  // Le relevé arrive par la route et non par un import : le fichier réduit fait
  // 200 Ko, il partirait dans le paquet JS de la page.
  useEffect(() => {
    let vivant = true;
    fetch("/api/competences")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: Cat) => { if (vivant) setCat(d); })
      .catch(() => { if (vivant) setErreur(true); });
    return () => { vivant = false; };
  }, []);

  const lignee = ligneeDe(cle) ?? LIGNEES[0];
  const info = findClass(lignee.cle);
  const index = useMemo(() => (cat ? indexParClasse(cat.entrees) : null), [cat]);
  const vue = useMemo(() => vueLignee(lignee, cat, index), [lignee, cat, index]);

  /** Combien de compétences porte un nom de classe. `null` tant que le relevé
   *  n'est pas là : la case de l'arbre retombe alors sur l'instantané. */
  const nbDe = useMemo(() => (nom: string) => (index ? index.get(norm(classeAffichee(nom)))?.length ?? 0 : null), [index]);

  // La clef de lignée du relevé est accentuée (« Envoûteur »), celle de la page
  // ne l'est pas (« Envouteur ») : on résout ici, une fois.
  const ligneeApi = useMemo(
    () => cat?.lignees.find((x) => norm(x.cle) === norm(cle))?.cle ?? "tous",
    [cat, cle],
  );

  // La table de coût vient du relevé quand il répond, de l'instantané sinon :
  // c'est la même table, mais on ne veut pas d'une section vide.
  const table = useMemo(
    () => cat?.xpCompetence ?? XP_COMPETENCE.map((x) => ({ niveau: x.niveau, xp: x.palier })),
    [cat],
  );

  const attente = <Attente erreur={erreur} />;

  const sections: SectionVolet[] = [
    {
      clef: "catalogue", titre: "Le catalogue", icon: "list", compte: cat?.entrees.length ?? null,
      sous: "Cherche par classe, par palier ou par nom",
      contenu: cat
        ? <Catalogue entrees={cat.entrees} lignees={cat.lignees} ligneeChoisie={ligneeApi} embleme={emblemeDe} />
        : attente,
    },
    {
      clef: "echelles", titre: "Les échelles", icon: "layers", compte: NB_NOMS_DE_CLASSE,
      sous: "Les paliers, l'arbre des promotions, les niveaux qui ouvrent",
      contenu: <Echelles choisi={cle} onChoix={setCle} nbDe={nbDe} />,
    },
    {
      clef: "lignee", titre: "Sa lignée", icon: "path", compte: vue.etapes.length,
      sous: `Ce que chaque palier apprend chez ${lignee.nom}`,
      contenu: <TableLignee vue={vue} />,
    },
    {
      clef: "paliers", titre: "Maître et Héros", icon: "medal",
      compte: cat ? cat.entrees.filter((e) => e.palier === "maitre" || e.palier === "heros").length : 16,
      sous: "Les 16 compétences où seul le niveau 5 compte",
      contenu: (
        <>
          <PaliersDeLaClasse vue={vue} />
          <div style={{ height: 14 }} />
          {cat ? <Paliers entrees={cat.entrees} /> : attente}
        </>
      ),
    },
    {
      clef: "legendaires", titre: "Ses légendaires", icon: "crown", compte: lignee.legendaires.length,
      sous: `Le bout de la chaîne, chez ${lignee.nom}`,
      contenu: <Legendaires lignee={lignee} />,
    },
    {
      clef: "cout", titre: "Ce que ça coûte", icon: "coins", compte: null,
      sous: "Le prix d'un niveau, et le budget d'une classe",
      contenu: (
        <>
          <SousTitre icon="gauge" apres={vue.lignee.nom}>Où partent tes points</SousTitre>
          <BarresBudget vue={vue} />
          {cat ? <Budget table={table} lignees={cat.lignees} /> : attente}
        </>
      ),
    },
    {
      clef: "huit", titre: "Huit noms, deux effets", icon: "eye", compte: LIGNEES.length,
      sous: "Les compétences de Héros, rangées par effet réel",
      contenu: <HuitNomsDeuxEffets onChoix={setCle} />,
    },
    {
      clef: "hors", titre: "Hors classe", icon: "users", compte: cat ? nbHorsClasse(cat.horsClasse) : null,
      sous: "Groupe, Souverain, couple",
      contenu: cat ? <HorsClasseSection h={cat.horsClasse} /> : attente,
    },
    /* IL Y AVAIT UN NEUVIÈME VOLET, « Ce qu'on ne sait pas ». Il est parti par la
       règle 2 : cinq encarts dont le sujet était l'incomplétude du relevé. Le seul
       qui changeait le geste — les dégâts du tableau ne sont pas ceux qu'on tape —
       a déménagé sur l'en-tête de la colonne Dégâts du catalogue, là où l'erreur se
       commet. Le détail du tri est dans Sections.tsx, à la place de la fonction. */
  ];

  return (
    <div style={{ padding: "24px 18px 60px", maxWidth: 1150, margin: "0 auto" }}>
      {/* Deux personnages en pleine attaque, trainees de coup comprises : une
          competence en train de partir, ce qui est exactement le sujet. */}
      {/* Le sous-titre annonçait en trente-cinq mots ce que le rail annonce déjà, volet
          par volet, avec ses comptes. Il ne garde que ce que le rail ne peut pas
          dire : combien de lignées, et d'où vient le relevé. */}
      {/* « du client d'octobre 2025 » et non « du client du jeu » : c'est la seule
          chose que le volet des réserves disait et que le rail ne dit pas — la DATE
          du relevé. Deux mots ici valent les quarante d'une ligne de source en bas
          d'un volet qu'il faut penser à ouvrir. */}
      <PageHeader art="/jeu/chargement/maploading_arena.webp" icon="graduation" title="Classes et compétences"
        subtitle={`Les ${LIGNEES.length} lignées d'AirFlyff, relevées dans le client d'octobre 2025.`} />

      <VoletSections
        defaut="catalogue"
        entete={
          <div className="glass-card fx-card" style={{ padding: "13px 15px", marginBottom: 14 }}>
            <ChiffresReleve cat={cat} />
            {/* Le choix de classe reprend le bouton du jeu, dans son propre etat
                « choisi » — c'est le repere visuel que les joueurs ont deja en tete. */}
            <div className="cl-choix">
              {LIGNEES.map((l) => {
                const on = l.cle === cle;
                const meta = CLASSES[l.cle];
                return (
                  <button key={l.cle} onClick={() => setCle(l.cle)} className="cl-carte fx-card" aria-pressed={on}
                    style={{ borderColor: on ? "var(--orange)" : "var(--border)", background: on ? "rgba(255,140,26,.09)" : "var(--bg-2)" }}>
                    <ClassBouton name={l.cle} etat={on ? "choisi" : "repos"} size={38} />
                    <span style={{ minWidth: 0, textAlign: "left" }}>
                      <b style={{ display: "block", fontSize: 12.5, color: on ? "var(--orange)" : "var(--text)" }}>{l.nom}</b>
                      <span style={{ display: "block", fontSize: 10, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px" }}>
                        {meta?.role === "tank" ? "Tank" : meta?.role === "support" ? "Soutien" : "Dégâts"} · via {l.etapes[1].nom}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 11, flexWrap: "wrap", margin: "12px 0 11px", paddingTop: 12, borderTop: "1px solid var(--border)" }}>
              {info?.embleme && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={info.embleme} alt="" width={40} height={40} style={{ objectFit: "contain", flexShrink: 0 }} />
              )}
              <div style={{ minWidth: 0, flex: "1 1 240px" }}>
                <div className="font-heading" style={{ fontSize: 17, fontWeight: 700 }}>
                  {lignee.nom} <span style={{ fontSize: 12.5, fontWeight: 400, color: "var(--text-muted)" }}>{info?.en}</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", ...NUM }}>
                  <b style={{ color: "var(--text)" }}>{vue.nb}</b> compétences ·{" "}
                  <b style={{ color: "var(--gold)" }}>{fmt(vue.points)}</b> points pour tout monter au maximum · code du jeu{" "}
                  <code style={{ fontSize: 11 }}>{lignee.jobCode}</code>
                  {!vue.releve && " · chiffres de l'instantané, le relevé n'a pas répondu"}
                </div>
              </div>
            </div>

            <Chaine vue={vue} />
          </div>
        }
        sections={sections}
      />

      <style>{`
        .cl-choix{display:grid;grid-template-columns:repeat(auto-fill,minmax(178px,1fr));gap:8px}
        .cl-carte{display:flex;align-items:center;gap:9px;padding:7px 9px;border-radius:11px;border:1px solid var(--border);cursor:pointer;font-family:inherit;color:var(--text);transition:border-color .15s,background .15s}
        .cl-carte:hover{border-color:var(--orange)}
        .cl-chaine{display:flex;flex-wrap:wrap;gap:3px;align-items:stretch}
        .cl-maille{display:flex;align-items:center;gap:3px}
        .cl-fleche{color:var(--text-muted);font-size:16px;padding:0 1px}
        .cl-marche{display:flex;flex-direction:column;align-items:center;gap:2px;width:104px;padding:8px 5px;border-radius:11px;background:var(--bg-2);border:1px solid var(--border)}
        .cl-deux{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px}
        /* L'arbre des promotions : cinq colonnes, et la case de Metier 1 s'etend
           sur les deux lignees qui en sortent. Le placement automatique de la
           grille suffit — la case suivante trouve seule la colonne 2 de la ligne
           d'apres, puisque la colonne 1 est deja occupee. */
        .cl-arbre{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:5px}
        .cl-case-btn{display:flex;align-items:center;gap:7px;padding:7px 8px;border-radius:9px;border:1px solid var(--border);cursor:pointer;font-family:inherit;color:var(--text);text-align:left;transition:border-color .15s,background .15s}
        .cl-case-btn:hover{border-color:var(--orange)}
        /* Le tableau de la lignee debordait la page sur telephone, MALGRE son
           enveloppe en overflow-x:auto. La cause n'est pas le tableau : les deux
           enfants de .vg-volet sont des elements de grille, et un element de
           grille garde min-width:auto — donc la colonne s'elargissait au
           min-content du tableau (410 px) au lieu de laisser l'enveloppe defiler.
           On ne peut pas le corriger dans VoletSections d'ici, alors on le pose
           tant que cette page est montee. */
        .vg-volet>div{min-width:0}
        .cl-lien{display:flex;align-items:center;gap:8px;flex-wrap:wrap;width:100%;text-align:left;padding:7px 10px;border-radius:9px;background:var(--bg-3);border:1px solid var(--border);color:var(--text);font-family:inherit;cursor:pointer;transition:border-color .15s}
        .cl-lien:hover{border-color:var(--orange)}
        /* Sous 560 px la chaine devient une colonne : six tuiles de 104 px et
           cinq fleches ne rentrent pas, et les rogner rendait les emblemes
           illisibles. */
        @media(max-width:560px){
          .cl-chaine{flex-direction:column}
          .cl-maille{width:100%}
          .cl-marche{flex:1;flex-direction:row;justify-content:flex-start;width:auto;text-align:left}
          .cl-fleche{transform:rotate(90deg)}
        }
      `}</style>
    </div>
  );
}

/**
 * Les quatre chiffres qui disent d'emblée de quoi on parle. Ils sont calculés
 * depuis les données reçues, jamais recopiés : le jour où le relevé change, la
 * page ne mentira pas.
 *
 * Dans la carte d'en-tête et non dans une carte à eux : une carte de plus, c'est
 * une hauteur d'écran de moins pour le contenu. Et pas dans la prop `right` de
 * PageHeader — essayé, mais quatre chiffres posés à côté du titre gardent leur
 * largeur minimale et poussaient la page à déborder sur téléphone, en écrasant
 * le titre dans une colonne de trois mots.
 */
function ChiffresReleve({ cat }: { cat: Cat | null }) {
  if (!cat) return null;
  const chiffres = [
    { valeur: fmt(cat.entrees.length), quoi: "compétences de joueur" },
    { valeur: fmt(cat.entrees.filter((e) => e.aPrerequis).length), quoi: "ont un prérequis" },
    { valeur: fmt(cat.entrees.reduce((s, e) => s + e.nivMax, 0)), quoi: "niveaux à monter en tout" },
    { valeur: fmt(cat.lignees.length), quoi: "lignées couvertes" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: "8px 14px",
      paddingBottom: 11, marginBottom: 11, borderBottom: "1px solid var(--border)" }}>
      {chiffres.map((c) => (
        <div key={c.quoi} style={{ minWidth: 0 }}>
          <div className="font-heading" style={{ fontSize: 19, fontWeight: 700, color: "var(--orange)", ...NUM }}>{c.valeur}</div>
          <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{c.quoi}</div>
        </div>
      ))}
    </div>
  );
}

/** Ce qu'une section montre tant que le relevé n'est pas arrivé. La section
 *  reste dans le rail : la faire disparaître ferait bouger la liste sous le
 *  curseur au moment où la réponse arrive. */
function Attente({ erreur }: { erreur: boolean }) {
  if (!erreur) return <div style={{ color: "var(--text-muted)", fontSize: 13, padding: "6px 2px" }}>Lecture du relevé…</div>;
  return (
    <div style={{ background: "color-mix(in srgb, var(--red) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--red) 34%, transparent)",
      borderRadius: 12, padding: "13px 15px", fontSize: 13, display: "flex", alignItems: "center", gap: 9 }}>
      <Icon name="alert" size={15} style={{ color: "var(--red)", flexShrink: 0 }} />
      Le relevé des compétences n&apos;a pas pu être lu. Recharge la page ; si ça persiste, dis-le sur Discord.
    </div>
  );
}
