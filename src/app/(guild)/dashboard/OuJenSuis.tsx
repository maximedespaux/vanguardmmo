"use client";
import Link from "next/link";
import { ClassLogo } from "@/components/ClassLogo";
import { Icon } from "@/components/Icon";
import { pl, type Profil } from "./donnees";

/**
 * OÙ J'EN SUIS — mes personnages, et ce qui leur manque.
 *
 * Le tableau de bord ne parlait que de la guilde. Un membre y trouvait sept cartes
 * de chiffres sur les AUTRES et rien sur lui, alors que c'est sa page d'accueil.
 * Le fichier lit `/api/profil`, la route qui ne rend jamais que le membre connecté.
 *
 * CE QU'IL NE MONTRE PAS, ET POURQUOI — c'est la moitié du travail.
 *
 *   · Ni le pseudo, ni le rang, ni l'avatar. Le panneau du haut-droite
 *     (`ProfilePanel`) les affiche déjà sur TOUTES les pages, celle-ci comprise.
 *     Deux fois la même identité à 200 px d'écart, c'est du bruit.
 *   · Ni « 3 personnages », ni « 5 stuffs », ni « 1 commande en cours ». Ces trois
 *     comptes sont portés par les PORTES du même écran, en ligne de chiffre — les
 *     répéter ici et là ferait douter qu'il s'agisse des mêmes.
 *   · Ni le bilan de service ni les mouvements de périns : /profil en est le
 *     propriétaire, et la porte y mène.
 *
 * Reste ce que rien d'autre ne dit sur cet écran : la LISTE des personnages avec
 * leur niveau, leur prestige, et lesquels n'ont pas de stuff renseigné. C'est le
 * seul de ces faits qui change ce que le membre FAIT dans la minute qui suit.
 */
