import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { VoletSections, EnteteVolet, type SectionVolet } from "@/components/VoletSections";
import { CarteFx } from "@/components/astuces/CarteFx";
import { VoletAnges, VoletMaitrise } from "@/components/mecaniques/SectionsBuild";
import { Fashion } from "@/components/mecaniques/SectionsFashion";
import {
  Ailleurs, Amelioration, Artefact, Eveil, FAMILLES, Gemmes, Percage, Rarete, Runes, Sertissage,
} from "@/components/mecaniques/SectionsObjets";
import { Panoplies } from "@/components/mecaniques/SectionsPanoplies";
import {
  cartesDePercage, chiffresAnges, chiffresMaitrise, joyauxDeCostume, mantras, nombreDeGemmes,
  nombreDeGemmesMenteuses, runes, setsDeFashion,
} from "@/components/mecaniques/releves";
import { paliersDeGemme, panopliesNegatives } from "@/components/mecaniques/sources";
import { ICONE_ELEMENT } from "@/lib/assetsJeu";
import { RARETES, reglagesDeSlot } from "@/lib/specsFlyff";

/**
 * LA PLANCHE DES MÉCANIQUES — à quoi ressemble, EN JEU, ce que tu règles ici, et
 * ce que le jeu ne t'annonce pas.
 *
 * Le problème que ça résout au départ : l'AirBuilder et les commandes sur mesure
 * parlent en abrégé — « R1 », « Fulgur 10 % », « ★★ », « Rune Yggdrasil ». Ces
 * mots n'apprennent rien à qui ne les connaît pas déjà, et ils s'apprennent
 * justement en voyant l'objet. Toutes les images de cette page sortent du client :
 * ce sont exactement les pierres, parchemins et cartes de ton inventaire.
 *
 * ┌──────────── LA PASSE V3 : LE CONTENU RESTE, LA FORME CHANGE ────────────┐
 * │ Cette page était la plus lourde du site — dix mille mots servis, vingt   │
 * │ fois le catalogue d'objets — et jugée la meilleure. Les deux vont         │
 * │ ensemble : ce qu'elle disait était juste, elle le disait en paragraphes.  │
 * │                                                                          │
 * │ Ce qui a changé, volet par volet : les taux d'amélioration sont devenus   │
 * │ DEUX ESCALIERS (celui du client, celui des parchemins), les huit          │
 * │ logements de gemme un SCHÉMA de losanges doublé d'une rangée de paliers,  │
 * │ les 59 cartes de perçage une GRILLE D'ICÔNES qui dit enfin ce que chaque  │
 * │ famille donne, et chaque case mène à la fiche de son objet.               │
 * │                                                                          │
 * │ DEUX VOLETS ONT BOUGÉ. « Sertissage » et « Les plafonds cachés »          │
 * │ montraient la même rangée de losanges à deux endroits : le compte de      │
 * │ logements est maintenant dans un seul, et l'autre est devenu              │
 * │ « Amélioration » — les taux, les parchemins, l'échelle. Un volet est      │
 * │ ARRIVÉ : les panoplies à ligne négative, le fait le plus invisible de la  │
 * │ page.                                                                    │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ┌──────────── POURQUOI LE POIDS EST LA SOMME DES VOLETS ────────────┐
 * │ `VoletSections` est un composant CLIENT : le contenu des volets part │
 * │ en entier dans le paquet RSC, ouvert ou pas. Le poids de la page est │
 * │ donc la SOMME de ses volets, et chaque `style={{…}}` s'y sérialise   │
 * │ propriété par propriété. D'où le choix, partout où c'est possible,   │
 * │ d'une classe CSS plutôt qu'un objet de style — et de `Paliers`, en   │
 * │ CSS pur, là où `Emplacements` aurait posé quarante images pour un    │
 * │ tableau secondaire.                                                 │
 * └────────────────────────────────────────────────────────────────────┘
 *
 * IL N'Y A PLUS DE PASTILLE « À CONFIRMER EN JEU », et c'est voulu. Elle servait
 * à publier un demi-fait en s'en dédouanant. La consigne est l'inverse : un
 * renseignement incomplet ne s'affiche plus du tout, sa réserve part avec lui.
 * Reste la seule exception qui vaille — une mise en garde contre une erreur
 * coûteuse, utile même incomplète (« on ne retire que la dernière gemme posée »).
 *
 * COMPOSANT SERVEUR, VOLONTAIREMENT : les comptes se lisent dans
 * `public/wiki/objets-fiches.json` (2,8 Mo) et `public/wiki/bonus-sources.json`
 * (512 Ko). Un `"use client"` ici enverrait les relevés entiers au navigateur, ou
 * obligerait à recopier les chiffres à la main — et un chiffre recopié devient
 * faux au prochain versement du client. Le halo des cartes passe donc par
 * `CarteFx`, seule chose cliente de la page.
 */
