"use client";
import { useState } from "react";
import { PRESTIGE_COSTS, PRESTIGE_KEYS, prestigeNeed } from "@/data/prestige";
import { PageHeader } from "@/components/PageHeader";
import { SectionTabs } from "@/components/SectionTabs";
import { VgSelect } from "@/components/VgSelect";
import { Icon } from "@/components/Icon";
import { Invisible } from "@/components/Bulle";
import { useCardFx } from "@/components/VgFx";
import { FrisePaliers } from "@/components/guides/FrisePaliers";
import { Barre, IconeRessource, NUCLEUS_ELEMENTS, RECHERCHE_OBJET, Verrou, Vignette, fr } from "@/components/guides/Briques";

/**
 * ══════════════════════════════════════════════════════════════════════════════
 *  CE QUE COÛTE UN PRESTIGE — et rien d'autre.
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * CE QUE LE JEU NE MONTRE PAS, et qui est toute la raison de cette page : un joueur
 * voit son prestige actuel. Il ne voit ni ce que le suivant demande, ni le cumul
 * jusqu'à sa cible, ni — surtout — que certains sauts pèsent plus que tous les autres
 * réunis. Le nombre répond à « combien » ; seule une longueur répond à « quand ».
 *
 * TROIS CHOSES ONT CHANGÉ DE FORME :
 *  · les neuf icônes de ressources étaient dessinées en SVG, avec une machinerie qui
 *    préchargeait un PNG au même nom pour basculer dessus s'il existait. Les neuf PNG
 *    existent tous : ce sont maintenant les vraies icônes du client, et quatre-vingts
 *    lignes de SVG ont disparu (cf. guides/Briques.tsx) ;
 *  · le tableau replié de dix lignes sur neuf colonnes de chiffres est devenu la frise
 *    des paliers, la même brique que le guide emploie — sauf qu'ici elle met en avant
 *    l'intervalle choisi ;
 *  · chaque ressource dit désormais où est SON mur : la part du plus gros saut dans le
 *    total, calculée.
 */

/**
 * OÙ EST LE MUR — la répartition d'une ressource sur les paliers demandés.
 *
 * 75 badges du P1 au P10, ça ressemble à un effort régulier ; le seul saut P9→P10 en
 * réclame 25, soit un tiers du tout. C'est le genre de rapport qu'un nombre ne dit pas
 * et qu'une longueur dit d'un coup d'œil.
 *
 * Si un seul palier réclame la ressource, il n'y a rien à comparer : on n'affiche rien
 * plutôt qu'une barre pleine qui ferait croire à un maximum. Les deux règles de la
 * barre (une seule teinte, plancher à 1,5 %) vivent dans la brique.
 */
