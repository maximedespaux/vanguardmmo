import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { VoletSections, EnteteVolet, type SectionVolet } from "@/components/VoletSections";
import { CarteFx } from "@/components/astuces/CarteFx";
import { StyleMecaniques } from "@/components/mecaniques/Blocs";
import { VoletAnges, VoletMaitrise } from "@/components/mecaniques/SectionsBuild";
import { Fashion } from "@/components/mecaniques/SectionsFashion";
import {
  Ailleurs, Artefact, Eveil, FAMILLES, Gemmes, Percage, Plafonds, Rarete, Runes, Sertissage,
} from "@/components/mecaniques/SectionsObjets";
import {
  cartesDePercage, chiffresAnges, chiffresMaitrise, joyauxDeCostume, nombreDeGemmes,
  nombreDeGemmesMenteuses, runes, setsDeFashion,
} from "@/components/mecaniques/releves";
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
 * ┌──────────── UN SUJET, UNE PAGE — ce qui a quitté cette planche ────────────┐
 * │ Elle portait treize volets ; quatre ne parlaient pas d'une pièce            │
 * │ d'équipement : l'arène, les recettes éteintes, le barème de la GvG, la taxe │
 * │ des Chambres Secrètes. Les recettes éteintes se relisaient MOT POUR MOT sur │
 * │ /crafts — c'est exactement le doublon qu'on nous demande de supprimer.      │
 * │ Les quatre sont devenus quatre portes (`<Ailleurs />`), et le développement  │
 * │ retiré est signalé au fil principal : c'est au propriétaire de la page      │
 * │ d'accueillir ce qui lui revient.                                           │
 * │                                                                            │
 * │ NEUF VOLETS RESTENT, et ils ont tous le même sujet : ce que les fichiers du │
 * │ jeu disent d'une pièce d'équipement.                                       │
 * └────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌──────────── POURQUOI LA PAGE PESAIT 900 Ko, ET CE QUI L'ALLÈGE ────────────┐
 * │ `VoletSections` est un composant CLIENT : le contenu des volets part en     │
 * │ entier dans le paquet RSC, ouvert ou pas. Le poids de la page est donc la   │
 * │ SOMME de ses volets, et chaque `style={{…}}` s'y sérialise propriété par    │
 * │ propriété. D'où les trois leviers, dans cet ordre d'efficacité :            │
 * │   1. quatre volets partis chez leur propriétaire ;                          │
 * │   2. les demi-faits et leurs réserves retirés ;                             │
 * │   3. `Case`, `Chip`, `Groupe` passés en classes CSS (49 Ko de styles        │
 * │      répétés à l'identique, et pas un fait perdu).                          │
 * └────────────────────────────────────────────────────────────────────────────┘
 *
 * IL N'Y A PLUS DE PASTILLE « À CONFIRMER EN JEU », et c'est voulu. Elle servait
 * à publier un demi-fait en s'en dédouanant. La consigne est l'inverse : un
 * renseignement incomplet ne s'affiche plus du tout, sa réserve part avec lui.
 * Reste la seule exception qui vaille — une mise en garde contre une erreur
 * coûteuse, utile même incomplète (« on ne retire que la dernière gemme posée »).
 *
 * COMPOSANT SERVEUR, VOLONTAIREMENT : les comptes se lisent dans
 * `public/wiki/objets-fiches.json`, 3 Mo. Un `"use client"` ici enverrait le
 * relevé entier au navigateur, ou obligerait à recopier les chiffres à la main —
 * et un chiffre recopié devient faux au prochain versement du client. Le halo des
 * cartes passe donc par `CarteFx`, seule chose cliente de la page.
 */
export const metadata: Metadata = {
  title: "Les mécaniques d'AirFlyff — Vanguard",
  description:
    "Rareté, artefact, perçage, éveil, sertissage, runes, costumes : ce que chaque mot veut dire, avec les images du jeu — et les plafonds que le jeu n'annonce pas.",
};

export default function MecaniquesPage() {
  const arme = reglagesDeSlot("weapon", { artefact: true });
  const cartes = cartesDePercage();
  const nRunes = runes().total;
  const nGemmes = nombreDeGemmes();
  const menteuses = nombreDeGemmesMenteuses();
  const joyauxCostume = joyauxDeCostume();
  const setsCostume = setsDeFashion();
  const slots = (arme.sertissage?.diamants ?? 0) + (arme.sertissage?.holo ?? 0);
  // Les deux mécaniques arrivées de /crafts. Les comptes se lisent côté serveur
  // pour que le rail ne change pas de forme quand le relevé arrive au navigateur.
  const maitrise = chiffresMaitrise();
  const anges = chiffresAnges();

  const sections: SectionVolet[] = [
    {
      clef: "gemmes", titre: "Les gemmes mentent", icon: "alert", compte: nGemmes,
      sous: `${menteuses} noms sur ${nGemmes} ne donnent pas ce qu'ils annoncent`,
      contenu: <Gemmes />,
    },
    {
      clef: "rarete", titre: "Rareté", sous: "les paliers d'une arme, et son tirage", icon: "stars", compte: RARETES.length,
      contenu: <Rarete />,
    },
    {
      clef: "artefact", titre: "Artefact & ascension", sous: "au-delà de +10, et les plans par arme", icon: "sparkles", compte: FAMILLES.length,
      contenu: <Artefact />,
    },
    {
      clef: "plafonds", titre: "Les plafonds cachés", icon: "upgrade", compte: null,
      sous: `Le sertissage va à ${slots}, l'amélioration à +${reglagesDeSlot("jewel").upMax}`,
      contenu: <Plafonds />,
    },
    {
      clef: "percage", titre: "Perçage", sous: "cartes d'attaque et de défense", icon: "target", compte: cartes.total,
      contenu: <Percage />,
    },
    {
      clef: "eveil", titre: "Éveil, scroll, élément", sous: "R1, R2 et les cinq éléments", icon: "awaken",
      compte: 2 + Object.keys(ICONE_ELEMENT).length,
      contenu: <Eveil />,
    },
    {
      clef: "sertissage", titre: "Sertissage d'une arme", sous: "diamants et holographiques", icon: "gem",
      compte: slots,
      contenu: <Sertissage />,
    },
    // Le costume vient JUSTE APRÈS le sertissage d'arme, et pas en fin de rail :
    // c'est le même geste — poser une pierre sur une pièce — avec d'autres
    // règles, et on ne comprend le piège des gemmes de costume qu'en ayant les
    // diamants d'arme encore en tête.
    {
      clef: "fashion", titre: "Costumes & gemmes de costume", icon: "shirt",
      compte: joyauxCostume.length,
      // Pas « N apparences » ici : le compte de dessins vaut pour les deux
      // genres et se lirait comme N looks differents, alors que le fait est
      // l'inverse — les sets se ressemblent.
      sous: `${setsCostume.sets.length} sets d'apparence identique, ${joyauxCostume.length} joyaux — un par pièce`,
      contenu: <Fashion />,
    },
    {
      clef: "runes", titre: "Runes", sous: "celle de l'arme n'est pas celle de la tenue", icon: "rune", compte: nRunes,
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
      // tient du relevé : le nombre de niveaux. La casse du nom vient du client
      // et ne se retouche pas à la main (cf. collections/Anges.tsx).
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
                  connue et le tableau complet est dans <b>Les gemmes mentent</b>, ouvert
                  ci-dessous.
                </>
              }
            />
          }
        />
      </CarteFx>

      {/* Un sujet, une page : les quatre sujets qui vivaient ici et n'y
          appartenaient pas sont maintenant quatre portes. */}
      <Ailleurs />

      <StyleMecaniques />
    </div>
  );
}