export const metadata: Metadata = {
  title: "Les mécaniques d'AirFlyff — Vanguard",
  description:
    "Rareté, artefact, perçage, éveil, sertissage, runes, costumes, panoplies : ce que chaque mot veut dire, avec les images du jeu — et les plafonds que le jeu n'annonce pas.",
};

export default function MecaniquesPage() {
  const arme = reglagesDeSlot("weapon", { artefact: true });
  const cartes = cartesDePercage();
  const nRunes = runes().total;
  const nMantras = mantras().total;
  const nGemmes = nombreDeGemmes();
  const menteuses = nombreDeGemmesMenteuses();
  const joyauxCostume = joyauxDeCostume();
  const setsCostume = setsDeFashion();
  const slots = (arme.sertissage?.diamants ?? 0) + (arme.sertissage?.holo ?? 0);
  const paliers = paliersDeGemme();
  const negatives = panopliesNegatives();
  // Les deux mécaniques arrivées de /crafts. Les comptes se lisent côté serveur
  // pour que le rail ne change pas de forme quand le relevé arrive au navigateur.
  const maitrise = chiffresMaitrise();
  const anges = chiffresAnges();

  const sections: SectionVolet[] = [
    {
      clef: "gemmes", titre: "Les gemmes mentent", icon: "alert", compte: nGemmes,
      sous: `${menteuses} noms sur ${nGemmes} donnent l'effet d'une autre`,
      contenu: <Gemmes />,
    },
    {
      clef: "sertissage", titre: "Sertissage", icon: "gem", compte: slots,
      sous: `${slots} logements sur une arme Artefact, pas ${arme.sertissage?.diamants}`,
      contenu: <Sertissage />,
    },
    {
      clef: "percage", titre: "Perçage", sous: "ce que chaque carte donne, palier par palier",
      icon: "target", compte: cartes.total,
      contenu: <Percage />,
    },
    {
      clef: "amelioration", titre: "Amélioration", icon: "upgrade", compte: null,
      sous: `De +1 à +${reglagesDeSlot("jewel").upMax}, et le taux qui s'effondre`,
      contenu: <Amelioration />,
    },
    {
      clef: "artefact", titre: "Artefact & ascension", sous: "au-delà de +10, et les plans par arme",
      icon: "sparkles", compte: FAMILLES.length,
      contenu: <Artefact />,
    },
    {
      clef: "rarete", titre: "Rareté", sous: "les paliers d'une arme, et son tirage",
      icon: "stars", compte: RARETES.length,
      contenu: <Rarete />,
    },
    {
      clef: "eveil", titre: "Éveil, scroll, élément", sous: "R1, R2 et les cinq éléments", icon: "awaken",
      // TROIS et non deux : le volet ouvre sur R1, R2 ET le scroll de stat, plus
      // un élément par ligne. Le compte du rail doit être celui des icônes qu'on
      // trouve derrière — un badge à 7 sous une grille de 8 se lit comme un
      // classement coupé.
      compte: 3 + Object.keys(ICONE_ELEMENT).length,
      contenu: <Eveil />,
    },
    // Le costume vient JUSTE APRÈS ce qui se pose sur une arme : c'est le même
    // geste — poser une pierre sur une pièce — avec d'autres règles, et on ne
    // comprend le piège des gemmes de costume qu'en ayant les diamants d'arme
    // encore en tête.
    {
      clef: "fashion", titre: "Costumes & gemmes de costume", icon: "shirt",
      compte: joyauxCostume.length,
      // Pas « N apparences » ici : le compte de dessins vaut pour les deux
      // genres et se lirait comme N looks differents, alors que le fait est
      // l'inverse — les sets se ressemblent.
      sous: `${setsCostume.sets.length} sets d'apparence identique, ${joyauxCostume.length} joyaux`,
      contenu: <Fashion />,
    },
    // LES PANOPLIES ARRIVENT ICI, et pas sur /objets : le catalogue est
    // propriétaire d'une PIÈCE nommée, pas de la mécanique qui la fait payer.
    // Une ligne négative de panoplie est une mécanique de build, au même titre
    // qu'un plafond de sertissage.
    {
      clef: "panoplies", titre: "Panoplies", icon: "alert", compte: negatives.touchees,
      sous: `${negatives.touchees} des ${negatives.total} retirent une statistique`,
      contenu: <Panoplies />,
    },
    {
      clef: "runes", titre: "Runes & mantras", sous: "celle de l'arme n'est pas celle de la tenue",
      icon: "rune", compte: nRunes + nMantras,
      contenu: <Runes />,
    },
    /* ── Les deux mécaniques arrivées de /crafts ────────────────────────────
       Elles y étaient rangées avec les collections. On ne DÉCROCHE pas une
       maîtrise d'arme et on ne collectionne pas la poudre féerique : on les
       MONTE sur la pièce qu'on compose, comme un perçage ou un éveil. Elles
       ferment donc le rail, après ce qui se pose sur la pièce elle-même. */
    {
      clef: "maitrise", titre: "Maîtrise d'arme", icon: "target",
      compte: maitrise?.armes ?? null,
      sous: maitrise
        ? `Ce que le niveau ${maitrise.niveauMax} demande, en monstres`
        : "Ce que le niveau 100 demande, en monstres",
      contenu: <VoletMaitrise />,
    },
    {
      clef: "anges", titre: "Anges & poudre féerique", icon: "fairy",
      compte: anges?.montables ?? null,
      // « du niveau X au Y » se lisait comme un gabarit qu'on aurait oublié de
      // remplir. Le rail dit ce que le volet CALCULE, avec le seul chiffre qu'il
      // tient du relevé : le nombre de niveaux.
      sous: anges
        ? `Combien de ${anges.poudre}, sur ${anges.niveaux} niveaux`
        : "Combien de poudre féerique, niveau par niveau",
      contenu: <VoletAnges />,
    },
  ];

  return (
    <div style={{ padding: "24px 32px 56px", maxWidth: 1300, margin: "0 auto" }}>
      {/* Un etal de marche : c'est la ou on achete les pierres, et le tiers bas de
          l'image — logo de l'editeur et barre de chargement — est recadre par
          .vg-pagehead-art. */}
      <PageHeader
        art="/jeu/chargement/maploading_market.webp"
        icon="gem"
        title="Les mécaniques, en images et en chiffres"
        subtitle="Ce que « R1 », « Fulgur 10 % » ou « ★★ » veulent dire — et les plafonds que le jeu ne t'annonce pas."
      />

      {/* Le halo des cartes, sans rendre la page cliente (cf. CarteFx). */}
      <CarteFx>
        <VoletSections
          sections={sections}
          defaut="gemmes"
          entete={
            <EnteteVolet
              icon="alert"
              titre={`${menteuses} des ${nGemmes} gemmes ultimes mentent`}
              marque={{ texte: "À lire avant de sertir", couleur: "var(--red)" }}
              sous={
                <>
                  Tu veux des <b>PV</b>, prends celle « de maîtrise » ; de la <b>Force</b>, celle
                  « de puissance » ; de l&apos;<b>Endurance</b>, celle « de force ». La cause est
                  établie : le client range ses neuf statistiques dans un ordre que les noms de
                  gemmes ne suivent plus. Table complète ci-dessous.
                  {paliers.total > 0 && <> Et il donne <b>{paliers.total} paliers</b> de sertissage
                    là où son en-tête n&apos;en numérote que {paliers.nommes}.</>}
                </>
              }
            />
          }
        />
      </CarteFx>

      {/* Un sujet, une page : les quatre sujets qui vivaient ici et n'y
          appartenaient pas sont maintenant quatre portes. */}
      <Ailleurs />
    </div>
  );
}
