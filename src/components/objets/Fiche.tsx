"use client";
import Link from "next/link";
import { Icon, type IconName } from "@/components/Icon";
import { Bulle, Invisible } from "@/components/Bulle";
import { useCardFx } from "@/components/VgFx";
import { OuTrouver } from "@/components/OuTrouver";
import { IconeObjet } from "./IconeObjet";
import {
  BADGE_ULTIME, CADENAS, COULEUR_GRADE, DE_STAT,
  classeFr, emblemeClasse, emplacementFr, RESISTANCES, type ObjetFiche,
} from "./vocabulaire";
// 9 Ko de comptes précalculés (scripts/extraire-fashion.mjs), pas les 3 Mo du
// catalogue : ce fichier est un composant client.
import FASHION from "@/data/fashion-bonus.json";

/**
 * LA FICHE D'UN OBJET.
 *
 * Pas de rail de sections ici, exprès : une fiche est une feuille de
 * caractéristiques, on la lit d'un regard. Cacher les bonus derrière un onglet
 * obligerait à cliquer pour comparer deux pièces — c'est précisément ce qu'on vient
 * faire.
 *
 * ┌─────────────── CE QUI A QUITTÉ LA FICHE ───────────────┐
 * │ · LE PRIX DE RÉFÉRENCE. C'était un montant de PNJ, sans │
 * │   rapport avec le marché entre joueurs. Le champ reste   │
 * │   dans les données ; il ne s'affiche plus.               │
 * │ · LE PARAGRAPHE de la fashion. Le chiffre qui situait la │
 * │   pièce est passé dans une bulle, et le tableau des      │
 * │   plafonds appartient de toute façon aux mécaniques.     │
 * │ · Les libellés « Force », « Dextérité », « Intelligence »,│
 * │   « Endurance » : le jeu a ses propres tuiles FOR/DEX/    │
 * │   INT/END, elles disent la même chose en image.          │
 * └─────────────────────────────────────────────────────────┘
 *
 * Trois pièges du client du jeu sont traités plutôt que recopiés :
 *  - le niveau DE L'OBJET n'est pas le niveau REQUIS (le wiki confond les deux, d'où
 *    3 437 niveaux faux là-bas) : on montre le requis en gros et on ne signale
 *    l'autre que quand il diverge ;
 *  - `dwHanded` et la portée sont incohérents sur les armes d'AirFlyff : on ne les
 *    affiche pas du tout, le type dit déjà « deux mains » ;
 *  - le poids de rareté (`dwItemRare`) ressemble à une rareté mais n'en est pas une :
 *    il est resté hors du catalogue réduit, et c'est pourquoi aucun cadre de carte
 *    `bordure_*` n'apparaît ici — on ne connaît pas la rareté des objets.
 */

const NUM = { fontVariantNumeric: "tabular-nums" } as const;
const carte: React.CSSProperties = { padding: 16 };
const titreBloc: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 7, fontSize: 11.5, fontWeight: 700,
  textTransform: "uppercase", letterSpacing: ".5px", color: "var(--orange)", marginBottom: 12,
};

/** Une ligne « libellé … valeur ». Les chiffres sont alignés : on compare deux fiches
 *  côte à côte, et des chiffres qui dansent ne se comparent pas. */
function Ligne({ quoi, children }: { quoi: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "6px 0", borderTop: "1px solid color-mix(in srgb, var(--border) 55%, transparent)", fontSize: 13 }}>
      <span style={{ color: "var(--text-muted)", flexShrink: 0 }}>{quoi}</span>
      <span style={{ marginLeft: "auto", textAlign: "right", fontWeight: 600, ...NUM }}>{children}</span>
    </div>
  );
}

/** Les pastilles du haut : ce qui change la façon de se servir de l'objet. */
function Marque({ texte, couleur, icon, image }: { texte: string; couleur: string; icon?: IconName; image?: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700,
      textTransform: "uppercase", letterSpacing: ".6px", color: couleur, padding: "3px 9px", borderRadius: 20,
      background: `color-mix(in srgb, ${couleur} 11%, transparent)`,
      border: `1px solid color-mix(in srgb, ${couleur} 40%, transparent)` }}>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" width={11} height={11} style={{ objectFit: "contain", imageRendering: "pixelated" }} />
      ) : icon ? <Icon name={icon} size={11} /> : null}
      {texte}
    </span>
  );
}

/**
 * UN BONUS, avec le dé du jeu quand il en existe un.
 *
 * Les quatre statistiques de base ont leur tuile dans le client (FOR, DEX, INT, END) :
 * pour celles-là, l'image REMPLACE le mot. Les soixante-dix autres libellés
 * (Précision, Taux critique, Dégâts sur monstres…) n'ont pas d'image et gardent leur
 * texte — inventer un pictogramme pour chacun ferait soixante-dix devinettes.
 *
 * Le client range le « % » dans le LIBELLÉ (« Attaque % ») : le laisser là et
 * l'ajouter à la valeur donnait « Attaque % +15 % ». Il part du libellé et reste sur
 * le chiffre, où on le lit.
 */