function ParPalier({ cle, de, a, teinte }: { cle: string; de: number; a: number; teinte: string }) {
  const lignes: [number, number][] = [];
  for (let p = de; p < a; p++) {
    const v = PRESTIGE_COSTS[p]?.[cle];
    if (v) lignes.push([p, v]);
  }
  if (lignes.length < 2) return null;
  const haut = Math.max(...lignes.map(([, v]) => v));
  const total = lignes.reduce((s, [, v]) => s + v, 0);
  const gros = lignes.find(([, v]) => v === haut)!;
  /**
   * LE MUR : ce seul saut demande-t-il plus que TOUS les paliers précédents réunis ?
   *
   * C'est la question à laquelle personne ne répond de tête, et c'est celle qui décide
   * d'un plan de farm. La comparaison est EXACTE — même ressource, addition des sauts
   * antérieurs de l'intervalle choisi — donc rien n'est normalisé ni estimé. Sur
   * l'intervalle P1→P10, trois ressources sur neuf sont dans ce cas : le nucléus neutre
   * (35 000 au P4→P5 contre 15 000 avant), l'emblème de protection et le nucléus
   * parfait. Le badge du Jardin, lui, ne l'est PAS malgré ses 25 du dernier saut — la
   * pastille ne s'affiche donc pas, et c'est le renseignement.
   */
  const avant = lignes.filter(([p]) => p < gros[0]).reduce((s, [, v]) => s + v, 0);
  const mur = avant > 0 && haut > avant;
  return (
    <div className="pr-palier">
      {/* Le titre portait « Réparti sur N paliers », qui ne disait rien de plus que le
          nombre de lignes juste dessous. Il porte maintenant les deux seules choses
          qu'on ne peut pas lire dans les barres : la part du plus gros saut, et s'il
          pèse à lui seul plus que tout ce qui le précède. */}
      <div className="pr-palier-t">
        <b>P{gros[0]}→{gros[0] + 1}</b> : <b>{Math.round((haut / total) * 100)} %</b> du total
        {mur && (
          <span className="pr-mur" title={`Ce seul saut demande plus que les paliers précédents additionnés (${fr(haut)} contre ${fr(avant)})`}>
            &gt; tous les précédents
          </span>
        )}
      </div>
      {lignes.map(([p, v]) => (
        <div key={p} className="pr-palier-l">
          <span className="pr-palier-p">P{p}→{p + 1}</span>
          <span className="pr-palier-b"><Barre part={v / haut} teinte={teinte} hauteur={4} /></span>
          <span className="pr-palier-v">{fr(v)}</span>
        </div>
      ))}
    </div>
  );
}