export function OuJenSuis({ p, max }: { p: Profil; max: number }) {
  const persos = p.personnages;
  const sansStuff = persos.filter((c) => c.stuffs === 0).length;
  const montres = persos.slice(0, Math.max(1, max));

  return (
    <div className="ojs">
      {/* L'image de fond vient du générique du client (`credits/shotcredit08`) : une
          place de village la nuit, fenêtres allumées. Elle a été ouverte et
          vérifiée — aucun logo d'éditeur, aucune barre de chargement incrustée,
          contrairement aux 35 écrans de `chargement/`. Elle est ici parce qu'elle
          dit « chez soi », ce qui est le propos du bloc, et elle est masquée aux
          lecteurs d'écran parce qu'elle ne dit rien de plus que ça. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="ojs-fond" src="/jeu/credits/shotcredit08.webp" alt="" aria-hidden="true" width={1024} height={768} loading="lazy" decoding="async" />
      <span className="ojs-voile" aria-hidden="true" />

      <div className="ojs-in">
        {persos.length === 0 ? (
          /* Pas de personnage : ce n'est pas un vide à combler par un message
             triste, c'est la seule chose à faire sur cette page ce jour-là. */
          <div className="ojs-vide">
            <Icon name="user-plus" size={20} style={{ color: "var(--orange)", flexShrink: 0 }} />
            <div>
              <b style={{ fontSize: 14 }}>Tu n&apos;as pas encore déclaré de personnage.</b>
              <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 3 }}>
                C&apos;est ce qui permet au staff de t&apos;accompagner, et ce que ta candidature demandait.
              </div>
            </div>
            <Link href="/personnages" className="ojs-cta">Déclarer un perso</Link>
          </div>
        ) : (
          <>
            {/* La seule phrase du bloc, et elle n'est là que s'il y a quelque chose
                à faire. Rien à signaler : rien à lire. */}
            {sansStuff > 0 && (
              <div className="ojs-manque">
                <Icon name="alert" size={14} style={{ flexShrink: 0 }} />
                <span>
                  <b>{pl(sansStuff, "personnage")}</b> sans stuff renseigné — c&apos;est ce qui empêche le staff de te conseiller.
                </span>
                <Link href="/builder" className="ojs-lien">Ouvrir AirBuilder</Link>
              </div>
            )}

            <div className="ojs-liste">
              {montres.map((c) => (
                /* La ligne mène au builder du personnage, pas à une fiche : ce
                   qu'on vient faire ici, c'est ouvrir son stuff. */
                <Link key={c.id} href="/builder" className="ojs-perso">
                  <ClassLogo name={c.class} size={26} />
                  <span className="ojs-nom">{c.name}</span>
                  {c.isMain && <span className="ojs-main">principal</span>}
                  <span className="ojs-niv">
                    niv. {c.level}
                    {/* Le prestige ne s'affiche qu'au-dessus de zéro : « P0 » se lit
                        comme une donnée manquante alors que c'est un début normal. */}
                    {c.prestige > 0 && <> · P{c.prestige}</>}
                  </span>
                  {c.stuffs === 0
                    ? <span className="ojs-etat ojs-etat-non">sans stuff</span>
                    : <span className="ojs-etat">{pl(c.stuffs, "stuff")}</span>}
                  <Icon name="chevron-right" size={14} className="ojs-fl" />
                </Link>
              ))}
            </div>

            <div className="ojs-pied">
              {persos.length > montres.length && (
                <span className="ojs-reste">… et {persos.length - montres.length} de plus</span>
              )}
              <Link href="/personnages" className="ojs-lien">Tous mes personnages</Link>
            </div>
          </>
        )}
      </div>

      <style>{`
        .ojs{position:relative;overflow:hidden;border-radius:15px;border:1px solid var(--border);background:#101016}
        .ojs-fond{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 42%}
        /* Deux voiles superposes : un aplat pour le contraste du texte, un halo
           orange pour rattacher a la charte. Sans l'aplat, aucun texte clair ne
           tient sur une image de jeu — meme sombre, elle a des fenetres allumees. */
        .ojs-voile{position:absolute;inset:0;pointer-events:none;background:
          radial-gradient(ellipse 70% 100% at 18% 40%, rgba(255,140,26,.13), transparent 70%),
          linear-gradient(100deg,rgba(16,16,22,.96) 0%,rgba(16,16,22,.93) 46%,rgba(16,16,22,.80) 100%)}
        .ojs-in{position:relative;z-index:1;padding:16px}

        .ojs-vide{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
        .ojs-cta{margin-left:auto;flex-shrink:0;display:inline-flex;align-items:center;padding:9px 15px;border-radius:9px;
          background:var(--orange);color:#0a0a0c;font-family:'Rubik',sans-serif;font-weight:700;font-size:12px;
          text-transform:uppercase;letter-spacing:.8px;text-decoration:none}
        .ojs-cta:hover{filter:brightness(1.08)}

        /* L'avertissement porte sa couleur parce qu'il porte un GESTE a faire, pas
           une grandeur : rien ici ne se compare a rien. */
        .ojs-manque{display:flex;align-items:center;gap:9px;flex-wrap:wrap;font-size:12.5px;line-height:1.5;
          color:var(--gold);background:color-mix(in srgb, var(--gold) 9%, transparent);
          border:1px solid color-mix(in srgb, var(--gold) 30%, transparent);
          border-radius:10px;padding:8px 11px;margin-bottom:11px}

        .ojs-liste{display:grid;gap:5px}
        .ojs-perso{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;
          background:rgba(20,20,26,.72);border:1px solid var(--border);text-decoration:none;color:var(--text);
          transition:border-color .15s,background .15s}
        .ojs-perso:hover{border-color:rgba(255,140,26,.42);background:rgba(30,30,38,.85)}
        .ojs-nom{font-family:'Rubik',sans-serif;font-weight:600;font-size:13.5px;min-width:0;
          overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .ojs-main{flex-shrink:0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;
          color:var(--orange);border:1px solid var(--orange);border-radius:6px;padding:1px 6px}
        /* margin-left:auto sur le niveau : le nom garde sa place a gauche meme quand
           il est court, et les etats restent alignes a droite d'une ligne a l'autre. */
        .ojs-niv{margin-left:auto;flex-shrink:0;font-size:11.5px;color:var(--text-muted);font-variant-numeric:tabular-nums}
        .ojs-etat{flex-shrink:0;font-size:11px;color:var(--text-muted);font-family:'Alef',sans-serif}
        .ojs-etat-non{color:var(--gold)}
        .ojs-fl{flex-shrink:0;color:var(--text-muted)}
        .ojs-perso:hover .ojs-fl{color:var(--orange)}

        .ojs-pied{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:11px}
        .ojs-reste{font-size:11.5px;color:var(--text-muted);font-style:italic}
        .ojs-lien{margin-left:auto;font-size:12px;color:var(--orange);text-decoration:none;font-weight:600;
          border-bottom:1px dotted currentColor}
        .ojs-lien:hover{color:var(--text)}
        /* Sous 520px la ligne d'un perso deborde : le niveau et l'etat passent sous
           le nom plutot que d'ecraser le nom a trois lettres. */
        @media(max-width:520px){
          .ojs-perso{flex-wrap:wrap}
          .ojs-niv{margin-left:0;width:100%;order:3}
          .ojs-etat{order:4}
          .ojs-fl{display:none}
        }
      `}</style>
    </div>
  );
}
