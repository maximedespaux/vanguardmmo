"use client";
import { Icon, type IconName } from "@/components/Icon";
import { Bulle } from "@/components/Bulle";
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
 * ┌───── DEUX CENTS MOTS DE MUR SONT DEVENUS UN FIL DE DIX JALONS ─────┐
 * │ Le panneau alignait dix cartes, chacune portant la chaîne BRUTE du  │
 * │ client puis sa glose. C'est deux cents mots pour raconter une        │
 * │ SÉQUENCE — et une séquence se dessine. Le fil la donne d'un regard : │
 * │ ce qui vient avant, ce qui se répète à chaque vague, ce qui finit.   │
 * │                                                                      │
 * │ LA PREUVE N'EST PAS PERDUE, ELLE EST DERRIÈRE LE JALON. Chaque jalon │
 * │ ouvre une bulle qui montre la chaîne du client mot pour mot, et sa   │
 * │ glose. C'est exactement l'emploi prévu de la brique : « une bulle    │
 * │ permet de RETIRER un paragraphe de la page tout en gardant son       │
 * │ contenu à portée de curseur ». Le lecteur doit pouvoir juger si la   │
 * │ déduction tient, et reconnaître la phrase à l'écran quand il y sera. │
 * │ Elle s'ouvre au SURVOL et au CLIC, donc aussi au doigt.              │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * LES DEUX PHASES SE CALCULENT, elles ne sont pas écrites : ce qui se joue une
 * fois par tour et ce qui se répète à chaque vague se séparent au jalon « Vagues
 * numérotées » et se rejoignent après « Prime ». Le jour où une chaîne s'ajoute au
 * relevé, elle tombe dans la bonne phase sans qu'on y touche.
 */
export function Deroule({ b }: { b: Bilan }) {
  return (
    <div>
      <SousTitre icon="clock" apres={`${DEROULE.length} des 16 chaînes du mode · ${b.vagues} vagues`}>Le tour, message par message</SousTitre>
      <FilDuTour vagues={b.vagues} />

      {/* LA CLEF DE LECTURE DES %u A SUIVI LES CHAÎNES DANS LES BULLES. Elle ne
          servait qu'à comprendre le texte brut du client ; le texte brut n'est plus à
          l'écran, donc l'expliquer à l'écran n'avait plus d'objet. Chaque bulle qui
          montre une chaîne à trou la porte désormais, et seulement celles-là — c'est
          calculé sur la chaîne, pas décidé à la main. */}

      <SousTitre icon="map" apres="monde nº 8">L&apos;arène, telle que les fichiers de carte la décrivent</SousTitre>
      <div style={{ display: "grid", gap: 8 }}>
        {CARTE.map((c) => (
          <div key={c.quoi} style={{ display: "flex", gap: 12, alignItems: "baseline", flexWrap: "wrap", background: "var(--bg-3)", borderRadius: 10, padding: "10px 12px" }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)", minWidth: 168 }}>{c.quoi}</span>
            {/* Une précision longue passe DERRIÈRE la valeur au lieu d'allonger la
                ligne ; les courtes restent à côté, où elles se lisent d'un coup. */}
            {c.enBulle && c.precision ? (
              <span className="font-heading" style={{ fontSize: 13, fontWeight: 700, color: "var(--orange)" }}>
                <Bulle largeur={280} quoi={<span style={{ color: "var(--text-muted)" }}>{c.precision}</span>}>
                  <span style={{ color: "var(--orange)" }}>{c.valeur}</span>
                </Bulle>
              </span>
            ) : (
              <>
                <span className="font-heading" style={{ fontSize: 13, fontWeight: 700, color: "var(--orange)" }}>{c.valeur}</span>
                <span style={{ fontSize: 11.5, color: "var(--text-muted)", flex: "1 1 240px", minWidth: 0 }}>{c.precision}</span>
              </>
            )}
          </div>
        ))}
      </div>
      {/* ┌──── CE CARTOUCHE ORANGE DISAIT LA CHOSE UNE TROISIÈME FOIS ────┐
          Il portait : « Une carte vide, ça veut dire quelque chose : les vagues sont
          pilotées par le serveur, donc leur tableau vient d'un relevé maison. »
          Les deux moitiés sont déjà servies, sur le MÊME écran :
           · le fait et sa conséquence sont dans la dernière ligne du tableau
             ci-dessus — « Ce que la carte contient · rien · 0 monstre posé,
             0 sortie — tout vient du serveur » ;
           · la provenance est en tête du bloc Oasis, hors de ce panneau et donc
             lisible SANS l'ouvrir — « Monstres lus dans les fichiers ; la structure
             du tour vient de captures d'écran ».
          Un troisième énoncé n'ajoutait pas d'insistance, il ajoutait vingt-deux mots.
          └────────────────────────────────────────────────────────────────┘ */}
    </div>
  );
}