export default function PrestigePage() {
  // Halo suivant le curseur + leger relief sur les .fx-card (cf. VgFx).
  useCardFx();
  const [cur, setCur] = useState(1);
  const [tgt, setTgt] = useState(10);
  const [have, setHave] = useState<Record<string, number>>({});

  const need = prestigeNeed(cur, tgt);
  const keys = PRESTIGE_KEYS.filter((k) => need[k]);
  const done = keys.filter((k) => (have[k] ?? 0) >= need[k]).length;
  const globalPct = keys.length ? Math.round((keys.reduce((s, k) => s + Math.min(1, (have[k] ?? 0) / need[k]), 0) / keys.length) * 100) : 0;

  /**
   * ════════════════════════════════════════════════════════════════════════════
   *  CE DONT ON EST LE PLUS LOIN — la seule chose comparable entre neuf unités.
   * ════════════════════════════════════════════════════════════════════════════
   *
   * La page répond à « combien il m'en faut », ressource par ressource. Elle ne répondait
   * pas à la question suivante, qui est celle qu'on se pose vraiment le soir : PAR LEQUEL
   * COMMENCER. Neuf cartes affichent « reste 12 », « reste 34 995 », « reste 500 » — trois
   * unités qui ne s'additionnent ni ne se comparent. Aucun joueur ne fait le rapport de
   * tête, et l'ordre de farm en dépend.
   *
   * Ce qui SE compare, c'est la PART qui reste : un rapport, sans unité. La carte la plus
   * en retard reçoit une pastille, et rien d'autre ne bouge — remonter la carte en tête de
   * grille la ferait sauter d'une place à chaque frappe au clavier.
   *
   * ELLE NE S'AFFICHE QUE QUAND ELLE VEUT DIRE QUELQUE CHOSE, et c'est le point délicat :
   * tant qu'aucun stock n'est saisi, les neuf ressources sont à zéro, donc les neuf parts
   * valent 1 et « le plus loin » désignerait la première de la liste par pur hasard. Deux
   * conditions, donc : au moins un stock saisi, et un maximum STRICT — deux ressources à
   * égalité ne se départagent pas, on n'invente pas un vainqueur.
   */
  const saisi = keys.some((k) => (have[k] ?? 0) > 0);
  const restant = keys.map((k) => Math.max(0, need[k] - (have[k] ?? 0)) / need[k]);
  const pire = restant.length ? Math.max(...restant) : 0;
  const loin = saisi && pire > 0 && restant.filter((p) => p === pire).length === 1
    ? keys[restant.indexOf(pire)]
    : null;

  return (
    <div style={{ padding: "24px 18px 60px", maxWidth: 1040, margin: "0 auto" }}>
      {/* La porte du désert du jeu, en fond d'en-tête : passer un prestige, c'est
          franchir une porte. Elle vient des écrans de générique du client
          (public/jeu/credits/), les seules images du jeu sans logo ni barre de
          chargement incrustés — contrairement à celles de /jeu/chargement/. */}
      <PageHeader art="/jeu/credits/shotcredit10.webp" banner="/assets/site/banners/banner-guides.webp" title="Calculateur de Prestige" subtitle="Ce que chaque palier demande, et ce qu'il te reste." />
      <SectionTabs section="guides" />

      {/* Sélecteur */}
      <div className="glass-card fx-card" style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end", padding: 18, marginBottom: 16 }}>
        <label style={{ flex: 1, minWidth: 150 }}>
          <div className="pr-lb">Prestige actuel</div>
          <VgSelect full value={cur} onChange={(val) => { const v = +val; setCur(v); if (v >= tgt) setTgt(Math.min(10, v + 1)); }} options={[1, 2, 3, 4, 5, 6, 7, 8, 9].map((p) => ({ value: String(p), label: `Prestige ${p}` }))} />
        </label>
        <div style={{ display: "flex", alignItems: "center", paddingBottom: 8, color: "var(--orange)", fontSize: 22 }}>→</div>
        <label style={{ flex: 1, minWidth: 150 }}>
          <div className="pr-lb">Prestige cible</div>
          <VgSelect full value={tgt} onChange={(v) => setTgt(+v)} options={[2, 3, 4, 5, 6, 7, 8, 9, 10].filter((p) => p > cur).map((p) => ({ value: String(p), label: `Prestige ${p}` }))} />
        </label>
      </div>

      {keys.length === 0 ? (
        <div className="glass-card fx-card" style={{ padding: 26, textAlign: "center", color: "var(--text-muted)" }}>Aucune donnée pour cet intervalle.</div>
      ) : (
        <>
          {/* Progression globale */}
          <div className="glass-card fx-card" style={{ padding: 16, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 9, flexWrap: "wrap", gap: 6 }}>
              <span className="font-heading" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 14, color: "var(--orange)", textTransform: "uppercase", letterSpacing: 1 }}><Icon name="package" size={16} /> P{cur} → P{tgt}</span>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{done}/{keys.length} ressources · <b style={{ color: globalPct === 100 ? "var(--green)" : "var(--orange)" }}>{globalPct}%</b></span>
            </div>
            <div style={{ height: 12, background: "var(--bg-3)", borderRadius: 6, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${globalPct}%`, background: globalPct === 100 ? "var(--green)" : "linear-gradient(90deg,#FFB552,#FF8C1A)", transition: "width .35s ease", boxShadow: "0 0 12px rgba(255,140,26,.4)" }} />
            </div>
          </div>

          {/* Grille des ressources */}
          <div className="pr-grid">
            {keys.map((k) => {
              const total = need[k]; const owned = have[k] ?? 0; const rem = Math.max(0, total - owned);
              const pct = Math.min(100, Math.round((owned / total) * 100)); const ok = rem === 0;
              return (
                <div key={k} className="pr-card" style={{ border: `1px solid ${ok ? "var(--green)" : "var(--border)"}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 9 }}>
                    {/* L'icône du client, à côté du nom écrit : elle ne porte donc pas
                        l'information une seconde fois, d'où alt vide. */}
                    <IconeRessource nom={k} taille={24} alt="" />
                    {/* ══════════════════════════════════════════════════════════════
                        LE NOM EST LE LIEN, et les neuf lignes « Sa fiche » ont disparu.
                        ══════════════════════════════════════════════════════════════
                        Elles coûtaient VINGT-SEPT MOTS pour une seule idée, répétée neuf
                        fois au bas de neuf cartes, alors que le nom de la ressource était
                        écrit juste au-dessus et ne menait nulle part. C'est le motif déjà
                        en service partout ailleurs sur le site — un nom d'objet ou
                        d'instance mène à sa fiche (cf. `Instance`, `NomObjet`) — et il ne
                        coûte pas un mot : le texte était déjà là.
                        La cible passe par RECHERCHE_OBJET et non par le nom affiché : le
                        client écrit « Badge du Jardin Préstigieux », et un lien bâti sur
                        notre orthographe tombe sur zéro résultat (la table le documente).
                        Une ressource sans mot-clé garde son nom en texte simple, jamais un
                        lien mort. */}
                    {RECHERCHE_OBJET[k] ? (
                      <a className="pr-nom" href={`/objets?q=${encodeURIComponent(RECHERCHE_OBJET[k])}`}>{k}</a>
                    ) : (
                      <span style={{ fontSize: 13.5, fontWeight: 600, flex: 1, minWidth: 0 }}>{k}</span>
                    )}
                    {loin === k && (
                      <span className="pr-loin" title="C'est de cette ressource que tu es proportionnellement le plus loin : la part qui te reste y est la plus grande des neuf.">
                        le plus loin
                      </span>
                    )}
                    {ok && <Icon name="check" size={16} style={{ color: "var(--green)" }} />}
                  </div>
                  {k.toLowerCase().includes("parfait") && (
                    <div className="pr-nu">
                      <span>1 parfait = 1 au choix :</span>
                      {NUCLEUS_ELEMENTS.map(([label, src]) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={label} src={src} alt={label} title={`Nucléus ${label}`} width={17} height={17} style={{ objectFit: "contain" }} />
                      ))}
                    </div>
                  )}
                  <div style={{ height: 9, background: "var(--bg-3)", borderRadius: 5, overflow: "hidden", marginBottom: 10 }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: ok ? "var(--green)" : "linear-gradient(90deg,#FFB552,#FF8C1A)", transition: "width .3s ease" }} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="number" min={0} value={owned || ""} onChange={(e) => setHave({ ...have, [k]: Math.max(0, +e.target.value || 0) })} placeholder="J'en ai…" aria-label={`Ce que tu as déjà en ${k}`} />
                    <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>/ {fr(total)}</span>
                    <span style={{ marginLeft: "auto", fontFamily: "Rubik,sans-serif", fontWeight: 700, fontSize: 13, color: ok ? "var(--green)" : "var(--orange)" }}>{ok ? "Complet" : `reste ${fr(rem)}`}</span>
                  </div>

                  {/* La barre reprend la teinte du chiffre de la carte — verte quand la
                      ressource est complète, orange sinon — et jamais deux teintes dans
                      la même série. */}
                  <ParPalier cle={k} de={cur} a={tgt} teinte={ok ? "var(--green)" : "var(--orange)"} />
                </div>
              );
            })}
          </div>

          {/* LE CADENAS EST DIT UNE FOIS POUR LES NEUF CARTES. Le catalogue vit dans le
              groupe (guild) et cette page est publique : la maison veut qu'une porte fermée
              se dise AVANT le clic. Répété neuf fois il n'était plus lu ; posé une fois
              sous la grille, il couvre les neuf noms. Même geste que la légende des
              priorités du guide, pour que les deux pages voisines se lisent pareil. */}
          <p className="pr-legende">
            Un nom de ressource ouvre sa fiche <Verrou quoi="membres" />
          </p>

          {/* ── LA FRISE ──
              Elle remplace le tableau replié : dix lignes sur neuf colonnes de chiffres
              où il fallait suivre une colonne du doigt pour voir où était le mur. Ici
              l'intervalle choisi est mis en avant, et chaque coût porte son icône.
              La même brique sert au guide, où elle montre en plus ce qui s'ouvre. */}
          <div className="glass-card fx-card" style={{ padding: 16, marginBottom: 16 }}>
            <h2 className="pr-h2">
              {/* La vue : une chaussée éclairée de brasiers qui s'enfonce dans la nuit —
                  le chemin, palier par palier. Elle vient du générique du client
                  (public/jeu/credits/), le seul dossier du jeu dont les captures ne
                  portent ni logo d'éditeur ni barre de chargement, et elle est en
                  1024x768 comme le veut la vignette (cf. `Vignette`). */}
              <Vignette vue="shotcredit05" />
              <Icon name="path" size={17} />
              {/* Le titre disait « Ce que demande chaque palier », mot pour mot le
                  sous-titre de l'en-tête, deux écrans plus haut. */}
              <Invisible enJeu="le jeu affiche le palier suivant seulement quand tu y es ; le cumul jusqu'à ta cible n'existe nulle part">
                Palier par palier
              </Invisible>
            </h2>
            <FrisePaliers de={cur} a={tgt} />
          </div>

          {/* Ces ressources se farment et se craftent : deux pages le disent, aucune
              n'était atteignable d'ici. */}
          <div className="glass-card fx-card" style={{ padding: 15, display: "flex", gap: 11, alignItems: "flex-start", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.65 }}>
            <Icon name="info" size={15} style={{ color: "var(--orange)", flexShrink: 0, marginTop: 2 }} />
            <span>
              {/* « en partie » : la page s'ouvre depuis le mode vitrine, mais c'est
                  justement la moitié RECETTES — celle dont il est question ici — qui
                  reste aux membres. Le mot le dit avant le clic. */}
              Les badges se craftent : <a className="pr-lien" href="/crafts">Crafts et collections</a>{" "}
              <Verrou quoi="en partie" />. L&apos;ordre :{" "}
              <a className="pr-lien" href="/astuces">le guide de progression</a>.
            </span>
          </div>
        </>
      )}

      {/* ── POURQUOI CETTE CSS EST ÉCRITE COMME ÇA ──
          Ces notes vivaient DANS le littéral ci-dessous, donc dans le `<style>` servi
          au navigateur. Sorties d'ici elles sont effacées à la compilation, et le
          piège de l'accent grave qui referme le gabarit part avec elles.

          .pr-nu — les cinq nucléus élémentaires : cinq images et quatre mots, là où
          une phrase expliquait l'échange.

          .pr-palier — la répartition par palier : trois colonnes fixes pour que les
          paliers et les valeurs s'alignent d'une carte à l'autre, la barre prend le
          reste.

          .pr-mur — la pastille du mur. Elle est ROUGE et non dorée, parce qu'elle ne
          dit pas une quantité mais un avertissement : ce saut-là pèse plus que tout
          ce qui le précède. Elle n'apparaît que quand la comparaison est vraie (voir
          ParPalier), donc son absence est aussi une réponse.

          .pr-loin — la pastille « le plus loin ». BLEUE, comme la cadence des priorités
          du guide, et pour la même raison : elle ne dit pas une quantité — le rouge du
          mur et le doré des coûts sont pris par des quantités — elle dit par où
          commencer. Elle est en flex-shrink:0 parce qu'elle partage sa ligne avec un nom
          de ressource qui peut faire trente caractères : sans ça, c'est la pastille qui
          se comprimait en accordéon plutôt que le nom qui se tronquait.

          Les barres de progression restent en dégradé : ce sont des jauges de
          remplissage, pas des grandeurs à comparer entre elles — la règle d'une seule
          teinte vise les séries de barres, et celles-là sont dans la brique Barre.

          .pr-nom — le nom de la ressource est devenu le lien, et il garde EXACTEMENT
          l'aspect du texte qu'il remplace (13,5 px, semi-gras, couleur du texte) : seul un
          pointillé orange s'ajoute dessous, le même signal que la maison emploie pour tout
          lien au fil du texte. Une couleur de lien franche aurait fait neuf titres orange
          dans une grille dont l'orange sert déjà aux jauges.

          .pr-legende — marge du haut NÉGATIVE : la grille des ressources porte déjà 16 px
          de marge basse, et la légende doit se lire comme la note de bas de cette grille,
          pas comme un bloc à part. */}
      <style>{`
        .pr-lb{font-size:11.5px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:5px}
        .pr-h2{font-family:'Rubik',sans-serif;font-weight:700;font-size:14px;text-transform:uppercase;
          letter-spacing:1px;color:var(--orange);margin:0 0 13px;display:flex;align-items:center;gap:9px;flex-wrap:wrap}
        .pr-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px;margin-bottom:16px}
        .pr-card{background:linear-gradient(180deg,#191920,#131318);border-radius:13px;padding:13px 15px;transition:transform .15s,box-shadow .15s}
        .pr-card:hover{transform:translateY(-2px);box-shadow:0 8px 22px rgba(0,0,0,.32)}
        .pr-card input{width:92px;padding:6px 9px;font-size:12.5px;background:var(--bg-3);
          border:1px solid var(--border);border-radius:7px;color:var(--text)}
        .pr-card input:focus{outline:none;border-color:var(--orange)}
        .pr-nu{display:flex;align-items:center;gap:5px;margin-bottom:9px;font-size:11.5px;
          color:var(--text-muted);flex-wrap:wrap}
        .pr-palier{margin-top:11px;padding-top:10px;border-top:1px solid color-mix(in srgb, var(--border) 60%, transparent)}
        .pr-palier-t{font-size:10.5px;text-transform:uppercase;letter-spacing:.8px;color:var(--text-muted);
          margin-bottom:6px;display:flex;align-items:center;gap:7px;flex-wrap:wrap}
        .pr-palier-t b{color:var(--gold);font-family:'Rubik',sans-serif}
        .pr-mur{color:var(--red);border:1px solid color-mix(in srgb, var(--red) 55%, transparent);
          border-radius:20px;padding:0 7px;letter-spacing:.5px;font-weight:700}
        .pr-loin{font-size:10px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;
          color:var(--blue);border:1px solid color-mix(in srgb, var(--blue) 60%, transparent);
          border-radius:20px;padding:0 7px;white-space:nowrap;flex-shrink:0}
        .pr-palier-l{display:grid;grid-template-columns:52px minmax(0,1fr) 58px;align-items:center;gap:8px;margin-bottom:4px}
        .pr-palier-p{font-size:10.5px;color:var(--text-muted);font-variant-numeric:tabular-nums}
        .pr-palier-b{min-width:0}
        .pr-palier-v{font-size:11px;text-align:right;font-variant-numeric:tabular-nums;color:var(--text)}
        .pr-nom{flex:1;min-width:0;font-size:13.5px;font-weight:600;color:var(--text);
          text-decoration:none;border-bottom:1px dotted color-mix(in srgb, var(--orange) 55%, transparent);
          transition:color .15s,border-color .15s}
        .pr-nom:hover{color:var(--orange);border-bottom-color:var(--orange)}
        .pr-legende{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:-4px 0 16px;
          font-size:11.5px;color:var(--text-muted)}
        .pr-lien{color:var(--orange);text-decoration:none;font-weight:600;border-bottom:1px dotted currentColor}
        .pr-lien:hover{color:var(--text)}
        @keyframes prIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        .pr-grid>*{animation:prIn .4s ease both}
        .pr-grid>*:nth-child(2){animation-delay:.03s}.pr-grid>*:nth-child(3){animation-delay:.06s}.pr-grid>*:nth-child(4){animation-delay:.09s}.pr-grid>*:nth-child(5){animation-delay:.12s}.pr-grid>*:nth-child(6){animation-delay:.15s}.pr-grid>*:nth-child(7){animation-delay:.18s}.pr-grid>*:nth-child(8){animation-delay:.21s}.pr-grid>*:nth-child(9){animation-delay:.24s}
        @media(prefers-reduced-motion:reduce){.pr-grid>*{animation:none}}
      `}</style>
    </div>
  );
}
