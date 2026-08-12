"use client";
import Link from "next/link";
import { Icon, type IconName } from "@/components/Icon";
import { useCardFx } from "@/components/VgFx";
import { OuTrouver } from "@/components/OuTrouver";
import { IconeObjet } from "./IconeObjet";
import {
  classeFr, COULEUR_GRADE, emblemeClasse, emplacementFr, penyas, RESISTANCES, type ObjetFiche,
} from "./vocabulaire";
// 9 Ko de comptes précalculés (scripts/extraire-fashion.mjs), pas les 3 Mo du
// catalogue : ce fichier est un composant client.
import FASHION from "@/data/fashion-bonus.json";

/**
 * LA FICHE D'UN OBJET.
 *
 * Pas de rail de sections ici, exprès : une fiche est une feuille de
 * caractéristiques, on la lit d'un regard. Cacher les bonus derrière un onglet
 * obligerait à cliquer pour comparer deux pièces — c'est précisément ce qu'on
 * vient faire.
 *
 * Trois pièges du client du jeu sont traités plutôt que recopiés :
 *  - le niveau DE L'OBJET n'est pas le niveau REQUIS (le wiki confond les deux,
 *    d'où 3 437 niveaux faux là-bas) : on montre le requis en gros et on
 *    n'explique l'autre que quand il diverge ;
 *  - `dwHanded` et la portée sont incohérents sur les armes d'AirFlyff : on ne
 *    les affiche pas du tout, le type dit déjà « deux mains » ;
 *  - le poids de rareté (`dwItemRare`) ressemble à une rareté mais n'en est pas
 *    une : il est resté hors du catalogue réduit.
 */

const carte: React.CSSProperties = { padding: 16 };
const titreBloc: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 7, fontSize: 11.5, fontWeight: 700,
  textTransform: "uppercase", letterSpacing: ".5px", color: "var(--orange)", marginBottom: 12,
};

/** Une ligne « libellé … valeur ». Les chiffres sont alignés : on compare deux
 *  fiches côte à côte, et des chiffres qui dansent ne se comparent pas. */
function Ligne({ quoi, children, aide }: { quoi: string; children: React.ReactNode; aide?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "6px 0", borderTop: "1px solid color-mix(in srgb, var(--border) 55%, transparent)", fontSize: 13 }}>
      <span style={{ color: "var(--text-muted)", flexShrink: 0 }} title={aide}>
        {quoi}{aide && <Icon name="info" size={11} style={{ marginLeft: 4, opacity: 0.55, transform: "translateY(1px)" }} />}
      </span>
      <span style={{ marginLeft: "auto", textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{children}</span>
    </div>
  );
}

/**
 * SITUER UNE PIÈCE DE FASHION dans son emplacement.
 *
 * Ne s'affiche que pour la famille « mode », et seulement si l'emplacement est
 * reconnu : le relevé nomme six emplacements, et le client suffixe quatre d'entre
 * eux par « (mode) » pour les distinguer des pièces d'armure homonymes. Un
 * emplacement inconnu n'affiche RIEN plutôt qu'un compte inventé.
 *
 * Le chiffre n'interprète pas la pièce, il la situe : « 196 des 294 capes portent
 * un bonus » dit que sur une cape c'est la norme, là où « 54 des 707 coiffes »
 * dit que c'est l'exception. Le tableau des plafonds, lui, reste sur le guide —
 * le recopier ici en ferait une deuxième source à tenir à jour.
 */
