"use client";
import Link from "next/link";
import { Icon, type IconName } from "@/components/Icon";
import { EnteteVolet, VoletSections, type SectionVolet } from "@/components/VoletSections";
import { useCardFx } from "@/components/VgFx";
import { CarteMonstre } from "./Recherche";
import {
  AVERTISSEMENT_BUTIN, cadence, court, ELEMENT_FR, ELEMENTS, entier, faiblesses,
  iconeElement, TON_ELEMENT, tonRang, type Monstre,
} from "./vocabulaire";

/**
 * LA FICHE D'UN MONSTRE.
 *
 * Le rail sert ici parce que la fiche a vraiment plusieurs facettes qui ne se
 * lisent pas au même moment : on regarde « ce qu'il encaisse » avant le combat,
 * « ce qu'il fait » pendant, « ce qu'il lâche » après, et « où il est » avant de
 * partir. Tout empiler dans une colonne obligeait à dérouler pour savoir si la
 * fiche portait une invocation.
 *
 * Chaque entrée du rail porte son compte : on sait qu'il y a 12 invocations sans
 * ouvrir la section.
 */

/** Une ligne chiffrée. `tabular-nums` partout : sans ça, les colonnes de PV et de
 *  dégâts dansent d'une ligne à l'autre et on ne peut plus les comparer d'un œil. */
function Ligne({ quoi, valeur, ton, note }: { quoi: string; valeur: React.ReactNode; ton?: string; note?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "7px 0", borderTop: "1px solid color-mix(in srgb, var(--border) 55%, transparent)" }}>
      <span style={{ fontSize: 12.5, color: "var(--text-muted)", flex: "1 1 auto", minWidth: 0 }}>
        {quoi}
        {note && <span style={{ display: "block", fontSize: 11.5, opacity: 0.8 }}>{note}</span>}
      </span>
      <span className="font-heading" style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: ton ?? "var(--text)", flexShrink: 0, textAlign: "right" }}>
        {valeur}
      </span>
    </div>
  );
}

/** Une tuile marquante, pour les deux ou trois chiffres qui décident du combat. */
function Tuile({ titre, valeur, sous, ton = "var(--orange)", icon }: {
  titre: string; valeur: React.ReactNode; sous?: string; ton?: string; icon: IconName;
}) {
  return (
    <div style={{ background: "var(--bg-3)", border: `1px solid color-mix(in srgb, ${ton} 26%, var(--border))`, borderRadius: 11, padding: "11px 13px", minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".7px", color: "var(--text-muted)" }}>
        <Icon name={icon} size={11} style={{ color: ton }} />{titre}
      </div>
      <div className="font-heading" style={{ fontSize: 19, fontWeight: 700, color: ton, fontVariantNumeric: "tabular-nums", marginTop: 2, lineHeight: 1.15 }}>{valeur}</div>
      {sous && <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>{sous}</div>}
    </div>
  );
}

