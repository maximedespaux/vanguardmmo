import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { VoletSections, EnteteVolet, type SectionVolet } from "@/components/VoletSections";
import { CarteFx } from "@/components/astuces/CarteFx";
import { StyleMecaniques } from "@/components/mecaniques/Blocs";
import {
  Artefact, Eveil, FAMILLES, Gemmes, Percage, Plafonds, Rarete, Runes, Sertissage,
} from "@/components/mecaniques/SectionsObjets";
import { Arene, Farm, Gvg, Taxe } from "@/components/mecaniques/SectionsTerrain";
import {
  ARENE_ARMES, GVG_BAREME, cartesDePercage, nombreDeGemmes, nombreDeGemmesMenteuses, runes,
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
 * CE QUE CETTE PAGE A ABSORBÉ. « Astuces de guilde » était une page à part de 630
 * lignes qui disait autre chose : un nom de gemme qui ment, un plafond de
 * sertissage que personne n'annonce, des recettes éteintes pour lesquelles on
 * farme dans le vide, une seconde table d'équilibrage qui fait qu'un build
 * d'arène n'est pas un build de donjon. Deux pages pour un seul sujet : ce que les
 * fichiers du jeu disent d'une pièce d'équipement. Elles n'en font plus qu'une, et
 * /astuces-guilde redirige ici.
 *
 * Les faits sont rangés DANS la facette qu'ils concernent — le plafond de
 * sertissage avec le sertissage, l'échelle d'amélioration avec l'artefact — et pas
 * empilés à la fin. Quatre facettes restent sur le terrain plutôt que sur la
 * pièce (arène, crafts éteints, GvG, taxe) : voir l'en-tête de SectionsTerrain
 * pour pourquoi elles sont ici et à quelle condition elles déménageraient.
 *
 * CE QUI EST VÉRIFIÉ ET CE QUI NE L'EST PAS SE VOIT À L'ÉCRAN. La page mélange
 * deux sortes de vérités : ce qui se calcule sur le relevé du client (les comptes,
 * les tableaux, les infobulles citées) et ce qui a été LU dans le client sans
 * qu'on ait pu le rejouer en jeu (les coefficients d'arène, les recettes
 * éteintes). Les secondes portent une pastille « À confirmer en jeu ». Un fait
 * donné pour certain alors qu'il reste à confirmer coûte plus cher qu'un fait
 * absent : la distinction ne doit jamais disparaître au fil des retouches.
 *
 * COMPOSANT SERVEUR, VOLONTAIREMENT — et pas pour la même raison qu'avant. Ce
 * n'est plus une question d'accès (la page est publique, ces faits sont
 * extractibles du client par n'importe qui) mais de poids : les comptes se lisent
 * dans `public/wiki/objets-fiches.json`, 3 Mo. Un `"use client"` ici enverrait le
 * relevé entier au navigateur, ou obligerait à recopier les chiffres à la main —
 * et un chiffre recopié devient faux au prochain versement du client. Le halo des
 * cartes passe donc par `CarteFx`, qui est la seule chose cliente de la page.
 */
export const metadata: Metadata = {
  title: "Les mécaniques d'AirFlyff — Vanguard",
  description:
    "Rareté, artefact, perçage, éveil, sertissage, runes : ce que chaque mot veut dire, avec les images du jeu — et les plafonds que le jeu n'annonce pas.",
};

export default function MecaniquesPage() {
  const arme = reglagesDeSlot("weapon", { artefact: true });
  const cartes = cartesDePercage();
  const nRunes = runes().total;
  const nGemmes = nombreDeGemmes();
  const menteuses = nombreDeGemmesMenteuses();

  const sections: SectionVolet[] = [
    {
      clef: "gemmes", titre: "Les gemmes mentent", icon: "alert", compte: nGemmes,
      sous: `${menteuses} noms sur ${nGemmes} ne donnent pas ce qu'ils annoncent`,
      contenu: <Gemmes />,
    },
    {
      clef: "rarete", titre: "Rareté", sous: "les six paliers d'une arme", icon: "stars", compte: RARETES.length,
      contenu: <Rarete />,
    },
    {
      clef: "artefact", titre: "Artefact & ascension", sous: "au-delà de +10, et les plans par arme", icon: "sparkles", compte: FAMILLES.length,
      contenu: <Artefact />,
    },
    {
      clef: "plafonds", titre: "Les plafonds cachés", icon: "upgrade", compte: null,
      sous: `Le sertissage va à ${(arme.sertissage?.diamants ?? 0) + (arme.sertissage?.holo ?? 0)}, l'amélioration à +${reglagesDeSlot("jewel").upMax}`,
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
      clef: "sertissage", titre: "Sertissage & gemmes", sous: "diamants, holos, gemmes de costume", icon: "gem",
      compte: (arme.sertissage?.diamants ?? 0) + (arme.sertissage?.holo ?? 0),
      contenu: <Sertissage />,
    },
    {
      clef: "runes", titre: "Runes", sous: "celle de l'arme n'est pas celle de la tenue", icon: "rune", compte: nRunes,
      contenu: <Runes />,
    },
    {
      clef: "arene", titre: "En arène, tu n'es pas le même", sous: "Le serveur a une seconde table d'équilibrage", icon: "swords",
      compte: ARENE_ARMES.length,
      contenu: <Arene />,
    },
    {
      clef: "farm", titre: "Ce qu'on ne farme pas", sous: "Des recettes existent mais aucun PNJ ne les propose", icon: "ban", compte: null,
      contenu: <Farm />,
    },
    {
      clef: "gvg", titre: "La GvG se gagne aux points", sous: "Le barème exact, et ce qu'il impose", icon: "trophy",
      compte: GVG_BAREME.length,
      contenu: <Gvg />,
    },
    {
      clef: "taxe", titre: "La taxe ne se fixe qu'une fois", sous: "Chambres Secrètes : une décision sans retour", icon: "coins", compte: null,
      contenu: <Taxe />,
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
                  Le nom de la gemme et son effet réel ne correspondent plus : tu veux des
                  {" "}<b>PV</b>, prends celle « de maîtrise » ; de la <b>Force</b>, celle « de
                  puissance » ; de l&apos;<b>Endurance</b>, celle « de force ». Le tableau complet
                  est dans <b>Les gemmes mentent</b>, ouvert ci-dessous. Rien ici n&apos;est deviné :
                  tout sort des fichiers du client, que n&apos;importe qui peut ouvrir, et les
                  comptes de cette page se recalculent sur le relevé à chaque affichage.
                </>
              }
            />
          }
        />
      </CarteFx>

      <p className="mc-pied">
        Les comptes et les tableaux de cette page sont calculés sur le relevé du client, jamais
        estimés. Ce qui porte la mention <b>« À confirmer en jeu »</b> a été lu dans les fichiers
        d&apos;octobre 2025 sans avoir été rejoué : le serveur peut avoir été corrigé depuis, et un
        fichier ne dit pas si le PNJ est posé sur la carte. Si tu constates l&apos;inverse de ce qui
        est écrit là, dis-le — une astuce fausse coûte plus cher qu&apos;une astuce absente.
      </p>

      <StyleMecaniques />
    </div>
  );
}
