"use client";
import { Suspense, useRef } from "react";
import Link from "next/link";
import { HeroFlyff } from "@/components/HeroFlyff";
import { Icon, type IconName } from "@/components/Icon";
import { useReveal, useCardFx } from "@/components/VgFx";
import { AvisAcces } from "@/components/accueil/AvisAcces";
import { BandeauCartes } from "@/components/accueil/BandeauCartes";
import { ClassesHeros } from "@/components/accueil/ClassesHeros";
import { avecComptes, PORTES_PUBLIQUES, PortesSite } from "@/components/accueil/PortesSite";
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

export function PageAccueil({ chiffres, comptes = {} }: {
  chiffres: ChiffreAccueil[];
  /**
   * Ce que pèse chaque porte, compté côté serveur et posé sur la ligne vide de la
   * porte (voir `comptesPortes` et `avecComptes`). Facultatif : sans lui, les
   * portes s'affichent sans mesure, comme avant.
   */
  comptes?: Record<string, string>;
}) {
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
            {/* CE PARAGRAPHE EST PASSÉ DE 55 MOTS À 24, et il dit la même chose.
                Ce qui est parti : « pas d'un forum recopié » (une pique, pas un
                fait) et l'énumération « tes persos, tes builds, tes commandes »,
                que les douze portes juste dessous montrent une par une — avec leur
                cadenas. Ce qui reste est ce qu'un visiteur doit savoir en trois
                secondes : d'où viennent les données, et qu'il n'a pas besoin de
                compte pour les lire. */}
            {/* L'ÉNUMÉRATION D'OUVERTURE EST PARTIE — « Instances, monstres, objets,
                paliers de prestige ». Ces quatre mots étaient un sommaire du bloc « Ce que
                le site fait », qui est sur la même page et qui les DÉTAILLE un par un, avec
                leur compte et leur cadenas : treize portes, dont quatre nommées exactement
                comme ces quatre mots. Annoncer une liste juste avant de la montrer est du
                remplissage — ce qui reste est le seul fait que ce paragraphe est seul à
                porter : d'où viennent les données, et qu'on entre sans compte. */}
            <p style={{ margin: 0, maxWidth: 620, fontSize: 15, lineHeight: 1.75, color: "#d9d9e2" }}>
              Tout est lu dans les fichiers du client d&apos;AirFlyff, et{" "}
              <b style={{ color: "var(--orange)" }}>ça se consulte sans compte</b> — Discord
              ne garde que ce qui t&apos;appartient.
            </p>
            {/* LA « LIMITE HONNÊTE » A ÉTÉ RETIRÉE, et c'est une mise en cohérence,
                pas un oubli : ce même avertissement — le butin ordinaire des
                monstres est calculé par le serveur, donc absent du client — avait
                déjà été retiré de /astuces et de OuTrouver.tsx (voir la note de
                guides/aDeplacer.ts). Il n'existait que pour excuser l'absence d'un
                TAUX, et les taux ne se montrent plus : il n'a plus rien à excuser.
                Il ne changeait par ailleurs aucun geste — c'était un constat
                d'ignorance, exactement ce que la règle écarte. */}
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
          Compétences, paliers et coûts : sur <Link href="/classes" className="acc-lien-t">la page des classes</Link>.
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
            était sérieuse : les adresses sous cadenas sont gardées par la
            liste de rôles de la guilde, qui exclut RECRUE. Un joueur qui se
            connecte sans être de la guilde est renvoyé sur `/?error=guild` — donc
            par la porte qu'on venait de lui promettre. Ce qui les ouvre, c'est
            d'être MEMBRE, et c'est ce que la phrase dit maintenant. */}
        <p className="vg-reveal" style={{ fontFamily: "'Alef',sans-serif", color: "var(--text-muted)", fontSize: 14, margin: "10px 0 18px", letterSpacing: ".2px", maxWidth: 720 }}>
          {NB_PORTES - NB_VERROU} ouvertes sans compte, {NB_VERROU} réservées aux membres.
        </p>
        <PortesSite portes={avecComptes(PORTES_PUBLIQUES, comptes)} />

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
          {/* LA CONDITION FERME A ÉTÉ RETIRÉE D'ICI, et c'était sa TROISIÈME
              apparition sur ce seul écran : le hero l'annonce en haut de page
              (« Discord et vocal obligatoires »), et /histoire — propriétaire des
              règles de la guilde — la repose juste avant le bouton Postuler. Le
              lien « La guilde et ses règles » est à deux centimètres. */}
          <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "0 auto 22px", maxWidth: 560, lineHeight: 1.7 }}>
            Lis ce qu&apos;on attend, puis présente-nous tes personnages.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/candidature" className="vg-btn"><Icon name="clipboard" size={17} /> Postuler</Link>
            <Link href="/histoire" className="acc-lien-2"><Icon name="book" size={16} /> La guilde et ses règles</Link>
          </div>
          </div>
        </div>
      </div>

      {/* ── POURQUOI CETTE CSS EST ÉCRITE COMME ÇA ──
          Ces notes étaient DANS le littéral ci-dessous, donc dans le `<style>`
          envoyé au navigateur : 880 mots de raisonnement téléchargés par chaque
          visiteur de la page d'accueil, sur les 2 010 que la page servait. Sorties
          d'ici elles sont effacées à la compilation, et le piège de l'accent grave
          qui referme le gabarit part avec elles.

          .acc-join — overflow:hidden sur le bloc : l'illustration fait 1 400 px de
          large et déborderait des coins arrondis ; c'est la PAGE qui gagnerait une
          barre horizontale, donc tout le site se décalerait sur mobile (déjà payé
          sur la frise de cartes du bandeau).

          .acc-join-art — LE CADRAGE EST CALCULÉ, pas choisi à l'œil, parce qu'il
          décide si le nom du serveur est dans l'image ou coupé. L'illustration fait
          1 400x785 ; à la largeur du bloc (976 px) elle ferait 547 px de haut, la
          moitié d'un écran. On en garde 300, donc 247 px de jeu vertical.
          object-position à 72 % donnait un décalage de 178 px, soit la bande source
          32-87 % : le mot AIRFLYFF (vers 78-91 % de la hauteur) était coupé en deux
          et le ruban de la devise passait dessous — alors que c'est exactement ce
          que le texte de remplacement annonce. Calé EN BAS, le décalage vaut 247 px
          et la bande visible court de 45 % à 100 % : le nom tombe au tiers bas du
          cadre, les quatre aventuriers dans le haut, et il reste 50 px de prairie
          sous le ruban pour le raccord.

          .acc-join::after — le dégradé de raccord est un calque à part, posé SUR
          l'image : en background du conteneur il serait passé DERRIÈRE elle. 60 px
          et non 130, et il n'atteint l'opacité pleine qu'au dernier pixel :
          l'ancien couvrait le tiers bas à 82 %, c'est-à-dire pile la bande où le nom
          du serveur se trouve. Il n'éteint plus que la prairie. En étroit l'image
          est déjà presque entière dans le cadre (224 px de haut à 400 px de large),
          donc le raccord se contente de 45 px — le même calcul, à l'échelle.

          .acc-lien-t — un lien AU FIL DU TEXTE, pas un bouton : dans un paragraphe,
          .acc-lien-2 se serait posé comme un pavé au milieu de la phrase.

          Le repli à 640 px rend sa marge à la page : les 32 px du conteneur ne
          laissaient que 296 px de contenu sur un écran de 360, et les cartes de
          classe en demandent 215 minimum — la grille tentait deux colonnes et
          débordait. */}
      <style>{`
        .acc-wrap{max-width:1040px;margin:0 auto;padding:0 32px}
        .acc-join{position:relative;overflow:hidden;margin-top:46px;border-radius:16px;text-align:center;
          border:1px solid var(--orange-dark);background:#08080b}
        .acc-join-art{display:block;width:100%;height:300px;object-fit:cover;object-position:center bottom}
        .acc-join::after{content:"";position:absolute;left:0;right:0;top:240px;height:60px;pointer-events:none;
          background:linear-gradient(180deg,transparent,#08080b)}
        .acc-join-in{position:relative;z-index:1;padding:30px 28px 34px;
          background:radial-gradient(circle at 50% 0%, rgba(255,140,26,.13), transparent 68%)}
        @media(max-width:640px){.acc-join-art{height:190px}.acc-join::after{top:145px;height:45px}}
        .acc-lien-2{display:inline-flex;align-items:center;gap:8px;padding:11px 22px;border-radius:10px;
          font-family:'Rubik',sans-serif;font-weight:600;text-transform:uppercase;letter-spacing:1px;font-size:13px;
          text-decoration:none;color:var(--text);background:var(--bg-3);border:1px solid var(--border)}
        .acc-lien-2:hover{border-color:rgba(255,140,26,.45);color:var(--orange)}
        .acc-lien-t{color:var(--orange);text-decoration:none;font-weight:600;border-bottom:1px dotted currentColor}
        .acc-lien-t:hover{color:var(--text)}
        @media(max-width:640px){.acc-wrap{padding:0 16px}}
      `}</style>
    </div>
  );
}
