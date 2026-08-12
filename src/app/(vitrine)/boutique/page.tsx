import { etatVisiteur } from "@/lib/vitrine";
import { EcranEconomie } from "@/components/EcranEconomie";

/**
 * LA BOUTIQUE — le coffre commun, et la commande sur mesure.
 *
 * La page est devenue un composant SERVEUR de trois lignes, pour une raison précise :
 * elle doit connaître l'état du visiteur (`etatVisiteur()` lit la session et la base) et
 * le passer à l'écran, qui est client. Un composant client ne peut pas interroger la
 * session côté serveur, et lui faire deviner ses droits depuis le navigateur serait à la
 * fois faux et contournable.
 *
 * ELLE NE REDIRIGE PLUS. C'est le mode vitrine : un visiteur voit le vrai stock et les
 * vrais prix — c'est ce qui donne envie de rejoindre — et ne peut rien commander. Le
 * refus n'est pas décoratif : /api/bank-request est gardée par apiGuild().
 */
export default async function BoutiquePage() {
  const etat = await etatVisiteur();
  return <EcranEconomie etat={etat} />;
}