function Vide({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>{children}</p>;
}

export function FicheMonstre({ m, voisins }: { m: Monstre; voisins: Monstre[] }) {
  useCardFx();
  const seReleve = (m.vies ?? 0) > 1;
  const { faible, resiste } = faiblesses(m.res);
  const ic = iconeElement(m.elem);
  const nbMecaniques =
    (m.rage?.length ?? 0) + (m.soigne?.length ?? 0) + (m.invoque?.length ?? 0) +
    (m.renfort ? 1 : 0) + (m.fuit != null ? 1 : 0) + (m.esqPct ? 1 : 0) + (m.distance ? 1 : 0);
  const nbButin = (m.butin?.length ?? 0) + (m.butinClient?.length ?? 0);

  const sections: SectionVolet[] = [

    {
      clef: "encaisse", titre: "Ce qu'il encaisse", sous: "PV, défense, résistances", icon: "shield",
      compte: null,
      contenu: (
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 9 }}>
            <Tuile icon="heart" titre="PV à sortir" ton={seReleve ? "var(--red)" : "var(--orange)"}
              valeur={court(m.pvEff)} sous={seReleve ? `${entier(m.pv)} PV × ${m.vies} vies` : `${entier(m.pv)} PV`} />
            <Tuile icon="shield" titre="Défense" valeur={entier(m.def)} ton="var(--blue)" />
            <Tuile icon="sparkles" titre="Résistance magique" valeur={entier(m.resMag)} ton="var(--purple)" />
          </div>

          {/* Le mécanisme des vies mérite une phrase, pas une pastille : c'est ce
              qui fait croire à un bug quand le boss remonte à plein. */}
          {seReleve && (
            <div style={{ border: "1px solid color-mix(in srgb, var(--red) 40%, transparent)", background: "color-mix(in srgb, var(--red) 8%, transparent)", borderRadius: 10, padding: "11px 13px", fontSize: 13 }}>
              <b style={{ color: "var(--red)" }}>Il se relève {(m.vies ?? 1) - 1} fois.</b>{" "}
              Sa barre de vie annonce {entier(m.pv)} PV, mais à zéro il repart à plein tant qu&apos;il lui reste
              une vie : il faut sortir <b style={{ fontVariantNumeric: "tabular-nums" }}>{entier(m.pvEff)}</b> PV
              au total ({court(m.pvEff)}). Un groupe qui prépare son run sur le chiffre affiché se trompe
              d&apos;un facteur {m.vies}.
            </div>
          )}

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 6 }}>
              {ic && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={ic} alt="" width={20} height={20} style={{ objectFit: "contain" }} />
              )}
              <span className="font-heading" style={{ fontSize: 13.5, fontWeight: 700 }}>
                Élément {ELEMENT_FR[m.elem ?? "aucun"] ?? "inconnu"}
                {m.elemNiv ? <span style={{ color: "var(--text-muted)", fontWeight: 400 }}> · niveau {m.elemNiv}</span> : null}
              </span>
            </div>
            {faible.length > 0 || resiste.length > 0 ? (
              <p style={{ fontSize: 13, margin: "0 0 8px" }}>
                {faible.length > 0 && (
                  <>Il prend plus de dégâts <b style={{ color: "var(--green)" }}>{faible.map((e) => "au " + ELEMENT_FR[e].toLowerCase()).join(" et ")}</b>. </>
                )}
                {resiste.length > 0 && (
                  <>Il encaisse mieux <b style={{ color: "var(--red)" }}>{resiste.map((e) => "le " + ELEMENT_FR[e].toLowerCase()).join(" et ")}</b>.</>
                )}
              </p>
            ) : (
              <Vide>Aucune résistance élémentaire : tous les éléments lui font le même mal.</Vide>
            )}
            {/* Les cinq colonnes brutes du client : une valeur négative = il prend
                PLUS. On les montre parce que quelques monstres sortent de la roue
                élémentaire (Clockworks résiste à trois éléments à la fois). */}
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {ELEMENTS.map((e) => {
                const v = m.res?.[e] ?? 0;
                const ton = v < 0 ? "var(--green)" : v > 0 ? "var(--red)" : "var(--text-muted)";
                return (
                  <span key={e} title={ELEMENT_FR[e]} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "var(--bg-3)", border: `1px solid color-mix(in srgb, ${ton} 30%, var(--border))`, borderRadius: 8, padding: "4px 9px", fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={iconeElement(e)!} alt="" width={14} height={14} style={{ objectFit: "contain" }} />
                    <b style={{ color: ton, fontWeight: 700 }}>{v > 0 ? "+" : ""}{v.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}</b>
                  </span>
                );
              })}
            </div>
          </div>

          <div>
            <Ligne quoi="Points de magie" valeur={entier(m.pm)} />
            <Ligne quoi="Esquive" valeur={entier(m.esq)} />
            <Ligne quoi="Précision" valeur={entier(m.prec)} />
            <Ligne quoi="Force · Endurance · Dextérité · Intelligence"
              valeur={m.sta.map((x) => (x == null ? "—" : x.toLocaleString("fr-FR"))).join(" · ")} />
          </div>
        </div>
      ),
    },

    {
      clef: "frappe", titre: "Ce qu'il te fait", sous: "dégâts par coup et cadence", icon: "sword-cross",
      compte: null,
      contenu: (
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 9 }}>
            <Tuile icon="sword" titre="Dégâts par coup" ton="var(--red)"
              valeur={m.atkMax ? court(m.atkMax) : "—"}
              sous={m.atkMin != null && m.atkMax != null && m.atkMin !== m.atkMax ? `${entier(m.atkMin)} à ${entier(m.atkMax)}` : undefined} />
            <Tuile icon="clock" titre="Cadence" ton="var(--gold)"
              valeur={cadence(m.delai) ?? "—"} sous={m.delai ? `${entier(m.delai)} ms entre deux coups` : undefined} />
            {m.distance ? <Tuile icon="target" titre="Attaque à distance" ton="var(--blue)" valeur={`${m.distance} m`} /> : null}
          </div>

          {/* Les dégâts par seconde, calculés : c'est la seule façon de comparer un
              boss qui frappe fort lentement et un boss qui frappe vite. */}
          {m.atkMax && m.delai ? (
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
              Soit environ{" "}
              <b style={{ color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>
                {court(Math.round((m.atkMax * 1000) / m.delai))}
              </b>{" "}
              de dégâts par seconde sur une seule cible, avant réduction par ta défense.
              {m.rage?.length ? " À multiplier par sa rage une fois qu'elle est déclenchée." : ""}
            </div>
          ) : null}

          <div>
            <Ligne quoi="Vitesse d'attaque" valeur={entier(m.vitAtk)} note="Valeur brute du client, sans unité connue" />
            <Ligne quoi="Agressivité" valeur={m.agro ?? "—"} />
            {m.aggro ? <Ligne quoi="Portée d'aggro" valeur={`${m.aggro} m`} note="La distance à laquelle il te repère" /> : null}
            <Ligne quoi="Vole" valeur={m.vole ? "Oui" : "Non"} />
          </div>

          <div style={{ fontSize: 12.5, color: "var(--text-muted)", borderTop: "1px solid var(--border)", paddingTop: 10 }}>
            Sur AirFlyff, il n&apos;existe plus de monstre passif : sur 1 124 monstres, 1 122 attaquent à vue.
            Ce n&apos;est donc pas une information de fiche, c&apos;est la règle.
          </div>
        </div>
      ),
    },

    {
      clef: "mecaniques", titre: "Ce qu'il fait en combat", sous: "rage, soins, invocations, fuite", icon: "flame",
      compte: nbMecaniques,
      contenu: nbMecaniques === 0 ? (
        <Vide>
          Aucune mécanique scriptée dans le client pour ce monstre : il frappe, et c&apos;est tout.
          Sur les 1 124 monstres, 909 ont un bloc de comportement — celui-ci n&apos;en a pas, ou il est vide.
        </Vide>
      ) : (
        <div style={{ display: "grid", gap: 13 }}>
          {m.rage?.length ? (
            <div>
              <div className="font-heading" style={{ fontSize: 13.5, fontWeight: 700, color: "var(--red)", display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
                <Icon name="flame" size={14} /> Rage
              </div>
              {m.rage.map((r, i) => (
                <p key={i} style={{ fontSize: 13, margin: "0 0 4px" }}>
                  Sous <b style={{ fontVariantNumeric: "tabular-nums" }}>{r.pv} %</b> de ses PV, ses dégâts sont
                  multipliés par <b style={{ color: "var(--red)", fontVariantNumeric: "tabular-nums" }}>{r.x.toLocaleString("fr-FR")}</b>
                  {m.atkMax ? <> — soit jusqu&apos;à <b style={{ fontVariantNumeric: "tabular-nums" }}>{court(Math.round(m.atkMax * r.x))}</b> par coup.</> : "."}
                </p>
              ))}
              <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
                C&apos;est la fin du combat qui tue, pas le début : le tank doit avoir ses soins à ce moment-là.
                {m.rage.length > 1 && " Le client déclare plusieurs lignes de rage pour ce monstre — laquelle s'applique, c'est le serveur qui en décide, et on ne peut pas le lire dans les fichiers. Prends la plus violente comme hypothèse."}
              </p>
            </div>
          ) : null}

          {m.soigne?.length ? (
            <div>
              <div className="font-heading" style={{ fontSize: 13.5, fontWeight: 700, color: "var(--green)", display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
                <Icon name="sparkles" size={14} /> Il se soigne
              </div>
              {m.soigne.map((s, i) => (
                <p key={i} style={{ fontSize: 13, margin: "0 0 4px" }}>
                  Sous <b style={{ fontVariantNumeric: "tabular-nums" }}>{s.pv} %</b> de ses PV, il se rend{" "}
                  <b style={{ color: "var(--green)", fontVariantNumeric: "tabular-nums" }}>{s.rend} %</b> de sa vie.
                </p>
              ))}
              <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
                Le soin ne part qu&apos;une fois : si le groupe passe le seuil d&apos;un coup, il ne se déclenche pas.
              </p>
            </div>
          ) : null}

          {m.invoque?.length ? (
            <div>
              <div className="font-heading" style={{ fontSize: 13.5, fontWeight: 700, color: "var(--purple)", display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                <Icon name="users" size={14} /> Il invoque
                <span style={{ fontWeight: 400, color: "var(--text-muted)", fontSize: 12 }}>{m.invoque.length} ligne{m.invoque.length > 1 ? "s" : ""}</span>
              </div>
              <div style={{ display: "grid", gap: 4 }}>
                {m.invoque.map((i, k) => (
                  <div key={k} style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 12.5, fontVariantNumeric: "tabular-nums" }}>
                    <span style={{ color: "var(--gold)", fontWeight: 700, minWidth: 42 }}>{i.c} %</span>
                    <span style={{ flex: 1, minWidth: 0 }}>{i.m}{i.n > 1 ? ` ×${i.n}` : ""}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {m.renfort ? (
            <div>
              <div className="font-heading" style={{ fontSize: 13.5, fontWeight: 700, color: "var(--gold)", display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
                <Icon name="megaphone" size={14} /> Il appelle des renforts
              </div>
              <p style={{ fontSize: 13, margin: 0 }}>
                {m.renfort.pv >= 100 ? "Dès l'engagement" : `Sous ${m.renfort.pv} % de ses PV`}, il appelle{" "}
                <b>{m.renfort.m}</b>{m.renfort.n > 1 ? <> ×<b style={{ fontVariantNumeric: "tabular-nums" }}>{m.renfort.n}</b></> : null}.
              </p>
            </div>
          ) : null}

          {m.fuit != null ? (
            <Ligne quoi="Il fuit" valeur={`sous ${m.fuit} % de PV`} ton="var(--blue)" />
          ) : null}
          {m.esqPct ? <Ligne quoi="Chance d'esquive" valeur={`${m.esqPct} %`} /> : null}
          {m.tache ? <Ligne quoi="Compté dans la tâche « tuer un boss »" valeur="Oui" ton="var(--green)" /> : null}
          {m.sansPenalite ? <Ligne quoi="Butin sans pénalité d'écart de niveau" valeur="Oui" ton="var(--green)" /> : null}
        </div>
      ),
    },

    {
      clef: "recompense", titre: "Ce qu'il rapporte", sous: "expérience, penya, butin connu", icon: "coins",
      compte: nbButin || null,
      contenu: (
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 9 }}>
            <Tuile icon="star" titre="Expérience" ton="var(--gold)" valeur={m.exp ? court(m.exp) : "—"} sous={m.exp ? entier(m.exp) : undefined} />
            <Tuile icon="coins" titre="Penya" ton="var(--orange)" valeur={m.penya ? court(m.penya) : "—"} sous={m.penya ? entier(m.penya) : undefined} />
            <Tuile icon="gift" titre="Points Madrigal" ton="var(--purple)" valeur={entier(m.madrigal)} />
          </div>

          {/* Les 39 boss d'instance à 2 exp et 8 penya : ça ressemble tellement à un
              bug qu'il faut le dire sur la fiche, sinon on croit à un problème. */}
          {(m.exp ?? 0) <= 10 && (m.penya ?? 0) <= 10 && m.rang === "super" && (
            <div style={{ border: "1px solid var(--border)", background: "var(--bg-3)", borderRadius: 10, padding: "11px 13px", fontSize: 12.5 }}>
              <b>Ce n&apos;est pas un bug.</b> Les boss et sbires du Mausolée des Divinités, du Sanctuaire Shogun,
              du Paradis Arcanique et du Jardin des Rois donnent tous 2 points d&apos;expérience et 8 penya.
              La récompense est entièrement dans le coffre de l&apos;instance, jamais sur le cadavre.
            </div>
          )}

          {m.butin?.length ? (
            <div>
              <div className="font-heading" style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 6, display: "flex", alignItems: "center", gap: 7 }}>
                <Icon name="package" size={14} style={{ color: "var(--orange)" }} /> Butin de quête
                <span style={{ fontWeight: 400, color: "var(--text-muted)", fontSize: 12 }}>taux du client</span>
              </div>
              <div style={{ display: "grid", gap: 4 }}>
                {m.butin.map((b, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 9, fontSize: 12.5, fontVariantNumeric: "tabular-nums" }}>
                    <span style={{ fontWeight: 700, minWidth: 58, textAlign: "right", color: b.p >= 25 ? "var(--green)" : b.p >= 10 ? "var(--gold)" : "var(--text-muted)" }}>
                      {b.p.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} %
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>{b.o}{b.q > 1 ? ` ×${b.q}` : ""}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {m.butinClient?.length ? (
            <div>
              <div className="font-heading" style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 6, display: "flex", alignItems: "center", gap: 7 }}>
                <Icon name="package" size={14} style={{ color: "var(--green)" }} /> Butin déclaré en dur
              </div>
              <div style={{ display: "grid", gap: 4 }}>
                {m.butinClient.map((b, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 9, fontSize: 12.5, fontVariantNumeric: "tabular-nums" }}>
                    <span style={{ fontWeight: 700, minWidth: 58, textAlign: "right", color: "var(--green)" }}>{b.p.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} %</span>
                    <span style={{ flex: 1, minWidth: 0 }}>{b.o}{b.niv ? <span style={{ color: "var(--text-muted)" }}> — à partir du niveau {b.niv}</span> : null}</span>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "6px 0 0" }}>
                Il n&apos;y a que six monstres dans tout le client à porter un butin écrit en dur. Celui-ci en fait partie.
              </p>
            </div>
          ) : null}

          <div style={{ border: "1px dashed var(--border)", borderRadius: 10, padding: "11px 13px", fontSize: 12.5, color: "var(--text-muted)" }}>
            <Icon name="info" size={13} style={{ marginRight: 5, color: "var(--gold)" }} />
            {AVERTISSEMENT_BUTIN}
          </div>

          {m.titre ? (
            <div style={{ border: "1px solid color-mix(in srgb, var(--gold) 35%, transparent)", background: "color-mix(in srgb, var(--gold) 7%, transparent)", borderRadius: 10, padding: "11px 13px", fontSize: 13 }}>
              <Icon name="medal" size={14} style={{ marginRight: 6, color: "var(--gold)" }} />
              Un titre de chasse lui est attaché : <b style={{ color: "var(--gold)" }}>{m.titre.t}</b>, pour{" "}
              <b style={{ fontVariantNumeric: "tabular-nums" }}>{entier(m.titre.n)}</b> mises à mort.
            </div>
          ) : null}
        </div>
      ),
    },

    {
      clef: "ou", titre: "Où le trouver", sous: "les zones où il est posé", icon: "map-pin",
      compte: m.lieux?.length ?? null,
      contenu: m.lieux?.length ? (
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gap: 5 }}>
            {m.lieux.map((l, i) => (
              <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 9, padding: "7px 0", borderTop: i ? "1px solid color-mix(in srgb, var(--border) 55%, transparent)" : "none", fontSize: 13 }}>
                <Icon name="map-pin" size={13} style={{ color: "var(--orange)", flexShrink: 0, transform: "translateY(2px)" }} />
                <span style={{ flex: 1, minWidth: 0, fontWeight: 600 }}>{l.z}</span>
                <span style={{ flexShrink: 0, fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
                  {l.n} apparition{l.n > 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
            Le compte est celui des points d&apos;apparition posés dans les fichiers de carte, pas le nombre
            de monstres vivants à un instant donné.
          </p>
        </div>
      ) : (
        <Vide>
          Aucun point d&apos;apparition posé dans les fichiers de carte pour ce monstre. 571 des 1 124 monstres
          y sont localisés ; les autres sont créés par le serveur au fil d&apos;une instance ou d&apos;un event,
          et n&apos;existent donc nulle part dans les cartes.
        </Vide>
      ),
    },
  ];

  if (voisins.length) {
    sections.push({
      clef: "famille", titre: "Sa famille", sous: "les autres paliers, et le même donjon", icon: "layers",
      compte: voisins.length,
      contenu: (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(250px,1fr))", gap: 10 }}>
          {voisins.map((v) => <CarteMonstre key={v.id} m={v} />)}
        </div>
      ),
    });
  }

  return (
    <div style={{ padding: 32, maxWidth: 1150, margin: "0 auto" }}>
      <Link href="/monstres" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--text-muted)", textDecoration: "none", marginBottom: 12 }}>
        <Icon name="arrow-left" size={13} /> Tous les monstres
      </Link>

      <VoletSections
        entete={
          <EnteteVolet
            icon={seReleve ? "skull" : "paw"}
            titre={m.nom}
            marque={seReleve ? { texte: `${m.vies} vies`, couleur: "var(--red)" } : m.maison ? { texte: "AirFlyff", couleur: "var(--purple)" } : undefined}
            sous={
              <span style={{ display: "flex", gap: 9, flexWrap: "wrap", alignItems: "center" }}>
                <b style={{ color: tonRang(m.rang) }}>{m.rang ?? "rang inconnu"}</b>
                {m.niv != null && <span style={{ fontVariantNumeric: "tabular-nums" }}>niveau {m.niv}</span>}
                {ic && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: TON_ELEMENT[m.elem ?? "aucun"] }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ic} alt="" width={14} height={14} style={{ objectFit: "contain" }} />
                    {ELEMENT_FR[m.elem!]}
                  </span>
                )}
                {m.zone && <span>· {m.zone}</span>}
                {m.groupe && <span>· {m.groupe}</span>}
                {m.maison && seReleve && <span style={{ color: "var(--purple)" }}>· contenu AirFlyff</span>}
              </span>
            }
          />
        }
        sections={sections}
      />
    </div>
  );
}