function ModeSituee({ o }: { o: ObjetFiche }) {
  if (o.f !== "mode") return null;
  const nom = (o.t ?? "").replace(/\s*\(mode\)$/, "");
  const e = FASHION.emplacements.find((x) => x.nom === nom);
  if (!e) return null;
  return (
    <div style={{ marginTop: 12, paddingTop: 11, borderTop: "1px dashed var(--border)", fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
      <b style={{ color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{e.avecBonus}</b> des{" "}
      <b style={{ color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{e.pieces}</b> pièces de type
      « {nom} » portent un bonus. Le plafond de chaque bonus dépend de l&apos;emplacement —{" "}
      <Link href="/astuces" style={{ color: "var(--orange)", textDecoration: "none", fontWeight: 600, borderBottom: "1px dotted currentColor" }}>
        le tableau complet est dans le guide
      </Link>.
    </div>
  );
}

/** Les pastilles du haut : ce qui change la façon de se servir de l'objet. */
function Marque({ texte, couleur, icon }: { texte: string; couleur: string; icon: IconName }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700,
      textTransform: "uppercase", letterSpacing: ".6px", color: couleur, padding: "3px 9px", borderRadius: 20,
      background: `color-mix(in srgb, ${couleur} 11%, transparent)`,
      border: `1px solid color-mix(in srgb, ${couleur} 40%, transparent)` }}>
      <Icon name={icon} size={11} />{texte}
    </span>
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
                munitions » n'a pas de sens, et une préposition par cas serait
                trois lignes de code pour une tournure que personne ne lit. */}
            {emplacement && <span>· {emplacement}</span>}
            {emb && classe && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--text)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={emb} alt="" width={18} height={18} style={{ objectFit: "contain" }} />{classe}
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
            {o.g && <Marque texte={o.g} couleur={couleur} icon="star" />}
            {o.af === 1 && <Marque texte="Ajout AirFlyff" couleur="var(--orange)" icon="sparkles" />}
            {o.hw === 1 && <Marque texte="Absent du wiki" couleur="var(--blue)" icon="eye" />}
            {o.ne === 1 && <Marque texte="Non échangeable" couleur="var(--red)" icon="ban" />}
            {o.li === 1 && <Marque texte="Lié au personnage" couleur="var(--red)" icon="lock" />}
            {o.li === 2 && <Marque texte="Lié à l’équipement" couleur="var(--gold)" icon="lock" />}
            {o.dl === 1 && <Marque texte="Durée de vie réelle" couleur="var(--gold)" icon="clock" />}
            {o.nou === 1 && <Marque texte="Nourriture" couleur="var(--green)" icon="leaf" />}
          </div>
        </div>
        {o.nr != null && (
          <div style={{ textAlign: "center", padding: "10px 16px", borderRadius: 12, background: "var(--bg-3)", border: "1px solid var(--border)", flexShrink: 0 }}>
            <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".7px", color: "var(--text-muted)" }}>Niveau requis</div>
            <div className="font-heading" style={{ fontSize: 27, fontWeight: 700, lineHeight: 1.1, color: "var(--gold)", fontVariantNumeric: "tabular-nums" }}>{o.nr}</div>
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
                  <b className="font-heading" style={{ marginLeft: "auto", fontSize: 20, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>
                    {o.dn}{o.dx && o.dx !== o.dn ? ` – ${o.dx}` : ""}
                  </b>
                </div>
              ) : null}

              {o.va ? <Vitesse v={o.va} /> : null}
              {o.bm ? <Ligne quoi="Bonus magique" aide="Le supplément de dégâts magiques du bâton.">+{o.bm}</Ligne> : null}
              {o.ae ? <Ligne quoi="Attaque élémentaire">+{o.ae}</Ligne> : null}
              {o.el ? <Ligne quoi="Élément porté">{o.el}</Ligne> : null}

              {o.b?.length ? (
                <div style={{ marginTop: 12, paddingTop: 11, borderTop: "1px dashed var(--border)", display: "grid", gap: 4 }}>
                  {o.b.map(([libelle, valeur], i) => {
                    // Le client range le « % » dans le LIBELLÉ (« Attaque % ») :
                    // le laisser là et l'ajouter à la valeur donnait « Attaque %
                    // +15 % ». Il part du libellé et reste sur le chiffre, où on
                    // le lit. Les bonus en points (« Vitesse d'attaque (points) »)
                    // n'en portent pas : la distinction est celle du jeu, on la garde.
                    const pourcent = libelle.endsWith("%");
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 10, fontSize: 13 }}>
                        <Icon name="sparkles" size={11} style={{ color: "var(--orange)", opacity: 0.8, flexShrink: 0, transform: "translateY(1px)" }} />
                        <span style={{ color: "var(--text-muted)" }}>{pourcent ? libelle.replace(/\s*%$/, "") : libelle}</span>
                        <b style={{ marginLeft: "auto", color: valeur < 0 ? "var(--red)" : "var(--green)", fontVariantNumeric: "tabular-nums" }}>
                          {valeur > 0 ? "+" : ""}{valeur.toLocaleString("fr-FR")}{pourcent ? " %" : ""}
                        </b>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {/* Une valeur seule ne dit pas si elle est bonne. Sur une pièce de
                  fashion, la question qu'on se pose devant « Endurance +20 » est
                  « c'est beaucoup ? » — et la réponse dépend de l'emplacement : le
                  même bonus plafonne à 20 sur une cape et à 7 sur une coiffe. On
                  donne ici le seul chiffre qui situe la pièce sans l'interpréter
                  (combien de pièces de cet emplacement portent un bonus), et on mène
                  au tableau complet plutôt que de le recopier. */}
              <ModeSituee o={o} />
            </div>
          )}

          {o.re && (
            <div className="glass-card fx-card" style={carte}>
              <div style={titreBloc}><Icon name="shield" size={13} /> Résistances élémentaires</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {RESISTANCES.filter((x) => o.re?.[x.clef]).map((x) => (
                  <span key={x.clef} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600,
                    padding: "5px 11px", borderRadius: 20, color: x.couleur, fontVariantNumeric: "tabular-nums",
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
              {o.px ? <Ligne quoi="Prix de référence" aide="Le prix du client, celui d’un achat chez un PNJ. Rien à voir avec le marché entre joueurs.">{penyas(o.px)} penyas</Ligne> : null}
              {o.pnj === 1 ? <Ligne quoi="Vendu par un PNJ">oui</Ligne> : null}
              {o.pi ? <Ligne quoi="Par pile">{o.pi.toLocaleString("fr-FR")}</Ligne> : null}
              {o.du ? <Ligne quoi="Durabilité">{o.du.toLocaleString("fr-FR")}</Ligne> : null}
              {o.sx ? <Ligne quoi="Réservé à">{o.sx === "male" ? "un garçon" : "une fille"}</Ligne> : null}
              {niveauxDivergent ? (
                <Ligne quoi="Niveau de l’objet" aide="Sert au raffinement et aux tables de butin — ce n’est PAS le niveau requis. Le wiki affiche celui-ci, d’où des niveaux faux là-bas.">
                  {o.no}
                </Ligne>
              ) : null}
              <Ligne quoi="Clé du client">
                <code style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{o.cle}</code>
              </Ligne>
            </div>
          </div>
        </div>

        {/* ── D'où ça vient, et quoi d'autre au même emplacement ─────────
            `OuTrouver` porte déjà son propre en-tête « Où le trouver » et son
            propre cadre : l'envelopper dans une carte titrée donnait deux
            bordures et deux titres qui disaient la même chose. On le pose nu. */}
        <div style={{ display: "grid", gap: 14 }}>
          <OuTrouver nom={o.n} />

          {voisins.length > 0 && (
            <div className="glass-card fx-card" style={carte}>
              <div style={titreBloc}><Icon name="swap" size={13} /> Au même emplacement</div>
              <p style={{ margin: "-6px 0 10px", fontSize: 12, color: "var(--text-muted)" }}>
                Le même type d’objet, aux niveaux les plus proches — de quoi voir s’il existe mieux.
              </p>
              <div style={{ display: "grid", gap: 6 }}>
                {voisins.map((v) => {
                  const c = (v.g && COULEUR_GRADE[v.g]) || "var(--text)";
                  return (
                    <Link key={v.i} href={`/objets/${v.i}`} style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 8px", borderRadius: 9,
                      border: "1px solid var(--border)", background: "var(--bg-3)", textDecoration: "none", fontSize: 12.5 }}>
                      <IconeObjet o={v} taille={26} />
                      <span style={{ minWidth: 0, flex: 1, color: c, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.n}</span>
                      {v.nr != null && <span style={{ color: "var(--text-muted)", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>niv. {v.nr}</span>}
                      {v.dn ? <b style={{ color: "var(--text)", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{v.dn}</b> : null}
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
 * Le client donne un coefficient (0,025 à 0,085) qui ne dit rien tout seul :
 * plus il est haut, plus l'arme frappe vite, et il ne dépend QUE du type d'arme.
 * D'où la jauge : on situe l'arme entre la baguette et l'épée sans avoir à
 * connaître l'échelle par cœur.
 */
function Vitesse({ v }: { v: number }) {
  const part = Math.max(0, Math.min(1, (v - 0.025) / 0.06));
  return (
    <div style={{ padding: "8px 0 2px", borderTop: "1px solid color-mix(in srgb, var(--border) 55%, transparent)", marginTop: 6 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 9, fontSize: 13 }}>
        <span style={{ color: "var(--text-muted)" }}>Vitesse d’attaque</span>
        <b style={{ marginLeft: "auto", fontVariantNumeric: "tabular-nums" }}>{v.toLocaleString("fr-FR")}</b>
      </div>
      <div style={{ height: 5, borderRadius: 3, background: "var(--bg-4)", marginTop: 6, overflow: "hidden" }}>
        <div style={{ width: `${part * 100}%`, height: "100%", borderRadius: 3, background: "linear-gradient(90deg,var(--orange),var(--gold))" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "var(--text-muted)", marginTop: 3 }}>
        <span>lente (baguette)</span><span>rapide (épée)</span>
      </div>
    </div>
  );
}
