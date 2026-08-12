import { Icon, type IconName } from "@/components/Icon";
import { frappeVague, nb, type Bilan, type Vague } from "./modele";

/**
 * CE QU'ON NE SAIT PAS — et qui n'a pas à disparaître pour faire propre.
 *
 * Une page de wiki qui ne dit que ce qu'elle sait donne l'illusion d'être
 * complète, et le lecteur bâtit un plan sur du sable. Les quatre réserves
 * ci-dessous sont donc affichées au même rang que le reste : le multiplicateur
 * dont on ignore la cible, la provenance du relevé, le rattrapage de quatre
 * monstres, et le butin ordinaire qui n'existe dans aucun fichier.
 */
export function Reserves({ vagues, b }: { vagues: Vague[]; b: Bilan }) {
  /**
   * L'HYPOTHÈSE SUR `atkx`, CHIFFRÉE PLUTÔT QU'AFFIRMÉE.
   *
   * Le multiplicateur ne suit pas la progression : ×3 à la vague 1, ×0,1 à la 52,
   * et jusqu'à ×60 en cours de route. Ce n'est donc pas un curseur de difficulté.
   * En revanche, multiplié par la frappe du monstre, il RESSERRE : les produits
   * tiennent dans un rapport de 1 à 22 quand la frappe brute va de 1 à 990, et
   * neuf d'entre eux tombent pile sur un multiple de 10 000. Tout est calculé ici,
   * à chaque rendu : si les données bougent, l'argument se corrige ou s'écroule de
   * lui-même, mais il ne mentira pas.
   *
   * Deux vagues sont écartées du calcul : leurs monstres frappent à 1 (le Chocobus
   * et la Statue d'Akin, qui ne sont pas là pour taper). Les garder ferait
   * exploser les rapports sans rien apprendre.
   */
  const produit = (v: Vague) => Math.round(frappeVague(v) * v.atkx);
  const utiles = vagues.filter((v) => frappeVague(v) > 1);
  const rapport = (xs: number[]) => (xs.length ? Math.round(Math.max(...xs) / Math.min(...xs)) : 0);
  const produits = utiles.map(produit);
  const frappes = utiles.map(frappeVague);
  /** Les vagues où le produit tombe pile sur un chiffre rond : l'indice le plus parlant. */
  const ronds = utiles.filter((v) => produit(v) >= 10000 && produit(v) % 10000 === 0).map((v) => v.n);

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <Reserve icon="alert" tone="var(--red)" titre="Le multiplicateur « atkx » : on ne sait pas ce qu'il multiplie">
        <p>
          Il ne croît pas avec la vague — ×3 à la première, ×0,1 à la dernière, et jusqu&apos;à ×60
          au milieu. Ce n&apos;est donc pas un curseur de difficulté.
        </p>
        <p>
          Notre hypothèse : il corrige les dégâts du monstre. Deux indices, tous deux calculés sur
          les {utiles.length} vagues dont on connaît la frappe. Le premier : le produit
          {" "}<code>frappe × atkx</code> s&apos;étale
          de <span style={{ fontVariantNumeric: "tabular-nums" }}>{nb(Math.min(...produits))} à {nb(Math.max(...produits))}</span>,
          soit un rapport de <b>1 à {nb(rapport(produits))}</b> — quand la frappe brute, elle, s&apos;étale
          de <span style={{ fontVariantNumeric: "tabular-nums" }}>{nb(Math.min(...frappes))} à {nb(Math.max(...frappes))}</span>,
          un rapport de <b>1 à {nb(rapport(frappes))}</b>. Le multiplicateur ramène donc tout le tour
          dans une même fourchette de dégâts.
          {ronds.length > 2 && <> Le second : ce produit tombe pile sur un multiple de 10 000 sur
          {" "}{ronds.length} vagues — dont les {ronds.slice(-4).join(", ")}, toutes au même chiffre rond.
          Quatre fois le même résultat de suite, ça se règle, ça ne s&apos;obtient pas par hasard.</>}
        </p>
        <p style={{ color: "var(--red)" }}>
          Ça reste une hypothèse : personne ne l&apos;a vérifiée en jeu. Ne dimensionne pas ta
          résistance là-dessus — prends la frappe brute du tableau comme plancher, pas comme plafond.
        </p>
      </Reserve>

      <Reserve icon="camera" tone="var(--orange)" titre="Le tableau des vagues vient de captures d'écran, pas des fichiers du jeu">
        <p>
          La carte de la Tour Infernale est une arène vide : ni monstre posé, ni zone de
          regénération, ni script de vague. Tout est calculé par le serveur, donc les 52 vagues,
          leurs quantités, leurs multiplicateurs et leurs primes viennent d&apos;un relevé fait à la
          main sur des captures d&apos;écran.
        </p>
        <p>
          Ce qui vient du client, et qu&apos;on peut vérifier : le nom français de chaque monstre, son
          niveau, ses points de vie, ses dégâts. Le reste est un témoignage — fiable, mais un
          témoignage.
        </p>
      </Reserve>

      <Reserve icon="search" tone="var(--purple)" titre={`Quatre monstres déclarés introuvables l'étaient à tort — vagues ${b.vaguesRetrouvees.join(", ")}`}>
        <p>
          Le premier passage de la fouille annonçait quatre monstres absents du client
          (<code>MI_HATSALRA04</code>, <code>MI_BERKEN04</code>, <code>MI_FRINKER04</code>,
          {" "}<code>MI_CROHELL04</code>) et concluait à trois vagues incertaines. En réalité ils y
          sont : la table du client les écrit <code>MI_Hatsalra04</code>, en casse mixte, et
          l&apos;appariement respectait la casse. Ce sont
          {" "}<b style={{ color: "var(--text)" }}>{b.nomsRetrouves.join(", ")}</b> — les versions géantes de
          monstres de plaine, de niveau 113 à 120, autour des deux millions de points de vie.
        </p>
        <p>
          Le voisinage confirme la trouvaille au lieu de la contredire : les vagues 32 à 34, 36 et 37
          tournent toutes autour du million de PV ou moins, quand la vague 31 en demande 38 millions.
          Un creux de six vagues au tiers du parcours, c&apos;est exactement la place de quatre
          « Géants ». À confirmer en jeu quand même : c&apos;est une déduction, pas une capture
          d&apos;écran.
        </p>
      </Reserve>

      <Reserve icon="gift" tone="var(--green)" titre="Deux primes, ça ne veut pas dire que rien d'autre ne tombe">
        <p>
          Le client annonce une prime par vague, et il n&apos;y en a que deux sortes sur 52 vagues.
          Mais le butin ORDINAIRE des monstres n&apos;existe dans aucun fichier du client : c&apos;est le
          serveur qui le calcule. Une absence de source ne dit jamais « ça ne tombe pas ».
        </p>
        <p>
          Si tu vois tomber autre chose que des emblèmes, ce n&apos;est pas une anomalie : c&apos;est
          une information qui nous manque, et elle a sa place ici.
        </p>
      </Reserve>
    </div>
  );
}

function Reserve({ icon, tone, titre, children }: { icon: IconName; tone: string; titre: string; children: React.ReactNode }) {
  return (
    <div className="fx-card" style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderLeft: `3px solid ${tone}`, borderRadius: 12, padding: "13px 15px" }}>
      <div className="font-heading" style={{ fontSize: 13.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
        <Icon name={icon} size={14} style={{ color: tone, flexShrink: 0 }} />{titre}
      </div>
      <div style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.65, display: "grid", gap: 7 }}>{children}</div>
    </div>
  );
}
