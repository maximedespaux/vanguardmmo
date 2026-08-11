"use client";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { SectionTabs } from "@/components/SectionTabs";
import { Icon, type IconName } from "@/components/Icon";
import { useCardFx } from "@/components/VgFx";
import dungeonsData from "@/data/dungeons.json";
import ICONES from "@/data/icones-objets.json";
import { prestigeNeed } from "@/data/prestige";

const DONJONS = dungeonsData as { name: string; icon: string; type: string; prestige: number | null }[];

/**
 * La roue des cinq éléments, recopiée du manuel du jeu (Client/help.inc).
 *
 * Le nom de fichier de l'icône ne suit pas le nom affiché : le jeu écrit
 * « Électricité » sur la pièce et « Foudre » dans son manuel. On garde les deux,
 * sinon le lecteur cherche « Foudre » dans une liste qui dit « Électricité ».
 */
const ROUE = [
  { nom: "Feu", fichier: "feu", bat: "le Vent", craint: "l'Eau" },
  { nom: "Eau", fichier: "eau", bat: "le Feu", craint: "la Foudre" },
  { nom: "Foudre", fichier: "electricite", bat: "l'Eau", craint: "la Terre" },
  { nom: "Terre", fichier: "terre", bat: "la Foudre", craint: "le Vent" },
  { nom: "Vent", fichier: "vent", bat: "la Terre", craint: "le Feu" },
];

/**
 * Ce que la phrase d'un boss veut dire.
 *
 * Ces quinze phrases sont les seules règles de combat que le jeu énonce, et il
 * les énonce une fois, dans le chat, au milieu d'un pull. On garde celles qui
 * changent ce qu'on fait dans la seconde — les autres ne sont que du décor.
 * L'orbe de couleur est l'asset du jeu lui-même : c'est ce qu'on voit à l'écran.
 */
const BOSS: { orbe?: string; icone?: IconName; phrase: string; quoi: string }[] = [
  { orbe: "eelementtypeyellow01", phrase: "Éclat jaune", quoi: "Au corps à corps, et seulement au corps à corps." },
  { orbe: "eelementtypegreen01", phrase: "Éclat vert", quoi: "À distance. Les mêlées lâchent et attendent." },
  { orbe: "eelementtypepurple01", phrase: "Éclat violet", quoi: "Magie. Les physiques ne servent plus à rien." },
  { icone: "rotate-ccw", phrase: "« Chaque blessure que vous m'infligez sera la vôtre ! »", quoi: "Il renvoie les dégâts. Une variante ne les renvoie qu'au bout de trois secondes — c'est le pire piège, on croit que ça passe." },
  { icone: "alert", phrase: "« Rage : ne frappez pas avec le mauvais type de dégâts… »", quoi: "Mauvais type de dégâts et il double sa régénération : mieux vaut arrêter que taper faux." },
  { icone: "hand-point", phrase: "« Cessez d'attaquer ou vous serez punis. »", quoi: "On lâche tout, vraiment. Ce n'est pas du bluff." },
  { icone: "swords", phrase: "« Deux corps, un seul écho… »", quoi: "Deux boss, une seule mort : ils doivent tomber ensemble ou ils reviennent. On équilibre les PV avant d'achever." },
  { icone: "skull", phrase: "« Assez joué… »", quoi: "Phase enragée. C'est le moment des potions, pas celui de la gourmandise." },
];

/**
 * Une instance citée dans le texte renvoie à sa fiche du wiki.
 *
 * Le guide nommait des donjons sans y mener : il fallait retenir le nom, ouvrir
 * le wiki, le retrouver dans une grille de vingt-trois cartes. Le lien ouvre
 * directement la bonne fiche, avec ses PV, son armure et ses drops.
 */
function Instance({ nom }: { nom: string }) {
  const d = DONJONS.find((x) => x.name.toLowerCase() === nom.toLowerCase());
  if (!d) return <b>{nom}</b>;
  return (
    <a href={`/donjons?instance=${encodeURIComponent(d.name)}`} className="gd-lien">
      <Icon name={d.icon as IconName} size={13} />{d.name}
    </a>
  );
}

/** Un objet, avec son icône du jeu quand on la connaît. */
function Objet({ nom, texte }: { nom: string; texte?: string }) {
  const src = (ICONES as Record<string, string>)[nom];
  return (
    <span className="gd-objet">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src && <img src={src} alt="" width={16} height={16} />}
      {texte ?? nom}
    </span>
  );
}

/**
 * « Cet objet · où le trouver ».
 *
 * Ces lignes reprenaient le style des items de quête — libellé à gauche, gros
 * chiffre doré à droite. Ça marche pour « Nucléus · 160 000 », pas pour un
 * objet suivi d'un ou deux liens : le contenu ne tenait pas dans les colonnes
 * de 248 px et chaque ligne se repliait sur deux hauteurs. Une seule colonne,
 * et de la place des deux côtés.
 */
function Ou({ quoi, ou }: { quoi: React.ReactNode; ou: React.ReactNode[] }) {
  return (
    <div className="gd-ou">
      <span className="quoi">{quoi}</span>
      <span className="ou">
        <Icon name="chevron-right" size={12} />
        {ou.map((x, i) => <span key={i} className="lieu">{x}</span>)}
      </span>
    </div>
  );
}

