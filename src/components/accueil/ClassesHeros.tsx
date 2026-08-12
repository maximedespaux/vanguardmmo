"use client";
import Link from "next/link";
import { CLASSES } from "@/data/classes";

/**
 * Les huit spécialisations de fin de partie, avec l'emblème que le JEU leur donne.
 *
 * L'emblème vient de `data/classes.ts` (champ `embleme`), qui est la source
 * unique du site pour tout ce qui touche aux classes. Le nom de fichier reste
 * quand même écrit ici, en repli : ces deux mappings ont été établis séparément
 * et tombent d'accord, ce qui est le meilleur signe qu'ils sont justes — mais
 * une page d'accueil ne doit pas s'afficher sans emblèmes si le champ bouge.
 *
 * Pourquoi une correspondance est nécessaire : le site nomme ses classes comme on
 * les nomme en vocal (Spadassin, Chanoine…), alors que le client range ses
 * emblèmes sous les codes de métier AirFlyff. Aucun des deux jeux de noms ne se
 * déduit de l'autre — « Primat » ne ressemble pas à « Florist ».
 *
 * Elle n'est pas devinée : chaque code de métier a été relié à sa classe par les
 * ARMURES de `public/data/items.json`, qui portent le nom français (« Bottes de
 * Primat en Yggdrasil » est marquée `JOB_FLORIST_HERO`). Les armes viennent de la
 * même source, filtrées sur ces mêmes codes — c'est ce que le jeu autorise, pas
 * ce qu'on croit se rappeler.
 *
 * Un piège évité : les emblèmes 64×64 sont les seuls fichiers du dossier
 * utilisables tels quels. Les `jobchar*.webp` ressemblent à des icônes mais sont
 * des planches de 216×54 — quatre états d'un même bouton côte à côte. Affichés en
 * carré, on y voit quatre épées écrasées.
 */
type Heros = {
  /** Clé dans CLASSES : c'est elle qui donne le nom affiché et l'emblème. */
  cle: keyof typeof CLASSES | string;
  /** Repli si `CLASSES[cle].embleme` manque — vérifié présent sur le disque. */
  embleme: string;
  /** Ce que le jeu laisse équiper à ce métier (items.json). */
  arme: string;
};

/**
 * LE CHAMP `lignee` A ÉTÉ RETIRÉ, et la raison mérite d'être écrite.
 *
 * Chaque carte affichait « issue de la classe Chevalier ». C'était le doublon de
 * /classes, qui DESSINE la chaîne de promotion entière — Vagabond → Mercenaire →
 * Chevalier → Templier, avec l'emblème et le coût de chaque marche. Une phrase
 * ici, un schéma là-bas, et aucune des deux pages ne citait l'autre. L'accueil
 * garde l'envie et la porte ; le détail appartient à la page qui a les données
 * pour le tenir.
 *
 * Le fait qu'il portait, à ne pas reperdre : les trois classes intermédiaires
 * s'écrivaient d'abord « Jester », « Ring Master » et « Billposter » — les codes
 * anglais du client — alors que /classes et /objets les affichent sous
 * « Baladin », « Meneur » et « Moine ». Ces trois noms français restent la
 * référence du site ; si quelqu'un réintroduit la lignée quelque part, c'est
 * ceux-là qu'il faut écrire, pas les codes du client.
 */
const HEROS: Heros[] = [
  { cle: "Spadassin",   embleme: "jobstormbladehero.webp",    arme: "Épée · Hache" },
  { cle: "Templier",    embleme: "joblordtemplerhero.webp",   arme: "Épée · Hache · Bouclier" },
  { cle: "Arbaletrier", embleme: "jobcrackshooterhero.webp",  arme: "Arbalète" },
  { cle: "Sylphide",    embleme: "jobwindlurkerhero.webp",    arme: "Yo-yo" },
  { cle: "Arcaniste",   embleme: "jobelementorlordhero.webp", arme: "Bâton" },
  { cle: "Envouteur",   embleme: "jobmentalisthero.webp",     arme: "Baguette" },
  { cle: "Primat",      embleme: "jobfloristhero.webp",       arme: "Bâton de soin" },
  { cle: "Chanoine",    embleme: "jobforcemasterhero.webp",   arme: "Poing" },
];