function Bonus({ libelle, valeur }: { libelle: string; valeur: number }) {
  const pct = libelle.endsWith("%");
  const mot = pct ? libelle.replace(/\s*%$/, "") : libelle;
  const de = DE_STAT[mot];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
      {de ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={de} alt={mot} title={mot} height={15}
          style={{ objectFit: "contain", imageRendering: "pixelated", flexShrink: 0, borderRadius: 3 }} />
      ) : (
        <Icon name="zap" size={11} style={{ color: "var(--orange)", opacity: 0.7, flexShrink: 0 }} />
      )}
      <span style={{ color: "var(--text-muted)" }}>{de ? (pct ? "%" : "") : mot}</span>
      <b style={{ marginLeft: "auto", color: valeur < 0 ? "var(--red)" : "var(--green)", ...NUM }}>
        {valeur > 0 ? "+" : ""}{valeur.toLocaleString("fr-FR")}{pct ? " %" : ""}
      </b>
    </div>
  );
}

/**
 * SITUER UNE PIÈCE DE FASHION — en une bulle, plus en paragraphe.
 *
 * Le chiffre n'interprète pas la pièce, il la situe : « 196 des 294 capes portent un
 * bonus » dit que sur une cape c'est la norme, là où « 54 des 707 coiffes » dit que
 * c'est l'exception. Le tableau des plafonds appartient aux mécaniques d'équipement,
 * pas ici : un lien, pas une copie.
 *
 * Un emplacement inconnu n'affiche RIEN plutôt qu'un compte inventé.
 */
function ModeSituee({ o }: { o: ObjetFiche }) {
  if (o.f !== "mode") return null;
  const nom = (o.t ?? "").replace(/\s*\(mode\)$/, "");
  const e = FASHION.emplacements.find((x) => x.nom === nom);
  if (!e) return null;
  return (
    <div style={{ marginTop: 11, paddingTop: 10, borderTop: "1px dashed var(--border)", fontSize: 12 }}>
      <Bulle quoi={<>Le plafond d’un bonus dépend de l’emplacement : le même bonus monte plus haut sur une cape que sur une coiffe. Le tableau complet est sur les mécaniques d’équipement.</>}>
        <b style={{ color: "var(--text)", ...NUM }}>{e.avecBonus}</b>
        <span style={{ color: "var(--text-muted)" }}>/{e.pieces} {nom.toLowerCase()}s à bonus</span>
      </Bulle>
      {" "}
      <Link href="/builder/mecaniques" style={{ color: "var(--orange)", textDecoration: "none", fontWeight: 600, borderBottom: "1px dotted currentColor" }}>
        les plafonds
      </Link>
    </div>
  );
}