function Tip({ title, prio, mt, icon, children }: { title?: string; prio?: string; mt?: boolean; icon?: IconName; children: React.ReactNode }) {
  return (
    <div className="gd-tip" style={mt ? { marginTop: 10 } : undefined}>
      {title && <h4>{icon && <Icon name={icon} size={17} style={{ display: "inline-block", marginRight: 7, color: "var(--gold)" }} />}{title}{prio ? <span className="gd-prio">{prio}</span> : null}</h4>}
      <p>{children}</p>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <div className="gd-note">{children}</div>;
}

function Prestige({ badge, title, subtitle, isOpen, onToggle, icon, children }: { badge: string; title: React.ReactNode; subtitle: string; isOpen: boolean; onToggle: () => void; icon?: IconName; children: React.ReactNode }) {
  return (
    <div className={`gd-prestige ${isOpen ? "open" : ""}`}>
      <div className="gd-head" onClick={onToggle}>
        <div className="gd-badge">{badge}</div>
        <div className="gd-pt"><h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>{icon && <Icon name={icon} size={18} style={{ color: "var(--gold)" }} />}{title}</h3><div className="gd-ps">{subtitle}</div></div>
        <div className="gd-arrow">▶</div>
      </div>
      <div className="gd-body">{children}</div>
    </div>
  );
}

export default function GuidePage() {
  // Halo suivant le curseur + leger relief sur les .fx-card (cf. VgFx).
  useCardFx();
  const [open, setOpen] = useState<Record<string, boolean>>({ p3: true });
  const toggle = (id: string) => setOpen(o => ({ ...o, [id]: !o[id] }));
  const P = (id: string) => ({ isOpen: !!open[id], onToggle: () => toggle(id) });

  return (
    <div style={{ padding: "24px 32px 56px", maxWidth: 1300, margin: "0 auto" }}>
      {/* Le sous-titre annoncait « calculateur de prestige et infos de jeu » : le
          calculateur est une autre page (l'onglet Prestige juste en dessous), et
          les « infos de jeu » ne menaient nulle part. Il dit maintenant ce que
          CETTE page contient. */}
      <PageHeader banner="/assets/site/banners/banner-guides.webp" title="Guide de progression" subtitle="Le guide de Sugot, prestige par prestige : quoi faire en priorité, et quoi anticiper." />
      <SectionTabs section="guides" />

      <div className="gd">
        {/* La playlist vivait ici, dans un lecteur unique : on ne savait pas
            quelle vidéo allait avec quel donjon. Chaque instance porte
            maintenant la sienne sur sa propre fiche, dans le wiki. */}

        {/* AUTHOR */}
        <div className="gd-card fx-card">
          <div className="gd-author">
            <div className="av"><Icon name="graduation" size={24} style={{ color: "var(--orange)" }} /></div>
            <div><div className="n">Guide de progression — par Sugot</div><div className="r">Formateur volontaire</div></div>
          </div>
          <p className="gd-intro">Bonjour à tous les nouveaux joueurs, vous voilà 200 et prestige 3. Pour ne pas vous disperser et avoir des objectifs clairs, voici une « trame » à suivre, ou du moins quelques conseils pour vous y retrouver sans passer des heures à errer inutilement. Ce guide est classé par prestige pour suivre pas à pas.</p>
        </div>

        {/* QUEST ITEMS */}
        <div className="gd-card fx-card">
          <h2 className="gd-cardtitle"><Icon name="package" size={18} />Items quête requis (tous prestiges)</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 14 }}>La quantité totale d&apos;items de quête requis pour tous les prestiges. Ça peut sembler important, mais en vous y prenant bien tout se goupillera — le farm étant l&apos;essence même de Flyff.</p>
          <div className="gd-grid">
            {/* Ces totaux étaient recopiés à la main, et deux avaient déjà dérivé :
                le Badge Jardin Prestigieux affichait 69 pour 75 réels, et le Périn
                1 400 pour 500. On les CALCULE désormais depuis PRESTIGE_COSTS, seule
                source de vérité : un chiffre calculable recopié finit toujours par
                mentir. L'ordre suit celui du tableau, du plus gros au plus petit. */}
            {Object.entries(prestigeNeed(1, 10))
              .sort((a, b) => b[1] - a[1])
              .map(([l, n]) => [l, n.toLocaleString("fr-FR")] as const)
              .map(([l, v]) => (
              <div className="gd-qitem" key={l}><span className="ql">{l}</span><span className="qv">{v}</span></div>
            ))}
          </div>
        </div>

        <h2 className="gd-phead" style={{ display: "flex", alignItems: "center", gap: 8 }}><Icon name="sparkles" size={18} />Guide par prestige</h2>

        <Prestige badge="P3" title="Le début de l'aventure" subtitle="Quelles instances favoriser" {...P("p3")}>
          <Tip icon="sprout" title="Faille du débutant">Toujours utile pour récupérer les Jetons d&apos;Air et les échanger au PNJ devant l&apos;instance contre des consommables et CS gratuits. (Tout ce qui est gratuit n&apos;est pas à payer !)</Tip>
          <Tip icon="ghost" title="Instance Vampirique">4 entrées par jour. Les armes : soit les vendre au PNJ pour 5 périn/u, soit les transformer en morceaux d&apos;armes vampiriques au PNJ Pépito (à côté de la forge à Flaris).</Tip>
          <Tip icon="tree" title="Forêt d'Euphrasia / Grotte d'Herneos">À faire pour vous constituer un stock de perles niveau 3.</Tip>
          <Tip icon="snow" title="Ruines Givrées">1 entrée. Tuez tous les mobs et le boss pour récupérer les items servant à crafter des meubles (durabilité 7 jours, cumulables jusqu&apos;à 30 jours).</Tip>
          <Tip icon="landmark" title="Ruines Prestigieuses" prio="À anticiper">1 entrée/jour. À faire dès le départ : tuez les mobs et le boss. Il faut 40 lianes + 1 terreau pour un badge, donc anticipez au plus tôt.</Tip>
          <Tip icon="rocket" title="USS Celestia">Petite instance, CD de 2h. Essayez d&apos;avoir un ramasseur PVE en lien avec votre classe, que vous pourrez muter pour peu de prix via les jetons rookies (1 mutagène + 7 clés).</Tip>
          <Note><Icon name="sparkles" size={14} style={{ display: "inline-block", marginRight: 6 }} />Faites toutes ces instances en priorité. Il vous faudra peu de PV : <b>150K en élément vent +20</b> permet de toutes les faire. Ensuite, si possible, commencez un set <b>Shaitan</b> si vous souhaitez faire Behemoth et Bastion (450k HP).</Note>
          <Tip icon="tower" title="Badge de la Tour" prio="À prioriser" mt>Quête récupérable à Oasis. 15K mobs en 1vs1 ou 40K en AoE. Conseil : visez l&apos;AoE avec une classe magique — le <b>Primat qui OS les mobs</b> est votre partenaire idéal. Il en faut 2 jusqu&apos;au prestige 10 ; en faire un 3ème sera votre gagne-pain pour passer directement au P5 si vous achetez vos nucléus.</Tip>
        </Prestige>

        <Prestige badge="P4" icon="smile" title="Rien ne changera" subtitle="Continuez sur votre lancée" {...P("p4")}>
          <Tip>Rien ne change à ce prestige — poursuivez les objectifs du P3.</Tip>
        </Prestige>

        <Prestige badge="P5" title="Enfin un prestige intéressant !" subtitle="3 choses très importantes se débloquent" {...P("p5")}>
          <Tip icon="dragon" title="Sietch Kalgas">Une instance longue, très longue (attendez-vous à courir). Très intéressante : pas de PV minimal requis car le boss a un aggro fixe. Tapez avec un perso en tournant autour, et avec votre second personnage tapez librement sans jamais vous faire toucher. Il vous faut <b>2 personnages P5</b>.</Tip>
          <Tip icon="tower" title="Tower Defense" prio="À prioriser">3 entrées/jour, 700 emblèmes de protection si vous allez au bout par entrée. Une statue s&apos;affiche sur la mini-map (croix rouge) : défendez la tour. Surveillez les 2 premières vagues, puis lancez vos AoE sans ciblage avec vos dugkug toutes les 60s via le Ftool et partez faire autre chose. <Icon name="alert" size={14} style={{ display: "inline-block", marginRight: 3 }} />L&apos;AoE Primat en combo Halo peut bugger/s&apos;arrêter : cliquez et décalez votre perso pour relancer.</Tip>
          <Tip icon="medal" title="Quête Badge Donjon Mineur" prio="À prioriser">Il en faut 4 par personnage jusqu&apos;au P10. Pour en avoir 1, faites Vampirique / Behemoth / Bastion / Celestia sur 3 jours.</Tip>
          <Note>Optionnel (ou pas) : le <b>Jardin Prestigieux</b> (en haut de l&apos;escalier d&apos;Oasis, à gauche, le téléporteur). Le CW y est tous les jours à <b>18h30</b> pour récupérer un buff de 2h (le temps s&apos;arrête lors des déconnexions).</Note>
        </Prestige>

        <Prestige badge="P6" title="Peu de gains" subtitle="Mais un déblocage utile" {...P("p6")}>
          <Tip>Vous débloquez le <b>second étage des Ruines Prestigieuses</b>, ce qui permet d&apos;accumuler encore plus de badges Jardin prestigieux.</Tip>
        </Prestige>

        <Prestige badge="P7" title="Fin du guide débutant" subtitle="Nouvelle zone de farm + Jardin de Jade" {...P("p7")}>
          <Tip icon="sprout-farm" title="Nouvelle zone de Farm">Accessible au téléporteur du Jardin Prestigieux (Oasis). Zone parfaite pour farm des nucléus parfaits (échangeables contre n&apos;importe quel autre nucléus), des branches (à revendre), des perins à foison, et une grande quantité d&apos;ori/pl très utiles.</Tip>
          <Tip icon="leaf" title="Jardin de Jade">Instance pour farm les items quête servant à votre rune d&apos;arme <b>Yggdrasil</b>. C&apos;est laborieux, mais voici une astuce : vous pouvez ne faire que les mobs pour avoir les marteaux (il en faut 3000, prix avoisinant 1P/u). Plus vous anticipez tôt, mieux c&apos;est — le taux de drop est bas sans cape ni Goldéa.</Tip>
          <Note><Icon name="sparkles" size={14} style={{ display: "inline-block", marginRight: 6 }} /><b>Astuce de pauvre (Sugot) :</b> restat full END via les parchemins à Isruel, restez en stuff DPS, dugkug en continu via Ftool, prenez une dizaine/vingtaine de mobs (ça tape un peu fort, ne soyez pas trop gourmand) et hop, AoE. Uniquement sur les mobs, sans toucher au boss. Faites votre stock de 3000 marteaux et vendez le surplus : ça financera vos 4 runes vierges Yggdrasil.</Note>
        </Prestige>

        <Prestige badge="P8" title="Le Temple Aérien" subtitle="Dernière étape avant le P10" {...P("p8")}>
          <Tip>Pour ceux ayant des tanks (Prestige 3) à environ <b>1M3 HP</b>, n&apos;hésitez pas à passer rapidement prestige 8 avec votre DPS principal (il vous faudra quand même un perso prestige 5 dans ces recommandations).</Tip>
          <Tip icon="torii" title="Temple Aérien">Instance très rapide (3h de CD), nécessitant seulement <b>360k HP</b> (armure +20 vent). Dernière étape pour valider votre quête Badge Donjon, qui demande encore une fois pendant 3 jours : Sentier / Dédale / Kalgas / Temple Aérien.</Tip>
          <Note><Icon name="target" size={14} style={{ display: "inline-block", marginRight: 6 }} />Voici ce qu&apos;il vous faudra pour préparer tous les items quête afin de passer P10, sans vous perdre.</Note>
        </Prestige>

        {/* ── Ce que la trame de Sugot ne couvrait pas ──
            Le guide s'arrête au P8 et ne parle que des instances. Tout ce qui
            vient après — runes, éveil, cartes, crafts — n'était écrit nulle
            part. Ces sections ne disent que ce que les données confirment :
            les drops relevés dans la fenêtre du jeu, et la base d'objets de la
            guilde. Rien n'y est estimé. */}
        <h2 className="gd-phead" style={{ display: "flex", alignItems: "center", gap: 8 }}><Icon name="layers" size={18} />Après les instances</h2>

        <div className="gd-card fx-card">
          <h2 className="gd-cardtitle"><Icon name="hammer" size={18} />Les crafts de la guilde</h2>
          <p className="gd-intro" style={{ marginBottom: 12 }}>Trois recettes, telles qu&apos;elles sont enregistrées dans la base d&apos;objets de Vanguard. Les composants se farment en instance : le badge sort de la <Instance nom="Ruine Prestigieuse" />, les morceaux d&apos;œuf de plusieurs donjons de fin de jeu.</p>
          <div className="gd-recettes">
            <div className="gd-recette">
              <h4><Objet nom="Badge Jardin Prestigieux" texte="Badge Jardin Prestigieux" /></h4>
              <ul><li>40 × Liane Ruine Prestigieuse</li><li>1 × Terreau Ruine Prestigieuse</li></ul>
              <p className="gd-src">Les lianes tombent sur les trash mobs, le terreau sur le boss. C&apos;est le craft le plus rentable du début : il en faut 69 en tout jusqu&apos;au P10.</p>
            </div>
            <div className="gd-recette">
              <h4><Objet nom="Morceau d'oeuf doré Britannia" texte="Œuf doré" /></h4>
              <ul>
                <li>10 × morceau d&apos;œuf doré, de chacune des six sources : Britannia, Sentier Rhisis, Dédale Rhisis, Kalgas, Protection, Protection Supérieure</li>
                <li>20 × Œuf</li><li>1 000 × Périn</li>
              </ul>
            </div>
            <div className="gd-recette">
              <h4><Objet nom="Morceau d'oeuf doré Britannia" texte="Œuf doré Tank" /></h4>
              <ul>
                <li>15 × morceau d&apos;œuf doré, des six mêmes sources</li>
                <li>15 × Catalyseur d&apos;énergie de Bubble</li>
                <li>30 × Œuf</li><li>1 500 × Périn</li>
              </ul>
              <p className="gd-src">Plus cher que la version classique, et il demande en plus les catalyseurs. À ne lancer que si le tank est votre personnage principal.</p>
            </div>
          </div>
        </div>

        <div className="gd-card fx-card">
          <h2 className="gd-cardtitle"><Icon name="sparkles" size={18} />Les runes d&apos;arme</h2>
          <p className="gd-intro" style={{ marginBottom: 12 }}>Une rune vierge se pose sur une arme pour la faire monter d&apos;un cran. Chaque famille a la sienne, et chacune tombe dans une instance précise.</p>
          <div className="gd-liste">
            <Ou quoi={<Objet nom="Rune Yggdrasil Vierge" />} ou={[<Instance key="a" nom="Jardin de Jade" />]} />
            <Ou quoi={<Objet nom="Marteau Runique Yggdrasil" />} ou={[<Instance key="a" nom="Jardin de Jade" />]} />
            <Ou quoi={<Objet nom="Rune Vampirique Vierge" />} ou={[<Instance key="a" nom="Crypte des sans repos" />]} />
            <Ou quoi={<Objet nom="Rune Épée Luzaka oubliée (TANK)" texte="Runes Luzaka (TANK)" />} ou={[<Instance key="a" nom="Grotte d'Herneos" />]} />
          </div>
          <Note><Icon name="alert" size={14} style={{ display: "inline-block", marginRight: 6 }} />Les runes Luzaka existent pour les neuf types d&apos;arme, plus une version SUP au sceptre. Le Jardin de Jade demande <b>3 000 marteaux</b> pour une rune Yggdrasil : c&apos;est le farm le plus long du jeu, à commencer tôt.</Note>
        </div>

        <div className="gd-card fx-card">
          <h2 className="gd-cardtitle"><Icon name="scroll" size={18} />L&apos;éveil</h2>
          <p className="gd-intro" style={{ marginBottom: 12 }}>Les parchemins d&apos;éveil ajoutent une statistique à une pièce. Ils vont par rang : le <b>rang 1</b> d&apos;abord, le <b>rang 2</b> ensuite, plus rare. Trois familles, trois provenances.</p>
          <div className="gd-liste">
            <Ou quoi={<Objet nom="Parchemin d'éveil fixe FOR (Rang 1)" texte="Éveil fixe — 11 statistiques" />} ou={[<Instance key="a" nom="Behemoth" />]} />
            <Ou quoi={<Objet nom="Parchemin d'éveil à bijou rang 1" texte="Éveil à bijou" />} ou={[<Instance key="a" nom="Temple aérien" />]} />
            <Ou quoi={<Objet nom="Parchemin d'éveil à Fashion rang 1" texte="Éveil à Fashion" />} ou={[<Instance key="a" nom="Paradis Arcanique" />]} />
            <Ou quoi={<Objet nom="Pierre d'amélioration parure Tank" texte="Pierres de parure Tank / DPS" />} ou={[<Instance key="a" nom="Temple aérien" />]} />
          </div>
          <p className="gd-src" style={{ marginTop: 10 }}>Les onze statistiques de l&apos;éveil fixe : INCANT, DEPLA, SOINS, HP, MP, ATTAQUE, FOR, END, DEX, INT, DCC — chacune en rang 1 et en rang 2, plus un coffret qui en donne un au hasard.</p>
        </div>

        {/* Cette carte disait « Grade A → 7 %, Grade S → 10 % » et melait Feu,
            Eau, Foudre, Terre avec Fulgur et Volcano. C'etaient DEUX familles
            confondues en une : A et S sont des cartes d'ATTAQUE, 7 % et 10 % des
            cartes de DEFENSE, et le meme element change de nom de l'une a
            l'autre. La confusion venait de la, pas du lecteur. */}
        <div className="gd-card fx-card">
          <h2 className="gd-cardtitle"><Icon name="target" size={18} />Les cartes de perçage</h2>
          <p className="gd-intro" style={{ marginBottom: 14 }}>
            Deux familles, et c&apos;est tout le piège : le même élément porte deux noms selon ce qu&apos;on perce.
            Le feu attaque sous le nom <b>Feu</b> et défend sous le nom <b>Volcano</b>.
          </p>

          <div className="gd-perc">
            <div>
              <div className="gd-perctitre">Arme &amp; bouclier — attaque</div>
              <div className="gd-perclist">
                {[["Feu", "Force"], ["Eau", "Intelligence"], ["Air", "Déplacement, soins"], ["Terre", "Endurance"], ["Foudre", "Dextérité"]].map(([nom, quoi]) => (
                  <div key={nom} className="gd-percel">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/airbuilder/icons/percage/${nom.toLowerCase()}-s.png`} alt="" />
                    <span><b>{nom}</b><i>{quoi}</i></span>
                  </div>
                ))}
              </div>
              <div className="gd-percgr"><span>A</span> puis <span>S</span> — la seconde vaut presque le double.</div>
            </div>

            <div>
              <div className="gd-perctitre">Tenue — défense</div>
              <div className="gd-perclist">
                {[["Volcano", "PV %", "volcano"], ["Océane", "PM %, soins", "oceane"], ["Néant", "PF %", "neant"], ["Séisme", "Défense %", "seisme"], ["Fulgur", "Attaque %", "fulgur"]].map(([nom, quoi, f]) => (
                  <div key={nom} className="gd-percel">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/airbuilder/icons/percage/${f}-10.png`} alt="" />
                    <span><b>{nom}</b><i>{quoi}</i></span>
                  </div>
                ))}
              </div>
              <div className="gd-percgr"><span>7 %</span> puis <span>10 %</span> — sur le même emplacement.</div>
            </div>
          </div>

          {/* Le manuel du jeu dit encore « jusqu'à 4 piercings dans votre armure »
              partout : c'est l'ancien texte. Le client en a une version corrigee
              (TID_PIERCING_POSSIBLE_NEW) qui distingue une main et deux mains, et
              c'est celle-la qui est vraie. Un joueur qui compte 4 emplacements sur
              son epee a une main achete deux cartes pour rien. */}
          <div className="gd-note" style={{ marginTop: 14 }}>
            <b>Combien d&apos;emplacements ?</b> Deux sur les armes à une main et les boucliers,
            quatre sur les armes à deux mains et les armures. Le manuel du jeu annonce encore
            « jusqu&apos;à 4 » partout : ne compte pas dessus avant d&apos;acheter tes cartes.
          </div>

          {/* La fusion est annoncee « gratuite » dans la fenetre du PNJ, et elle
              l'est — en penyas. Ce qu'elle ne dit pas au meme endroit, c'est ce
              qu'un echec coute : neuf cartes. C'est LA phrase a retenir. */}
          <div className="gd-note" style={{ marginTop: 10 }}>
            <b>Monter une carte d&apos;un cran</b> se fait chez le PNJ d&apos;échange : dix cartes du
            même palier contre une du palier au-dessus, sans frais. Mais en cas d&apos;échec
            <b> une seule carte t&apos;est rendue</b> — tu en perds neuf. Ne fusionne que ce que
            tu es prêt à voir disparaître, et garde tes cartes hautes pour la fin.
          </div>

          <p className="gd-src" style={{ marginTop: 12 }}>
            Chaque niveau de perçage ouvre un emplacement, et chaque emplacement prend une carte.
            Le jeu a des paliers plus hauts — R et SR à l&apos;attaque, 12 % et 15 % en défense, dits « de Baruna » —
            que l&apos;AirBuilder ne propose pas encore.
          </p>
        </div>

        <div className="gd-card fx-card">
          <h2 className="gd-cardtitle"><Icon name="sparkles" size={18} />L&apos;élément de la pièce</h2>
          <p className="gd-intro">
            À ne pas confondre avec le perçage : c&apos;est l&apos;élément de l&apos;arme ou de la tenue elle-même,
            monté de +1 à +20. Cinq éléments — Feu, Eau, Vent, Terre, Électricité — et une seule règle :
            on choisit celui auquel les monstres visés résistent le moins.
          </p>

          {/* Cette carte disait « celui auquel les monstres resistent le moins »
              sans jamais dire COMMENT le savoir. La roue est ecrite noir sur
              blanc dans le manuel du jeu, et elle vaut pour l'equipement autant
              que pour les sorts : « une fois enchante par le feu, votre objet
              deviendra puissant contre le vent, mais faible contre l'eau ». */}
          <div className="gd-roue">
            {ROUE.map((e) => (
              <div key={e.nom} className="gd-roue-el">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/jeu/mecaniques/element-${e.fichier}.webp`} alt="" />
                <div className="gd-roue-txt">
                  <b>{e.nom}</b>
                  <i><span className="bat">bat {e.bat}</span><span className="craint">craint {e.craint}</span></i>
                </div>
              </div>
            ))}
          </div>
          <p className="gd-src" style={{ marginTop: 10 }}>
            Ta pièce prend l&apos;élément et ses deux faces : forte contre celui qu&apos;elle bat,
            faible contre celui qu&apos;elle craint. Et un objet ne porte qu&apos;un élément à la fois —
            en changer demande un Parchemin de Changement d&apos;Élément, qui garde la valeur (Eau +10 devient Feu +10).
          </p>
        </div>

        <div className="gd-card fx-card">
          <h2 className="gd-cardtitle"><Icon name="book" size={18} />Le Carnet d&apos;Arcanes</h2>
          <p className="gd-intro" style={{ marginBottom: 12 }}>Un album à collectionner. Les cartes se rangent dans des étuis, et les deux se gagnent en fin de jeu.</p>
          <p className="gd-src" style={{ marginBottom: 12 }}>Quatre raretés de carte : <b>Commune</b>, <b>Rare</b>, <b>Épique</b>, <b>Légendaire</b>.</p>
          <div className="gd-liste">
            <Ou quoi={<Objet nom="Étui à carte 1" texte="Étuis à carte 1 · 2 · 3" />} ou={[<Instance key="a" nom="Paradis Arcanique" />]} />
            <Ou quoi={<Objet nom="Coffret à packet de cartes Epic" texte="Coffret Epic / Rare" />} ou={[<Instance key="a" nom="Mausolée des Divinités" />, <Instance key="b" nom="Sanctuaire Shogun" />]} />
            <Ou quoi={<Objet nom="Coffre à packet de cartes aléatoire" texte="Coffre aléatoire" />} ou={[<Instance key="a" nom="Clairière de la fée" />, <Instance key="b" nom="Temple aérien" />]} />
          </div>
        </div>

        {/* ── Les astuces au sens strict ──
            Ce qui suit ne se range pas sous un prestige : ce sont les regles que
            le jeu enonce UNE fois, dans une fenetre qu'on ferme sans lire ou dans
            le chat au milieu d'un pull. Rien qui se compte ou se trie ici — pour
            ca il y a le wiki. Uniquement ce qui change ce qu'on fait maintenant. */}
        <h2 className="gd-phead" style={{ display: "flex", alignItems: "center", gap: 8 }}><Icon name="help" size={18} />Ce que le jeu ne dit qu&apos;une fois</h2>

        <div className="gd-card fx-card">
          <h2 className="gd-cardtitle"><Icon name="skull" size={18} />Le boss t&apos;explique comment le tuer</h2>
          <p className="gd-intro" style={{ marginBottom: 14 }}>
            Un boss d&apos;AirFlyff ne parle pas pour le décor : chacune de ses phrases est une
            règle de combat. Elle passe une fois dans le chat, souvent pendant que tu tapes.
            Voilà les huit qui changent quelque chose.
          </p>
          <div className="gd-liste">
            {BOSS.map((b) => (
              <div key={b.phrase} className="gd-boss">
                <span className="gd-boss-ic">
                  {b.orbe
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={`/jeu/interface/${b.orbe}.webp`} alt="" />
                    : b.icone && <Icon name={b.icone} size={17} style={{ color: "var(--gold)" }} />}
                </span>
                <span className="gd-boss-txt"><b>{b.phrase}</b><i>{b.quoi}</i></span>
              </div>
            ))}
          </div>
          <p className="gd-src" style={{ marginTop: 12 }}>
            Deux autres phrases imposent l&apos;arme : « vos lames ne servent à rien ici » (magie
            obligatoire) et « vos arcanes sont vaines » (l&apos;inverse). Le principe est toujours le
            même — on lit avant de relancer le combo.
          </p>
        </div>

        <div className="gd-card fx-card">
          <h2 className="gd-cardtitle"><Icon name="gauge" size={18} />Les taux du serveur, et ce qu&apos;ils changent</h2>
          <div className="gd-taux">
            <div><span className="tv">×600</span><span className="tl">Expérience des monstres</span></div>
            <div><span className="tv">×500</span><span className="tl">Penyas ramassés</span></div>
            <div><span className="tv">×1</span><span className="tl">Chute d&apos;objets</span></div>
          </div>
          <p className="gd-intro" style={{ marginTop: 14 }}>
            C&apos;est toute l&apos;économie du serveur en trois chiffres : ton niveau et ton
            porte-monnaie montent à une vitesse folle, <b>ton stuff tombe au taux d&apos;origine</b>.
            D&apos;où le réflexe à prendre — le temps se met dans le farm d&apos;objets, jamais dans
            le farm de penyas, et acheter à un membre coûte presque toujours moins cher
            que courir après la pièce soi-même.
          </p>
          {/* Le butin ordinaire n'est PAS dans le client : il est calcule par le
              serveur. Cette note existe pour qu'une fiche vide ne se lise jamais
              comme « ca ne tombe pas » — c'est l'erreur que le wiki ferait faire. */}
          <div className="gd-note" style={{ marginTop: 12 }}>
            <Icon name="info" size={14} style={{ display: "inline-block", marginRight: 6 }} />
            Quand une fiche du site ne montre aucune source pour un objet, ça ne veut pas dire
            qu&apos;il ne tombe pas : le butin ordinaire des monstres est calculé par le serveur et
            n&apos;est écrit nulle part dans les fichiers du jeu. On n&apos;affiche que ce qu&apos;on peut prouver.
          </div>
        </div>

        <div className="gd-card fx-card">
          <h2 className="gd-cardtitle"><Icon name="clock" size={18} />Les huit règles qui font perdre du temps</h2>
          <p className="gd-intro" style={{ marginBottom: 12 }}>
            Chacune est écrite dans une fenêtre du jeu qu&apos;on ferme sans la lire, et chacune
            coûte une soirée quand on l&apos;apprend trop tard.
          </p>
          <ul className="gd-regles">
            <li><b>Tes entrées d&apos;instance se remettent à zéro à 8 h</b>, pas à minuit. Une session lancée à 7 h consomme donc encore les entrées de la veille — et une entrée gardée pour « demain » se perd si tu joues avant 8 h.</li>
            <li><b>La récompense du calendrier de connexion demande 60 minutes en ligne.</b> Se connecter pour la prendre et repartir ne marche pas.</li>
            <li><b>Ton prêtre a deux modes : <code>/mode fs</code> et <code>/mode dps</code>.</b> Un sort qui refuse de partir, c&apos;est souvent le mauvais mode et rien d&apos;autre — et comme il y a un délai entre deux bascules, on choisit <i>avant</i> d&apos;entrer.</li>
            <li><b>Enchanter sans parchemin de protection détruit l&apos;objet</b> (Sprotect, Sprotect Ultime, Gprotect). Et forger une arme unique n&apos;a aucune protection : en cas d&apos;échec, tout ce qu&apos;on a mis dedans est perdu.</li>
            <li><b>Retirer un perçage enlève la carte du bas — la dernière posée — et coûte un million de penyas.</b> Pose donc en dernier la carte dont tu es le moins sûr.</li>
            <li><b>Un objet ne porte qu&apos;un élément</b>, et une arme unique ne s&apos;enchante pas. Supprimer un enchantement coûte 100 000 penyas, éveiller un objet aussi.</li>
            <li><b>Le VIP donne</b> toutes stats +25, penyas +5 %, une entrée journalière de plus et −20 % de temps d&apos;attente sur les instances. À peser contre ce que tu comptes réellement jouer dans la semaine.</li>
            <li><b>Un seul marchand hors ligne à la fois</b>, tous les emplacements ne conviennent pas, on le retire par un clic droit sur son icône de buff — et les objets non vendus reviennent par la poste, pas dans l&apos;inventaire.</li>
          </ul>
        </div>

        {/* Il n'y a pas encore d'entree de navigation vers l'espace reserve (le
            fichier de nav n'est pas a moi). Ce renvoi la remplace : sans lui, la
            page de guilde n'existe pour personne. Il ne dit RIEN de son contenu —
            un visiteur non connecte tombe sur la porte, c'est tout. */}
        <div className="gd-renvoi">
          <Icon name="lock" size={15} style={{ color: "var(--orange)", flexShrink: 0 }} />
          <span>
            Tu es de Vanguard ? Il y a une seconde page d&apos;astuces, réservée aux membres :
            ce qu&apos;on a relevé dans les fichiers du jeu sur les améliorations et l&apos;arène,
            et qui n&apos;a pas vocation à circuler. <a href="/astuces-guilde">Astuces de guilde →</a>
          </span>
        </div>

        <div className="gd-foot">N&apos;hésitez pas pour la suite à aller en vocal, sinon sur le Wiki du serveur !<br />Votre dévoué Sugot.</div>
      </div>

      <style>{`
        .gd { line-height:1.6; color:var(--text); }
        .gd h2, .gd h3, .gd h4 { font-family:'Rubik',sans-serif; margin:0; font-weight:700; }
        .gd p { margin:0; }
        .gd b { color:var(--text); }
        .gd-card { background:var(--bg-2); border:1px solid var(--border); border-radius:14px; padding:24px; margin-bottom:20px; }
        .gd-cardtitle { font-size:20px; text-transform:uppercase; letter-spacing:1px; color:var(--orange); margin-bottom:14px; display:flex; align-items:center; gap:10px; }
        .gd-author { display:flex; align-items:center; gap:14px; margin-bottom:18px; padding-bottom:16px; border-bottom:1px solid var(--border); }
        .gd-author .av { width:48px; height:48px; border-radius:50%; background:var(--bg-4); display:flex; align-items:center; justify-content:center; font-size:24px; border:1px solid var(--orange); flex-shrink:0; }
        .gd-author .n { font-family:'Rubik',sans-serif; font-weight:700; font-size:16px; }
        .gd-author .r { font-size:12px; color:var(--orange); }
        .gd-intro { font-size:14px; color:var(--text); }
        .gd-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:10px; }
        .gd-qitem { display:flex; justify-content:space-between; align-items:center; background:var(--bg-3); border:1px solid var(--border); border-radius:8px; padding:10px 14px; }
        .gd-qitem .ql { font-size:13px; color:var(--text-muted); }
        .gd-qitem .qv { font-family:'Rubik',sans-serif; font-weight:700; color:var(--gold); font-size:16px; }
        .gd-phead { color:var(--orange); text-transform:uppercase; letter-spacing:1px; margin:24px 0 14px; font-size:20px; }
        .gd-prestige { background:var(--bg-2); border:1px solid var(--border); border-radius:14px; margin-bottom:16px; overflow:hidden; }
        .gd-head { padding:16px 20px; display:flex; align-items:center; gap:14px; cursor:pointer; background:linear-gradient(90deg, rgba(255,140,26,.08), transparent); border-left:3px solid var(--orange); transition:background .15s; }
        .gd-head:hover { background:linear-gradient(90deg, rgba(255,140,26,.14), transparent); }
        .gd-badge { width:44px; height:44px; border-radius:10px; background:var(--bg-4); display:flex; align-items:center; justify-content:center; font-family:'Rubik',sans-serif; font-weight:700; color:var(--gold); font-size:18px; flex-shrink:0; border:1px solid var(--gold); }
        .gd-pt { flex:1; }
        .gd-head h3 { font-size:18px; }
        .gd-ps { font-size:12px; color:var(--text-muted); margin-top:2px; }
        .gd-arrow { color:var(--text-muted); transition:transform .25s; font-size:13px; }
        .gd-prestige.open .gd-arrow { transform:rotate(90deg); }
        .gd-body { padding:0 20px; max-height:0; overflow:hidden; transition:max-height .35s ease, padding .35s ease; }
        .gd-prestige.open .gd-body { padding:16px 20px 20px; max-height:4000px; }
        .gd-tip { background:var(--bg-3); border-radius:10px; padding:14px 16px; margin-bottom:10px; border-left:2px solid var(--orange-dark); }
        .gd-tip h4 { font-size:15px; color:var(--orange); margin-bottom:6px; display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
        .gd-tip p { font-size:13.5px; color:var(--text); }
        .gd-prio { display:inline-block; font-size:11px; text-transform:uppercase; letter-spacing:1px; padding:2px 8px; border-radius:4px; background:rgba(248,113,113,.18); color:var(--red); font-weight:600; }
        .gd-note { background:rgba(255,140,26,.06); border:1px solid var(--orange-dark); border-radius:8px; padding:12px 14px; font-size:13.5px; margin-top:10px; }
        .gd-foot { text-align:center; color:var(--text-muted); font-size:13px; padding:20px; font-style:italic; }
        /* Un donjon cité mène a sa fiche ; un objet montre son icône. */
        .gd-lien { display:inline-flex; align-items:center; gap:5px; color:var(--orange); text-decoration:none; border-bottom:1px dotted currentColor; font-weight:600; }
        .gd-lien:hover { color:var(--text); }
        .gd-objet { display:inline-flex; align-items:center; gap:6px; min-width:0; }
        .gd-objet img { width:16px; height:16px; object-fit:contain; flex-shrink:0; }
        .gd-recettes { display:grid; gap:10px; }
        .gd-recette { background:var(--bg-3); border-radius:10px; padding:13px 15px; border-left:2px solid var(--orange-dark); }
        .gd-recette h4 { font-size:14.5px; color:var(--orange); margin-bottom:7px; }
        .gd-recette ul { margin:0; padding-left:18px; font-size:13px; line-height:1.7; }
        .gd-src { font-size:12px; color:var(--text-muted); margin-top:7px; line-height:1.55; }
        /* « Cet objet · ou le trouver » : une seule colonne, l'objet a gauche,
           le ou les lieux a droite, et tout se replie proprement sur telephone. */
        .gd-liste { display:grid; gap:8px; }
        .gd-ou { display:flex; align-items:center; gap:12px; flex-wrap:wrap; background:var(--bg-3);
                 border-radius:9px; padding:10px 14px; border-left:2px solid var(--orange-dark); min-width:0; }
        .gd-ou .quoi { display:inline-flex; align-items:center; gap:7px; font-size:13.5px; font-weight:600;
                       flex:1 1 200px; min-width:0; }
        .gd-ou .ou { display:inline-flex; align-items:center; gap:8px; flex-wrap:wrap; min-width:0;
                     font-size:12.5px; color:var(--text-muted); }
        .gd-ou .ou > svg { flex-shrink:0; opacity:.55; }
        .gd-ou .lieu { display:inline-flex; }
        /* Les deux familles de cartes, cote a cote : c'est leur mise en regard
           qui fait comprendre qu'il y en a deux, mieux qu'une phrase. */
        .gd-perc { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,250px),1fr)); gap:16px; }
        .gd-perctitre { font-size:11px; text-transform:uppercase; letter-spacing:1.2px; color:var(--orange);
          font-family:'Rubik',sans-serif; font-weight:700; margin-bottom:9px; }
        .gd-perclist { display:grid; gap:6px; }
        .gd-percel { display:flex; align-items:center; gap:9px; padding:6px 9px; border-radius:9px;
          background:var(--bg-3); border:1px solid var(--border); }
        .gd-percel img { width:26px; height:26px; object-fit:contain; flex-shrink:0; }
        .gd-percel span { display:flex; flex-direction:column; min-width:0; }
        .gd-percel b { font-size:12.5px; }
        .gd-percel i { font-style:normal; font-size:11.5px; color:var(--text-muted); }
        .gd-percgr { margin-top:9px; font-size:11.5px; color:var(--text-muted); }
        .gd-percgr span { display:inline-block; font-weight:700; color:var(--gold); border:1px solid var(--gold);
          border-radius:6px; padding:0 7px; margin:0 2px; }
        /* La roue des elements : cinq lignes qui se mettent en colonnes quand la
           place le permet. Le « bat » en vert et le « craint » en rouge portent
           l'information a eux seuls — on peut lire la roue sans lire les mots. */
        .gd-roue { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,215px),1fr)); gap:8px; margin-top:14px; }
        .gd-roue-el { display:flex; align-items:center; gap:10px; padding:8px 11px; border-radius:9px;
          background:var(--bg-3); border:1px solid var(--border); }
        .gd-roue-el img { width:28px; height:28px; object-fit:contain; flex-shrink:0; image-rendering:pixelated; }
        .gd-roue-txt { display:flex; flex-direction:column; min-width:0; }
        .gd-roue-txt b { font-size:13px; }
        .gd-roue-txt i { font-style:normal; font-size:11.5px; display:flex; gap:9px; flex-wrap:wrap; }
        .gd-roue-txt .bat { color:var(--green); }
        .gd-roue-txt .craint { color:var(--red); }
        /* Les phrases de boss : l'orbe du jeu a gauche, la traduction a droite.
           C'est volontairement la meme forme que .gd-ou — un lecteur qui a
           compris l'une comprend l'autre sans effort. */
        .gd-boss { display:flex; align-items:flex-start; gap:11px; background:var(--bg-3);
          border-radius:9px; padding:10px 14px; border-left:2px solid var(--orange-dark); }
        .gd-boss-ic { width:22px; display:flex; align-items:center; justify-content:center; flex-shrink:0; padding-top:1px; }
        .gd-boss-ic img { width:20px; height:20px; object-fit:contain; }
        .gd-boss-txt { display:flex; flex-direction:column; gap:2px; min-width:0; }
        .gd-boss-txt b { font-size:13.5px; color:var(--gold); }
        .gd-boss-txt i { font-style:normal; font-size:13px; color:var(--text); line-height:1.5; }
        /* Trois chiffres, et c'est tout le sujet : ils doivent se lire d'un coup
           d'oeil, donc gros et alignes (tabular-nums, sinon le ×1 flotte). */
        .gd-taux { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,150px),1fr)); gap:10px; }
        .gd-taux > div { background:var(--bg-3); border:1px solid var(--border); border-radius:10px;
          padding:13px 14px; display:flex; flex-direction:column; gap:3px; }
        .gd-taux .tv { font-family:'Rubik',sans-serif; font-weight:700; font-size:26px; color:var(--gold);
          font-variant-numeric:tabular-nums; line-height:1; }
        .gd-taux .tl { font-size:12px; color:var(--text-muted); }
        .gd-regles { margin:0; padding-left:19px; display:grid; gap:9px; font-size:13.5px; }
        .gd-regles li { line-height:1.6; }
        .gd-regles code { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:12.5px;
          background:var(--bg-4); border:1px solid var(--border); border-radius:5px; padding:1px 5px; color:var(--orange); }
        /* Le renvoi vers l'espace reserve : visible sans etre une reclame. */
        .gd-renvoi { display:flex; align-items:flex-start; gap:10px; background:var(--bg-2);
          border:1px dashed var(--orange-dark); border-radius:12px; padding:14px 16px;
          font-size:13px; color:var(--text-muted); margin-bottom:20px; }
        .gd-renvoi a { color:var(--orange); text-decoration:none; font-weight:600; white-space:nowrap; }
        .gd-renvoi a:hover { color:var(--text); }
        /* Les liens d'instance faisaient 21 px de haut : on les rate au doigt.
           On ne grossit pas le texte — la ligne deviendrait un pave — on ouvre
           la zone sensible autour, sans decaler la mise en page. */
        @media (pointer:coarse){
          .gd-ou .lieu a, .gd-ou .lieu { position:relative; }
          .gd-ou .lieu a::before { content:""; position:absolute; left:0; right:0; top:50%;
            transform:translateY(-50%); height:44px; }
        }
      `}</style>
    </div>
  );
}
