import { Icon, type IconName } from "@/components/Icon";
import { CARTE, DEROULE, type Bilan } from "./modele";

/**
 * COMMENT ÇA SE PASSE — sans avoir joué le mode une seule fois.
 *
 * Personne, chez nous, n'avait écrit la mécanique de la Protection de l'Oasis :
 * le site en montrait la liste des paliers et rien d'autre, ce qui laissait
 * croire à un couloir de monstres. Or les seize chaînes d'interface du client la
 * racontent en entier — préparation, compte à rebours, minuteur par vague,
 * compteur de monstres restants, prime annoncée à chaque vague, classement entre
 * joueurs, et une dernière vague.
 *
 * On affiche le TEXTE BRUT du client à côté de ce qu'on en déduit. C'est
 * volontaire : le lecteur doit pouvoir juger si la déduction tient, et il
 * reconnaîtra les phrases à l'écran quand il y sera.
 */
export function Deroule({ b }: { b: Bilan }) {
  return (
    <div>
      {/* CE PARAGRAPHE D'OUVERTURE EST PARTI EN ENTIER, et rien de ce qu'il portait
          n'est perdu :
           · les deux noms (le mode, la carte) sont maintenant dans l'en-tête du bloc,
             au-dessus, où on les lit AVANT d'ouvrir ce panneau ;
           · « il y en a 52 » est le compte affiché à côté du titre de la section ;
           · « ne le confonds pas avec la Tour Oubliée » était déjà dit deux fois sur
             le même écran ;
           · « notre relevé l'appelait Tour sans fin » est de la COMPTABILITÉ DU SITE :
             ça corrige notre propre ancien libellé, que plus personne ne voit. Un
             joueur ne peut rien en faire. Le fait de jeu — il y a une dernière vague —
             est porté par la chaîne nº 14 de la liste juste en dessous, qui le dit
             avec les mots du client. */}
      <SousTitre icon="clock" apres={`${DEROULE.length} des 16 chaînes du mode · ${b.vagues} vagues`}>Le tour, message par message</SousTitre>
      <div style={{ display: "grid", gap: 8, marginBottom: 20 }}>
        {DEROULE.map((d, i) => (
          <div key={d.id} className="fx-card" style={{ display: "flex", gap: 12, background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "11px 13px" }}>
            <span className="font-heading" style={{ width: 24, flexShrink: 0, textAlign: "center", fontWeight: 700, color: "var(--orange)", fontVariantNumeric: "tabular-nums" }}>{i + 1}</span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 12.5, color: "var(--gold)", fontFamily: "ui-monospace, monospace", lineHeight: 1.5 }}>{d.texte}</span>
              <span style={{ display: "block", fontSize: 12.5, color: "var(--text-muted)", marginTop: 4, lineHeight: 1.55 }}>{d.ceQueCaDit}</span>
            </span>
          </div>
        ))}
      </div>
      {/* LE DÉCOMPTE DES SEIZE CHAÎNES EST PARTI. « Quatre sont des étiquettes de
          fenêtre, deux n'ont pas de texte » est de la comptabilité de fouille : ça
          décrit notre relevé, pas le jeu. Et « on ne sait pas ce qu'elles disent »
          est un constat d'ignorance pur — la règle veut qu'un renseignement
          incomplet disparaisse au lieu de s'excuser. Le rapport {DEROULE.length}/16
          reste affiché à côté du titre, ce qui suffit à dire que la liste n'est pas
          exhaustive. Seule la clef de lecture des %u / %d / %s reste : sans elle, on
          croit que le jeu affiche vraiment « Vague nº %u ». */}
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 22, lineHeight: 1.6 }}>
        <code>%u</code>, <code>%d</code>, <code>%s</code> : des trous que le jeu remplit en cours de
        partie — un numéro, une quantité, un nom d&apos;objet.
      </div>

      <SousTitre icon="map" apres="monde nº 8">L&apos;arène, telle que les fichiers de carte la décrivent</SousTitre>
      <div style={{ display: "grid", gap: 8 }}>
        {CARTE.map((c) => (
          <div key={c.quoi} style={{ display: "flex", gap: 12, alignItems: "baseline", flexWrap: "wrap", background: "var(--bg-3)", borderRadius: 10, padding: "10px 12px" }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)", minWidth: 168 }}>{c.quoi}</span>
            <span className="font-heading" style={{ fontSize: 13, fontWeight: 700, color: "var(--orange)" }}>{c.valeur}</span>
            <span style={{ fontSize: 11.5, color: "var(--text-muted)", flex: "1 1 240px", minWidth: 0 }}>{c.precision}</span>
          </div>
        ))}
      </div>
      {/* La déduction reste — c'est elle qui explique pourquoi le tableau des vagues
          n'a pas la même solidité que le reste du wiki. Ce qui part, c'est sa
          reformulation : « aucune ligne de la carte ne dit quel monstre arrive » et
          « il faut le lire avec les réserves » répétaient la ligne du dessus et le
          titre de la section voisine. */}
      <div style={{ marginTop: 12, background: "rgba(255,140,26,0.06)", border: "1px solid var(--orange-dark)", borderRadius: 10, padding: 13, fontSize: 12.5, lineHeight: 1.6 }}>
        <Icon name="info" size={13} style={{ marginRight: 6, color: "var(--orange)" }} />
        Une carte vide, ça veut dire quelque chose : <b>les vagues sont pilotées par le serveur</b>,
        donc leur tableau vient d&apos;un relevé maison.
      </div>
    </div>
  );
}

/** Le sous-titre des fiches de donjon, repris tel quel pour ne pas inventer une seconde forme. */
function SousTitre({ icon, children, apres }: { icon: IconName; children: React.ReactNode; apres?: string }) {
  return (
    <div className="font-heading" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.1, color: "var(--orange)", margin: "0 0 10px", display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
      <Icon name={icon} size={13} />{children}
      {apres && <span style={{ fontSize: 11.5, letterSpacing: 0, textTransform: "none", color: "var(--text-muted)", fontWeight: 400 }}>{apres}</span>}
    </div>
  );
}
