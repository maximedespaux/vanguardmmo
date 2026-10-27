"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ClassLogo } from "@/components/ClassLogo";
import { Icon } from "@/components/Icon";
import { EtatMesures } from "@/components/staff/MesuresStuff";
import { regardDe } from "@/config/nav";
import { aMesurer, apresPublication, lienBuilder, stuffsMontes, versVue, type PersoBrut, type PersoVue } from "@/lib/mesPersos";

/** Au-delà, un lien mène à la page entière : le hero ne doit pas reculer d'un écran. */
const MAX = 4;
const pl = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

/**
 * « MES PERSONNAGES », EN TÊTE DE L'ACCUEIL — la seule chose de l'accueil qui ne soit
 * pas la même pour tous (Maxime, 2026-10-21 : « on peut faire remonter les
 * informations en premier comme Mes personnages pour pouvoir accéder plus rapidement à
 * l'AirBuilder et corriger le stuff si nécessaire »).
 *
 * RIEN DANS LE HTML. Le serveur rend ce composant vide ; le navigateur lit ensuite GET
 * /api/characters (`apiAuth` : la personne connectée, et elle seule). Un visiteur ne
 * déclenche aucune requête, et quelqu'un sans perso ne voit rien — pas même un titre.
 * Ouvert à toute personne connectée qui a des persos : membre, Friend ou candidat ;
 * ce sont les siens.
 *
 * Chaque perso et chaque stuff MONTÉ s'ouvrent dans l'AirBuilder par le lien profond
 * (`lienBuilder`), et chaque stuff porte le témoin de ses mesures avec les mots du
 * staff (`EtatMesures` : « Mesures manquantes » — « À renseigner » dans le builder —,
 * « À remesurer », « Complet ») — c'est la raison du
 * bloc : voir ce qui manque, et y aller.
 *
 * PAS DE `.vg-reveal` : `useReveal` ne relève ces éléments qu'une fois, au montage, et
 * ce bloc arrive après — il resterait invisible pour de bon (voir AccueilMembre, parti).
 */
export function MesPersonnages() {
  const { data: session, status } = useSession();
  const { connecte } = regardDe(session);
  const [persos, setPersos] = useState<PersoVue[] | null>(null);

  useEffect(() => {
    // La session se lit d'abord : sans elle, `connecte` vaudrait faux une fraction de
    // seconde et le bloc ne partirait jamais.
    if (!connecte || status === "loading") return;
    let vivant = true;
    // Ce que l'AirBuilder publie peut-être encore (on en revient) : on le lit après.
    apresPublication()
      .then(() => fetch("/api/characters"))
      .then((r) => (r.ok ? r.json() : null))
      .then((j: PersoBrut[] | null) => { if (vivant && Array.isArray(j)) setPersos(versVue(j)); })
      .catch(() => { /* hors ligne : l'accueil reste la vitrine */ });
    return () => { vivant = false; };
  }, [connecte, status]);

  /* ARRIVER PAR UNE ANCRE (#la-guilde, #plan). Le navigateur y défile au chargement,
     puis ce bloc arrive AU-DESSUS et pousse la section hors de l'écran. On y retourne
     une fois, quand il est posé. */
  const recale = useRef(false);
  useEffect(() => {
    if (recale.current || !persos?.length) return;
    recale.current = true;
    const id = window.location.hash.slice(1);
    if (id) document.getElementById(id)?.scrollIntoView({ block: "start" });
  }, [persos]);

  if (!persos?.length) return null;

  const montres = persos.slice(0, MAX);
  const manque = aMesurer(persos);

  return (
    <section className="gn-mp" aria-labelledby="gn-mp-titre">
      {/* Le titre de section de la vitrine (TitreVitrine), sans son apparition. */}
      <h2 id="gn-mp-titre" className="font-heading gn-mp-h2">
        <Icon name="users" framed frameSize={34} tone="orange" /> <span className="vg-h2">Mes personnages</span>
      </h2>
      <p className="gn-mp-sous">
        Tels que l&apos;AirBuilder les publie à la guilde. Un clic sur un perso ou un stuff l&apos;y rouvre.
      </p>

      {manque > 0 && (
        <div className="gn-panne gn-mp-temoin" role="status">
          <Icon name="alert" size={14} style={{ flexShrink: 0 }} />
          {pl(manque, "stuff")} à mesurer ou à remesurer : les dégâts et les PV se déclarent dans l&apos;AirBuilder, sous le personnage.
        </div>
      )}

      <div className="gn-mp-cadre">
        {/* La place de village du générique du client (`credits/shotcredit08`), celle de
            l'ancien « Où j'en suis » : vérifiée, sans logo ni barre de chargement. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="gn-mp-fond" src="/jeu/credits/shotcredit08.webp" alt="" aria-hidden="true" width={1024} height={768} loading="lazy" decoding="async" />
        <span className="gn-mp-voile" aria-hidden="true" />

        <div className="gn-mp-in">
          <div className="gn-mp-liste">
            {montres.map((p) => {
              const montes = stuffsMontes(p);
              return (
                <div key={p.id} className="gn-mp-perso">
                  <div className="gn-mp-ligne">
                    <ClassLogo name={p.classe} size={26} />
                    <span className="gn-mp-nom">{p.nom}</span>
                    {p.principal && <span className="gn-mp-main">principal</span>}
                    <span className="gn-mp-niv">
                      niv. {p.niveau}
                      {/* « P0 » se lit comme une donnée manquante : c'est un début normal. */}
                      {p.prestige > 0 && <> · P{p.prestige}</>}
                    </span>
                    <Link href={lienBuilder(p.nom)} className="gn-mp-ouvrir" aria-label={`Ouvrir ${p.nom} dans l'AirBuilder`}>
                      <Icon name="shirt" size={13} />Ouvrir dans l&apos;AirBuilder
                    </Link>
                  </div>
                  <div className="gn-mp-stuffs">
                    {montes.length === 0 ? (
                      <span className="gn-mp-aucun">Aucun stuff monté.</span>
                    ) : montes.map((s) => (
                      <Link key={s.id} href={lienBuilder(p.nom, s.index)} className="gn-mp-stuff"
                        title={`Ouvrir « ${s.nom} » dans l'AirBuilder`}>
                        <span className="gn-mp-stuff-nom">{s.nom}</span>
                        <EtatMesures etat={s.etat} />
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="gn-mp-pied">
            {persos.length > montres.length && (
              <span className="gn-mp-reste">
                … et {persos.length - montres.length} autre{persos.length - montres.length > 1 ? "s" : ""}
              </span>
            )}
            <Link href="/personnages" className="gn-mp-lien">Tous mes personnages</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