export function ClassesHeros() {
  return (
    <div className="acc-classes">
      {HEROS.map((h, i) => {
        const label = CLASSES[h.cle]?.label ?? h.cle;
        const src = CLASSES[h.cle]?.embleme ?? `/jeu/classes/${h.embleme}`;
        return (
          // La carte entière est le lien. Elle décrivait une classe et ne menait
          // nulle part : pour savoir ce qu'un Primat apprend, il fallait repasser
          // par le menu. Un lecteur obligé de revenir au menu pour suivre une idée
          // est un lecteur perdu en route.
          <Link key={h.cle} href="/classes" className="acc-cl fx-card vg-reveal" style={{ transitionDelay: `${i * 55}ms` }}>
            <span className="acc-cl-halo" aria-hidden="true" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" width={58} height={58} className="acc-cl-em" />
            <div style={{ minWidth: 0 }}>
              <div className="font-heading acc-cl-nom">{label}</div>
              {/* UNE seule ligne, et c'est l'arme.
                  La carte en portait deux, et UNE des deux se retrouvait sur
                  /classes : « issue de la classe Chevalier » y est carrément
                  dessinée — c'est l'avant-dernière marche de la chaîne de promotion,
                  avec son emblème et son coût (composants/classes/Lignee, la chaîne
                  et le tableau des paliers). La généalogie part donc : elle ne se
                  comprend qu'avec la chaîne entière sous les yeux, et là-bas elle
                  l'a.
                  L'ARME, elle, n'est nulle part sur /classes — la seule pastille
                  d'arme de Lignee.tsx est celle d'une compétence LÉGENDAIRE, c'est-
                  à-dire l'arme que ce sort exige, pas ce que la classe équipe. Il
                  n'y a donc pas de doublon à trancher : cette ligne est le seul
                  endroit du site qui dise avec quoi une classe se bat, et c'est
                  aussi ce qui donne envie de cliquer. Elle reste. */}
              <div className="acc-cl-arme">{h.arme}</div>
            </div>
          </Link>
        );
      })}

      <style>{`
        .acc-classes{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(215px,1fr))}
        /* text-decoration et color explicites : la carte est devenue un lien, et
           sans ça les huit noms de classe passaient en bleu souligné. */
        .acc-cl{position:relative;overflow:hidden;display:flex;align-items:center;gap:14px;padding:14px 16px;
          border:1px solid var(--border);border-radius:14px;text-decoration:none;color:var(--text);
          background:linear-gradient(180deg,rgba(28,28,36,.92),rgba(14,14,19,.94));
          transition:border-color .22s,transform .22s,box-shadow .22s,opacity .7s cubic-bezier(.22,.61,.36,1)}
        .acc-cl:hover{border-color:rgba(255,140,26,.42);transform:translateY(-3px);box-shadow:0 12px 30px rgba(0,0,0,.5)}
        /* Le halo est un pseudo-calque à part et non un box-shadow : l'emblème du
           jeu a déjà sa propre lueur, et deux lueurs superposées bavaient. */
        .acc-cl-halo{position:absolute;left:-10px;top:50%;width:120px;height:120px;transform:translateY(-50%);
          pointer-events:none;background:radial-gradient(circle,rgba(255,140,26,.16),transparent 68%);opacity:0;transition:opacity .25s}
        .acc-cl:hover .acc-cl-halo{opacity:1}
        .acc-cl-em{flex-shrink:0;image-rendering:auto;filter:drop-shadow(0 3px 8px rgba(0,0,0,.6))}
        .acc-cl-nom{font-weight:700;font-size:16px;letter-spacing:.3px}
        .acc-cl-arme{color:var(--gold);font-size:12.5px;margin-top:2px}
      `}</style>
    </div>
  );
}
