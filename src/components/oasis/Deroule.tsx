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
      <p style={{ fontSize: 13, lineHeight: 1.65, marginBottom: 16, color: "var(--text-muted)" }}>
        Le jeu appelle ce mode <b style={{ color: "var(--text)" }}>Protection de l&apos;Oasis</b> et la carte
        où il se joue <b style={{ color: "var(--text)" }}>Tour Infernale</b>. Notre relevé, lui, l&apos;appelait
        « Tour sans fin » — un nom qui n&apos;existe nulle part dans le jeu, et qui se trompe sur le fond :
        le client a une phrase pour dire <b style={{ color: "var(--gold)" }}>« vous venez de terminer la
        dernière vague »</b>. Il y en a {b.vagues}, et après, plus rien. Ne le confonds pas non plus avec
        la <b style={{ color: "var(--text)" }}>Tour Oubliée</b>, qui est un donjon à cinq étages, ni avec
        l&apos;objet du même nom.
      </p>

      <SousTitre icon="clock" apres={`${DEROULE.length} des 16 chaînes du mode`}>Le tour, message par message</SousTitre>
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
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 22, lineHeight: 1.6 }}>
        Les <code>%u</code>, <code>%d</code> et <code>%s</code> sont des trous que le jeu remplit en
        cours de partie : un numéro de vague, une quantité, un nom d&apos;objet. On les laisse tels
        quels plutôt que d&apos;inventer les valeurs. Les seize chaînes du mode ne se valent pas :
        {" "}{DEROULE.length} racontent le déroulé, quatre ne sont que des étiquettes de fenêtre
        (« Vague », « Temps », « Infos. » et le nom du mode), et les deux dernières n&apos;ont pas de
        texte dans notre relevé — on ne sait pas ce qu&apos;elles disent.
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
      <div style={{ marginTop: 12, background: "rgba(255,140,26,0.06)", border: "1px solid var(--orange-dark)", borderRadius: 10, padding: 13, fontSize: 12.5, lineHeight: 1.6 }}>
        <Icon name="info" size={13} style={{ marginRight: 6, color: "var(--orange)" }} />
        Une arène vide, ça veut dire quelque chose : <b>les vagues sont pilotées par le serveur</b>.
        Aucune ligne de la carte ne dit quel monstre arrive ni quand. C&apos;est pour ça que le tableau
        des vagues vient d&apos;un relevé maison et pas des fichiers du jeu — et c&apos;est aussi pour
        ça qu&apos;il faut le lire avec les réserves qui vont avec.
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