export function Fiche({ o, voisins }: { o: ObjetFiche; voisins: ObjetFiche[] }) {
  useCardFx();
  const couleur = (o.g && COULEUR_GRADE[o.g]) || "var(--text)";
  const emb = emblemeClasse(o.cl);
  const classe = classeFr(o.cl);
  const arme = o.f === "arme";
  const emplacement = emplacementFr(o.em);
  // Le niveau de l'objet ne mérite un mot que s'il s'écarte du niveau requis :
  // sinon c'est un doublon qui embrouille.
  const niveauxDivergent = o.no != null && o.nr != null && Math.abs(o.no - o.nr) >= 5;

  return (
    <div style={{ display: "grid", gap: 14 }}>

      <Link href="/objets" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--text-muted)", textDecoration: "none", width: "fit-content" }}>
        <Icon name="arrow-left" size={14} /> Chercher un autre objet
      </Link>

      {/* ── Carte d'identité ─────────────────────────────────────────── */}
      <div className="glass-card fx-card" style={{ padding: "18px 20px", display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap",
        borderColor: o.g ? `color-mix(in srgb, ${couleur} 40%, var(--border))` : undefined }}>
        <span style={{ padding: 8, borderRadius: 14, background: "var(--bg-3)", border: "1px solid var(--border)", display: "inline-flex" }}>
          <IconeObjet o={o} taille={64} />
        </span>
        <div style={{ flex: "1 1 240px", minWidth: 0 }}>
          <h1 className="font-heading" style={{ fontSize: 23, fontWeight: 700, margin: 0, lineHeight: 1.2, color: couleur }}>{o.n}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 5, fontSize: 13, color: "var(--text-muted)", flexWrap: "wrap" }}>
            {o.t && <span>{o.t}</span>}
            {/* L'emplacement se pose tel quel, sans verbe : « se porte sur les
                munitions » n'a pas de sens, et une préposition par cas serait trois
                lignes de code pour une tournure que personne ne lit. */}
            {emplacement && <span>· {emplacement}</span>}
            {emb && classe && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--text)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={emb} alt="" width={18} height={18} style={{ objectFit: "contain" }} />{classe}
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
            {/* Le grade Ultime porte le badge que le client dessine lui-même ; le grade
                Unique n'a pas d'image dans le dossier, il garde son mot. */}
            {o.g === "Ultime" && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={BADGE_ULTIME} alt="Ultime" title="Grade Ultime" height={14} style={{ objectFit: "contain", imageRendering: "pixelated" }} />
            )}
            {o.g === "Unique" && <Marque texte="Unique" couleur={couleur} icon="star" />}
            {o.af === 1 && <Marque texte="Ajout AirFlyff" couleur="var(--orange)" icon="sparkles" />}
            {o.ne === 1 && <Marque texte="Non échangeable" couleur="var(--red)" image={CADENAS} />}
            {o.li === 1 && <Marque texte="Lié au personnage" couleur="var(--red)" image={CADENAS} />}
            {o.li === 2 && <Marque texte="Lié à l’équipement" couleur="var(--gold)" image={CADENAS} />}
            {o.dl === 1 && <Marque texte="Durée de vie réelle" couleur="var(--gold)" icon="clock" />}
            {o.nou === 1 && <Marque texte="Nourriture" couleur="var(--green)" icon="leaf" />}
          </div>
        </div>
        {o.nr != null && (
          <div style={{ textAlign: "center", padding: "10px 16px", borderRadius: 12, background: "var(--bg-3)", border: "1px solid var(--border)", flexShrink: 0 }}>
            <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".7px", color: "var(--text-muted)" }}>Niveau requis</div>
            <div className="font-heading" style={{ fontSize: 27, fontWeight: 700, lineHeight: 1.1, color: "var(--gold)", ...NUM }}>{o.nr}</div>
            {o.nm != null && <div style={{ fontSize: 10.5, color: "var(--text-muted)" }}>jusqu’au niveau {o.nm}</div>}
          </div>
        )}
      </div>

      {o.d && (
        <div className="glass-card fx-card" style={{ ...carte, fontSize: 13.5, fontStyle: "italic", color: "var(--text-muted)", lineHeight: 1.55 }}>
          <Icon name="message" size={13} style={{ marginRight: 7, opacity: 0.6 }} />{o.d}
        </div>
      )}

      <div className="vg-fiche" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, alignItems: "start" }}>

        {/* ── Ce que ça fait ──────────────────────────────────────────── */}
        <div style={{ display: "grid", gap: 14 }}>
          {(o.dn || o.b?.length || o.va || o.bm || o.ae) && (
            <div className="glass-card fx-card" style={carte}>
              <div style={titreBloc}><Icon name="zap" size={13} /> Ce que ça apporte</div>

              {o.dn ? (
                <div style={{ display: "flex", alignItems: "baseline", gap: 9, marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{arme ? "Dégâts" : "Défense"}</span>
                  <b className="font-heading" style={{ marginLeft: "auto", fontSize: 20, color: "var(--text)", ...NUM }}>
                    {o.dn}{o.dx && o.dx !== o.dn ? ` – ${o.dx}` : ""}
                  </b>
                </div>
              ) : null}

              {o.va ? <Vitesse v={o.va} /> : null}
              {o.bm ? <Ligne quoi="Bonus magique">+{o.bm}</Ligne> : null}
              {o.ae ? <Ligne quoi="Attaque élémentaire">+{o.ae}</Ligne> : null}
              {o.el ? <Ligne quoi="Élément porté">{o.el}</Ligne> : null}

              {o.b?.length ? (
                <div style={{ marginTop: 12, paddingTop: 11, borderTop: "1px dashed var(--border)", display: "grid", gap: 5 }}>
                  {o.b.map(([libelle, valeur], i) => <Bonus key={i} libelle={libelle} valeur={valeur} />)}
                </div>
              ) : null}

              <ModeSituee o={o} />
            </div>
          )}

          {o.re && (
            <div className="glass-card fx-card" style={carte}>
              <div style={titreBloc}><Icon name="shield" size={13} /> Résistances</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {RESISTANCES.filter((x) => o.re?.[x.clef]).map((x) => (
                  <span key={x.clef} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600,
                    padding: "5px 11px", borderRadius: 20, color: x.couleur, ...NUM,
                    background: `color-mix(in srgb, ${x.couleur} 10%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${x.couleur} 35%, transparent)` }}>
                    {x.label} {Math.round((o.re?.[x.clef] ?? 0) * 100)} %
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="glass-card fx-card" style={carte}>
            <div style={titreBloc}><Icon name="info" size={13} /> Bon à savoir</div>
            <div style={{ marginTop: -6 }}>
              {o.pnj === 1 ? (
                <Ligne quoi="Vendu par un PNJ">
                  <Link href="/pnj" style={{ color: "var(--orange)", textDecoration: "none", borderBottom: "1px dotted currentColor" }}>
                    l’annuaire
                  </Link>
                </Ligne>
              ) : null}
              {o.pi ? <Ligne quoi="Par pile">{o.pi.toLocaleString("fr-FR")}</Ligne> : null}
              {o.du ? <Ligne quoi="Durabilité">{o.du.toLocaleString("fr-FR")}</Ligne> : null}
              {o.sx ? <Ligne quoi="Réservé à">{o.sx === "male" ? "un garçon" : "une fille"}</Ligne> : null}
              {niveauxDivergent ? (
                <Ligne quoi={
                  <Invisible enJeu={`Le client porte DEUX niveaux : celui-ci (${o.no}), qui sert au raffinement, et le niveau requis (${o.nr}), le seul qui décide si tu peux l'équiper. Le wiki affiche le premier — d'où 3 437 niveaux faux là-bas.`}>
                    Niveau de l’objet
                  </Invisible>
                }>{o.no}</Ligne>
              ) : null}
              <Ligne quoi="Clé du client">
                <code style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{o.cle}</code>
              </Ligne>
            </div>
          </div>
        </div>

        {/* ── D'où ça vient, et quoi d'autre au même emplacement ─────────
            `OuTrouver` porte déjà son propre en-tête « Où le trouver » et son propre
            cadre : l'envelopper dans une carte titrée donnait deux bordures et deux
            titres qui disaient la même chose. On le pose nu — et il ne rend RIEN
            quand le client ne sait pas d'où l'objet vient. */}
        <div style={{ display: "grid", gap: 14 }}>
          <OuTrouver nom={o.n} />

          {voisins.length > 0 && (
            <div className="glass-card fx-card" style={carte}>
              <div style={titreBloc}><Icon name="swap" size={13} /> Au même emplacement</div>
              <div style={{ display: "grid", gap: 6 }}>
                {voisins.map((v) => {
                  const c = (v.g && COULEUR_GRADE[v.g]) || "var(--text)";
                  return (
                    <Link key={v.i} href={`/objets/${v.i}`} style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 8px", borderRadius: 9,
                      border: "1px solid var(--border)", background: "var(--bg-3)", textDecoration: "none", fontSize: 12.5 }}>
                      <IconeObjet o={v} taille={26} />
                      <span style={{ minWidth: 0, flex: 1, color: c, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.n}</span>
                      {v.nr != null && <span style={{ color: "var(--text-muted)", ...NUM, flexShrink: 0 }}>niv. {v.nr}</span>}
                      {v.dn ? <b style={{ color: "var(--text)", ...NUM, flexShrink: 0 }}>{v.dn}</b> : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sous 860 px les deux colonnes s'empilent : une feuille de stats sur deux
          colonnes de 300 px devient illisible sur un téléphone. */}
      <style>{`@media(max-width:860px){.vg-fiche{grid-template-columns:1fr !important}}`}</style>
    </div>
  );
}

/**
 * La vitesse d'attaque, rendue comparable.
 *
 * Le client donne un coefficient (0,025 à 0,085) qui ne dit rien tout seul : plus il
 * est haut, plus l'arme frappe vite, et il ne dépend QUE du type d'arme. D'où la
 * jauge : on situe l'arme entre la baguette et l'épée sans connaître l'échelle.
 *
 * UNE SEULE TEINTE, celle de la page. Le dégradé vert→or d'avant faisait croire que
 * la couleur portait un jugement ; c'est la LONGUEUR qui porte la grandeur.
 */
function Vitesse({ v }: { v: number }) {
  const part = Math.max(0.015, Math.min(1, (v - 0.025) / 0.06));
  return (
    <div style={{ padding: "8px 0 2px", borderTop: "1px solid color-mix(in srgb, var(--border) 55%, transparent)", marginTop: 6 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 9, fontSize: 13 }}>
        <span style={{ color: "var(--text-muted)" }}>Vitesse d’attaque</span>
        <b style={{ marginLeft: "auto", ...NUM }}>{v.toLocaleString("fr-FR")}</b>
      </div>
      <div role="img" aria-label={`Vitesse ${v}, soit ${Math.round(part * 100)} % de l'échelle des armes`}
        style={{ height: 5, borderRadius: 3, background: "var(--bg-4)", marginTop: 6, overflow: "hidden" }}>
        <div style={{ width: `${part * 100}%`, height: "100%", borderRadius: 3, background: "var(--orange)" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "var(--text-muted)", marginTop: 3 }}>
        <span>lente (baguette)</span><span>rapide (épée)</span>
      </div>
    </div>
  );
}
