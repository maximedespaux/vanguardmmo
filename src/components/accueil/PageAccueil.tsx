"use client";
import { Suspense, useRef } from "react";
import Link from "next/link";
import { HeroFlyff } from "@/components/HeroFlyff";
import { Icon, type IconName } from "@/components/Icon";
import { useReveal, useCardFx } from "@/components/VgFx";
import { AvisAcces } from "@/components/accueil/AvisAcces";
import { BandeauCartes } from "@/components/accueil/BandeauCartes";
import { ClassesHeros } from "@/components/accueil/ClassesHeros";
import { PORTES_PUBLIQUES, PortesSite } from "@/components/accueil/PortesSite";
// `import type` et rien d'autre : `chiffres.ts` lit le disque avec `fs`, et ce
// fichier-ci est un composant client. Un import de type est effacé à la
// compilation — le module serveur ne suit donc jamais jusqu'au navigateur.
import type { ChiffreAccueil } from "@/components/accueil/chiffres";

/**
 * L'accueil du site.
 *
 * Il n'existait pas : `/` renvoyait directement sur `/histoire`, la page qui
 * raconte la guilde. Deux ennuis de cette redirection, que cette page corrige.
 * D'abord la première impression ne montrait rien du JEU alors qu'on dispose
 * maintenant de son imagerie officielle. Ensuite le `?error=` posé par le
 * middleware quand une page se refuse partait à la poubelle avec la redirection.
 *
 * Elle ne remplace pas `/histoire` et n'en recopie rien : ici c'est AirFlyff et
 * ce que le site en sait ; là-bas c'est qui on est et ce qu'on attend. Le lien y
 * mène, deux fois.
 *
 * Elle est PUBLIQUE : aucune donnée de session, aucun compteur de membres, aucun
 * nom de joueur. Tout ce qu'elle affiche est soit un fichier du client du jeu,
 * soit un chiffre lisible dans les données déjà versées au dépôt.
 */

/**
 * L'icône de chaque chiffre. Les chiffres eux-mêmes ne sont plus ici : ils
 * étaient écrits à la main (« 8 », « 23 », « 4 970 », « 52 ») et se seraient
 * démentis au premier versement de données. Ils sont désormais COMPTÉS côté
 * serveur et arrivent en props — voir `components/accueil/chiffres.ts`.
 *
 * La correspondance se fait sur le début du libellé, et le repli est prévu : un
 * libellé qu'on n'aurait pas prévu prend une icône neutre plutôt que de faire
 * disparaître sa carte.
 */
const ICONE_CHIFFRE: [string, IconName][] = [
  ["spécialisations", "users"],
  ["instances", "skull"],
  ["objets", "package"],
  ["vagues", "tower"],
];
const iconeDe = (libelle: string): IconName =>
  ICONE_CHIFFRE.find(([d]) => libelle.startsWith(d))?.[1] ?? "sparkles";

/** Les 20 logos de cape que le jeu propose aux guildes (24×24 dans le client). */
const CAPES = Array.from({ length: 20 }, (_, i) => `cape-logo-${String(i + 1).padStart(2, "0")}.webp`);

/**
 * Combien de portes, et combien sous cadenas — COMPTÉ sur la liste, jamais écrit.
 *
 * La phrase d'introduction des portes annonce ces deux nombres. Les taper à la
 * main les rendrait faux à la première porte ajoutée, et c'est exactement le
 * défaut que le site a déjà payé trois fois (« trente-sept classes », un total de
 * prestige recopié, un classement coupé à 60 sous un compteur annonçant 94).
 */
const NB_PORTES = PORTES_PUBLIQUES.length;
const NB_VERROU = PORTES_PUBLIQUES.filter((p) => p.verrou).length;