/**
 * LE FIL DU TOUR — dix jalons sur un rail, et une boucle au milieu.
 *
 * Le rail vertical est un simple `border-left` : aucun SVG, aucune dépendance, et il
 * suit la hauteur du contenu tout seul — un tracé dessiné aurait demandé de connaître
 * cette hauteur à l'avance.
 *
 * LA BOUCLE EST LE RENSEIGNEMENT QU'AUCUNE LISTE NE DONNAIT. Sur les dix messages,
 * cinq se répètent CINQUANTE-DEUX FOIS et cinq ne se jouent qu'une fois par tour. Une
 * liste à plat les posait sur le même plan, donc on lisait la séquence comme dix pas
 * successifs. Le cadre de la phase répétée le dit sans une phrase de plus : son
 * étiquette porte le compte, et il vient des données.
 */
function FilDuTour({ vagues }: { vagues: number }) {
  /* Les bornes de la phase répétée : du jalon qui numérote la vague à celui qui paie
     la prime. Cherchées par leur identifiant de chaîne — pas par leur rang dans le
     tableau, qui bougerait au premier ajout. */
  const debut = DEROULE.findIndex((d) => d.id === "01");
  const fin = DEROULE.findIndex((d) => d.id === "09");
  const boucle = debut >= 0 && fin > debut;

  const jalons = DEROULE.map((d, i) => ({ ...d, dansBoucle: boucle && i >= debut && i <= fin }));

  return (
    <div style={{ marginBottom: 20 }}>
      <div className="fil-rail">
        {jalons.map((d, i) => {
          const ouvre = d.dansBoucle && i === debut;
          const ferme = d.dansBoucle && i === fin;
          return (
            <div key={d.id} className={`fil-pas${d.dansBoucle ? " fil-dans" : ""}${ouvre ? " fil-ouvre" : ""}${ferme ? " fil-ferme" : ""}`}>
              <span className="fil-puce" aria-hidden="true">{i + 1}</span>
              <span className="fil-nom">
                {/* La bulle porte la PREUVE : la chaîne du client mot pour mot, sa
                    glose quand il y en a une, et la clef des %u quand la chaîne en
                    contient — testée sur la chaîne, donc jamais affichée pour rien. */}
                <Bulle
                  largeur={300}
                  quoi={
                    <span style={{ display: "grid", gap: 6 }}>
                      <span style={{ color: "var(--gold)", fontFamily: "ui-monospace, monospace", fontSize: 11.5, lineHeight: 1.5 }}>{d.texte}</span>
                      {d.ceQueCaDit && <span style={{ color: "var(--text-muted)" }}>{d.ceQueCaDit}</span>}
                      {d.texte.includes("%") && (
                        <span style={{ color: "var(--text-muted)", fontSize: 11 }}>
                          Les <code>%u</code>, <code>%d</code>, <code>%s</code> sont des trous que le jeu
                          remplit en cours de partie.
                        </span>
                      )}
                    </span>
                  }
                >
                  <span>{d.etape}</span>
                </Bulle>
              </span>
              {ouvre && (
                <span className="fil-boucle" style={{ fontVariantNumeric: "tabular-nums" }}>
                  <Icon name="rotate-ccw" size={11} />× {vagues}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {/* Aucun accent grave dans ce commentaire : dans un litteral de gabarit, il
          fermerait la chaine et mettrait la page en 500 sans que tsc le voie. */}
      <style>{`
        .fil-rail{display:grid;gap:0;margin:0;padding:0 0 0 4px}
        .fil-pas{display:grid;grid-template-columns:22px minmax(0,1fr) auto;align-items:center;
          gap:10px;padding:6px 10px 6px 0;position:relative}
        .fil-pas::before{content:"";position:absolute;left:10px;top:0;bottom:0;width:1px;
          background:var(--border)}
        .fil-pas:first-child::before{top:50%}
        .fil-pas:last-child::before{bottom:50%}
        .fil-puce{position:relative;z-index:1;width:21px;height:21px;border-radius:50%;
          display:grid;place-items:center;font-size:10.5px;font-variant-numeric:tabular-nums;
          color:var(--text-muted);background:var(--bg-3);border:1px solid var(--border)}
        .fil-nom{min-width:0;font-size:12.5px}
        .fil-dans .fil-puce{border-color:var(--orange);color:var(--orange)}
        /* Le cadre de la phase repetee : trois bords sur les jalons du milieu, ferme
           en haut sur le premier et en bas sur le dernier. Une seule teinte, celle du
           bloc — c'est la POSITION du cadre qui dit ce qu'il englobe. */
        .fil-dans{background:color-mix(in srgb, var(--orange) 5%, transparent);
          border-left:2px solid var(--orange);border-right:1px solid transparent;
          padding-left:0;margin-left:-2px}
        .fil-ouvre{border-top:1px dashed var(--orange);border-top-left-radius:8px}
        .fil-ferme{border-bottom:1px dashed var(--orange);border-bottom-left-radius:8px}
        .fil-boucle{display:inline-flex;align-items:center;gap:4px;font-size:10.5px;
          text-transform:uppercase;letter-spacing:.5px;color:var(--orange);
          background:color-mix(in srgb, var(--orange) 12%, transparent);
          border-radius:20px;padding:1px 8px;white-space:nowrap}
      `}</style>
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