export function PageAccueil({ chiffres }: { chiffres: ChiffreAccueil[] }) {
  const ref = useRef<HTMLDivElement>(null);
  // Révélation au défilement, avec le repli de useReveal : sans lui, un élément
  // raté par l'observateur reste invisible pour de bon.
  useReveal(ref);
  // Halo au curseur sur les .fx-card (cartes de classe et portes).
  useCardFx();

  return (
    <div ref={ref} style={{ paddingBottom: 64 }}>
      <HeroFlyff />

      <div className="acc-wrap">
        {/* useSearchParams force le rendu dynamique s'il n'est pas isolé : sous
            Suspense, le reste de l'accueil reste prérendu en statique. */}
        <Suspense fallback={null}><AvisAcces /></Suspense>

        {/* ── Le jeu, avec ses propres images en fond ── */}
        <BandeauCartes>
          <div className="vg-reveal">
            <div className="font-heading" style={{ fontSize: 13, letterSpacing: 2.4, textTransform: "uppercase", color: "var(--orange)" }}>
              Serveur privé AirFlyff
            </div>
            <h2 className="font-heading" style={{ fontSize: "clamp(22px,3.4vw,30px)", margin: "8px 0 12px", letterSpacing: .5 }}>
              On a ouvert le jeu, et on a tout mis ici
            </h2>
            <p style={{ margin: 0, maxWidth: 620, fontSize: 15, lineHeight: 1.75, color: "#d9d9e2" }}>
              Les instances, leurs butins, la provenance de chaque objet, le coût des paliers de prestige :
              tout vient des fichiers du client d&apos;AirFlyff, pas d&apos;un forum recopié.
              Tu peux <b style={{ color: "var(--orange)" }}>tout consulter sans compte</b> — la connexion Discord
              ne sert qu&apos;à ce qui t&apos;appartient : tes persos, tes builds, tes commandes.
            </p>
            {/* Une réserve qu'on ne cache pas : le butin ordinaire des monstres est
                calculé par le serveur, il n'est pas dans le client. Ne pas le dire
                laisserait croire qu'une absence de source veut dire « ça ne tombe pas ». */}
            <p style={{ margin: "12px 0 0", maxWidth: 620, fontSize: 12.5, lineHeight: 1.6, color: "var(--text-muted)", fontFamily: "'Alef',sans-serif" }}>
              Une limite honnête : le butin ordinaire des monstres est calculé par le serveur et n&apos;est pas
              dans le client. Quand une source manque, ça ne veut pas dire que l&apos;objet ne tombe pas.
            </p>
          </div>
        </BandeauCartes>

        <div className="vg-reveal" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12, marginTop: 14 }}>
          {chiffres.map((c) => (
            <div key={c.libelle} className="fx-stat fx-card">
              <span style={{
                width: 40, height: 40, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: 12, color: "var(--orange)", border: "1px solid rgba(255,140,26,.32)",
                background: "linear-gradient(180deg,rgba(255,140,26,.22),rgba(255,140,26,.05))",
              }}>
                <Icon name={iconeDe(c.libelle)} size={19} />
              </span>
              <div>
                {/* tabular-nums : « 4 970 » et « 8 » côte à côte sautaient d'un pixel
                    au survol quand les chiffres n'ont pas la même largeur. */}
                <div className="n" style={{ fontVariantNumeric: "tabular-nums" }}>{c.n.toLocaleString("fr-FR")}</div>
                <div className="l">{c.libelle}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Les huit classes, avec l'emblème du jeu ── */}
        <h2 className="font-heading vg-reveal" style={{ fontSize: 24, textTransform: "uppercase", letterSpacing: 1, margin: "46px 0 4px", display: "flex", alignItems: "center", gap: 12 }}>
          <Icon name="swords" framed frameSize={34} tone="orange" /> <span className="vg-h2">Les huit fins de partie</span>
        </h2>
        {/* LE DOUBLON DES HUIT CLASSES, tranché en deux passes — voici la seconde.
            La première avait retiré la CLASSE D'ORIGINE de chaque carte : /classes
            la dessine dans la chaîne de promotion, avec les paliers et leurs coûts.
            Restait le symptôme : cet écran menait DIX FOIS à /classes — les huit
            cartes, un lien au fil du texte, et un bouton dessous — et introduisait
            les emblèmes par deux phrases dont la première ne faisait que décrire
            des images déjà sous les yeux.
            L'accueil donne l'envie et LA porte : les cartes sont la porte, une
            ligne dit où est le détail, et le bouton qui répétait la même
            destination est parti. L'ARME reste — c'est le seul endroit du site qui
            dise avec quoi une classe se bat (la seule pastille d'arme de /classes
            est celle d'une compétence LÉGENDAIRE, donc autre chose ; cf.
            ClassesHeros). */}
        {/* « Leur emblème de héros, et l'arme qu'elles portent » a sauté : les huit
            cartes MONTRENT l'emblème et ÉCRIVENT l'arme, juste dessous. Décrire ce
            qui est déjà sous les yeux est le pire des remplissages. */}
        <p className="vg-reveal" style={{ fontFamily: "'Alef',sans-serif", color: "var(--text-muted)", fontSize: 14, margin: "10px 0 18px", letterSpacing: ".2px", maxWidth: 720 }}>
          Ce qu&apos;elles apprennent, ce que ça coûte et par quels paliers on y arrive :
          sur <Link href="/classes" className="acc-lien-t">la page des classes</Link>.
        </p>
        <ClassesHeros />

        {/* ── Ce que le site fait ──
            Ce bloc s'appelait « Par où commencer » et montrait quatre portes
            ouvertes. Il répond maintenant à la question de fond de la vitrine :
            qu'est-ce que ce site sait faire, et qu'est-ce qui s'ouvre en se
            connectant. Les huit cartes « fonctionnalités » de /histoire ont été
            rapatriées ici — voir la note de PORTES_PUBLIQUES. */}
        <h2 className="font-heading vg-reveal" style={{ fontSize: 24, textTransform: "uppercase", letterSpacing: 1, margin: "46px 0 4px", display: "flex", alignItems: "center", gap: 12 }}>
          <Icon name="compass-rose" framed frameSize={34} tone="orange" /> <span className="vg-h2">Ce que le site fait</span>
        </h2>
        {/* Les deux nombres restent COMPTÉS, la phrase autour a maigri : le cadenas
            est dessiné sur chacune des portes concernées et dit déjà « membres ».
            « s'ouvrent en te connectant avec Discord » ÉTAIT FAUX et la promesse
            était sérieuse : les trois adresses sous cadenas sont dans
            GUILD_PREFIXES, dont la liste de rôles exclut RECRUE. Un joueur qui se
            connecte sans être de la guilde est renvoyé sur `/?error=guild` — donc
            par la porte qu'on venait de lui promettre. Ce qui les ouvre, c'est
            d'être MEMBRE, et c'est ce que la phrase dit maintenant. */}
        <p className="vg-reveal" style={{ fontFamily: "'Alef',sans-serif", color: "var(--text-muted)", fontSize: 14, margin: "10px 0 18px", letterSpacing: ".2px", maxWidth: 720 }}>
          {NB_PORTES - NB_VERROU} ouvertes sans compte. Les {NB_VERROU} autres sont réservées aux membres de la guilde.
        </p>
        <PortesSite />

        {/* ── Rejoindre ── */}
        <div className="vg-reveal acc-join">
          {/* L'ILLUSTRATION OFFICIELLE D'AIRFLYFF — `accueil/login_screen_01.webp`,
              l'écran de connexion du serveur.
              C'est la seule des sept images de `public/jeu/accueil/` qui soit
              exploitable telle quelle, et elle vaut la place : elle porte le NOM du
              serveur et sa devise, peinte par AirFlyff et non reprise de l'éditeur —
              aucun logo Gala, aucune barre de chargement, aucun avertissement d'âge
              incrusté (les six autres en portent, voir le compte rendu). Sur la page
              qui doit donner envie de rejoindre, c'est l'image la plus utile du dépôt.
              Elle a un vrai `alt` et non `alt=""` : elle n'est pas décorative ici,
              c'est l'identité du serveur dont parle tout le paragraphe.
              Le recadrage est calculé, pas approximatif : `object-position` à 72 %
              garde la devise et les quatre aventuriers du bas de l'image, que le
              cadrage centré coupait. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="acc-join-art"
            src="/jeu/accueil/login_screen_01.webp"
            alt="L'illustration officielle d'AirFlyff : quatre aventuriers face à un colosse de pierre en flammes, sous la devise du serveur « L'air se raréfie »."
            width={1400}
            height={785}
            loading="lazy"
            decoding="async"
          />
          <div className="acc-join-in">
          {/* Les logos de cape du jeu : la seule image que le client donne d'une
              GUILDE. Purement décoratifs, donc masqués aux lecteurs d'écran, et
              enfermés dans un conteneur qui coupe le dépassement. */}
          {/* 20 logos de 24 px + 8 px d'écart = 640 px : à 480 la frise cassait en
              15 + 5, ce qui ressemblait à un oubli plutôt qu'à une frise. */}
          <div aria-hidden="true" style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap", maxWidth: 660, margin: "0 auto 22px", opacity: .55 }}>
            {CAPES.map((c) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={c} src={`/jeu/mecaniques/${c}`} alt="" width={24} height={24} loading="lazy" style={{ imageRendering: "pixelated" }} />
            ))}
          </div>
          <div className="font-heading" style={{ fontSize: 22, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
            Vanguard, c&apos;est une de ces capes
          </div>
          {/* Ce paragraphe s'ouvrait sur « Peu de membres, mais présents. Discord et
              vocal obligatoires » — les mots EXACTS du hero de la même page, deux
              écrans plus haut (voir HeroFlyff). Un lecteur qui retombe sur la phrase
              qu'il vient de lire croit s'être perdu : elle part.
              CE QUI L'AVAIT REMPLACÉE EST PARTI AUSSI — « pas de niveau minimum, pas
              de quota de présence ». Aucune page, aucune donnée du dépôt ne dit ça
              (vérifié : le mot « quota » n'apparaît nulle part ailleurs). C'était
              une RÈGLE DE GUILDE inventée, écrite sur la page qui doit donner envie
              de postuler, donc lue comme un engagement — et seul Maxime peut le
              prendre. Reste ce que le site tient vraiment : la condition ferme, et
              l'invitation à lire les règles avant de postuler. */}
          <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "0 auto 22px", maxWidth: 560, lineHeight: 1.7 }}>
            Une seule condition ferme : être joignable en vocal.
            Lis d&apos;abord ce qu&apos;on attend, puis présente-nous tes personnages.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/candidature" className="vg-btn"><Icon name="clipboard" size={17} /> Postuler</Link>
            <Link href="/histoire" className="acc-lien-2"><Icon name="book" size={16} /> La guilde et ses règles</Link>
          </div>
          </div>
        </div>
      </div>

      <style>{`
        .acc-wrap{max-width:1040px;margin:0 auto;padding:0 32px}
        /* LE BLOC « REJOINDRE » ET SON ILLUSTRATION.
           overflow:hidden sur le bloc : l'image fait 1400 px de large et deborderait
           des coins arrondis — et c'est la PAGE qui gagnerait une barre horizontale,
           donc tout le site se decalerait sur mobile (deja paye sur la frise de
           cartes du bandeau). */
        .acc-join{position:relative;overflow:hidden;margin-top:46px;border-radius:16px;text-align:center;
          border:1px solid var(--orange-dark);background:#08080b}
        /* LE CADRAGE, CALCULE — pas choisi a l'oeil, parce qu'il decide si le nom du
           serveur est dans l'image ou coupe.
           L'illustration fait 1400x785. A la largeur du bloc (976 px) elle ferait
           547 px de haut : la moitie d'un ecran pour une image. On en garde 300, donc
           247 px de jeu vertical.
           object-position a 72 % donnait un decalage de 178 px, soit la bande source
           32-87 % : le mot AIRFLYFF (vers 78-91 % de la hauteur) etait coupe en deux
           et le ruban de la devise passait entierement dessous — alors que c'est
           exactement ce que le texte de remplacement de l'image annonce.
           Cale EN BAS, le decalage vaut 247 px et la bande visible court de 45 % a
           100 % : le nom tombe au tiers bas du cadre (y 180-251 sur 300), les quatre
           aventuriers dans le haut, et il reste 50 px de prairie sous le ruban pour
           le raccord. */
        .acc-join-art{display:block;width:100%;height:300px;object-fit:cover;object-position:center bottom}
        /* Le degrade de raccord est un calque a part, pose SUR l'image : en
           background du conteneur il serait passe DERRIERE elle.
           60 px et non 130, et il n'atteint l'opacite pleine qu'au dernier pixel :
           l'ancien couvrait le tiers bas de l'image a 82 %, c'est-a-dire pile la
           bande ou le nom du serveur se trouve. Il n'eteint plus que la prairie. */
        .acc-join::after{content:"";position:absolute;left:0;right:0;top:240px;height:60px;pointer-events:none;
          background:linear-gradient(180deg,transparent,#08080b)}
        .acc-join-in{position:relative;z-index:1;padding:30px 28px 34px;
          background:radial-gradient(circle at 50% 0%, rgba(255,140,26,.13), transparent 68%)}
        /* En etroit l'image est deja presque entiere dans le cadre (a 400 px de large
           elle ne fait plus que 224 px de haut), donc le raccord se contente de
           45 px — le meme calcul, a l'echelle. */
        @media(max-width:640px){.acc-join-art{height:190px}.acc-join::after{top:145px;height:45px}}
        .acc-lien-2{display:inline-flex;align-items:center;gap:8px;padding:11px 22px;border-radius:10px;
          font-family:'Rubik',sans-serif;font-weight:600;text-transform:uppercase;letter-spacing:1px;font-size:13px;
          text-decoration:none;color:var(--text);background:var(--bg-3);border:1px solid var(--border)}
        .acc-lien-2:hover{border-color:rgba(255,140,26,.45);color:var(--orange)}
        /* Un lien AU FIL DU TEXTE, pas un bouton : dans un paragraphe, .acc-lien-2
           se serait posé comme un pavé au milieu de la phrase. */
        .acc-lien-t{color:var(--orange);text-decoration:none;font-weight:600;border-bottom:1px dotted currentColor}
        .acc-lien-t:hover{color:var(--text)}
        /* Les 32px de marge du conteneur ne laissaient que 296px de contenu sur un
           écran de 360 : les cartes de classe en demandent 215 minimum, la grille
           tentait deux colonnes et débordait. On rend la marge à la page. */
        @media(max-width:640px){.acc-wrap{padding:0 16px}}
      `}</style>
    </div>
  );
}
