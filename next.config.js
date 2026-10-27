/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,

  /* DEV_ROLE passe au navigateur (la barre est un composant client) et reste vide au
     build de production : voir src/lib/devAccess.ts. */
  env: { DEV_ROLE: process.env.NODE_ENV === "production" ? "" : (process.env.DEV_ROLE || "") },

  /* LES ANCIENNES ADRESSES, en un seul endroit. Elles ont circulé — notifications en
     base, MP déjà envoyés, liens postés sur Discord, favoris — et une adresse morte se
     lit comme un site cassé. Elles redirigent donc pour toujours.

     Ici plutôt que dans des pages `redirect()` : ces règles passent AVANT le middleware
     et les layouts. Une page-relais rangée sous un garde renvoyait un visiteur vers
     /login au lieu de sa destination (le piège noté dans (vitrine)/collections). Le
     garde de la DESTINATION s'applique toujours : aucun droit ne s'élargit.

     La requête suit seule : `/journal?membre=X` arrive avec son `membre`. 308 pour la
     seule adresse publique indexée ; 307 ailleurs, pour pouvoir encore changer d'avis.
     Aucun lien du site ne compte sur elles : ils visent tous la destination. */
  async redirects() {
    return [
      { source: "/sommaire", destination: "/#plan", permanent: false },
      /* L'ACCUEIL UNIQUE : /histoire est devenue la section « La guilde » de l'accueil,
         /dashboard en est le visage du membre. /histoire est publique et indexée : 308,
         pour que les moteurs déplacent leur lien. /dashboard est réservée à la guilde :
         307, comme les autres. */
      { source: "/histoire", destination: "/#la-guilde", permanent: true },
      { source: "/dashboard", destination: "/", permanent: false },
      /* LES MÉCANIQUES PASSENT DANS ASTUCES (Maxime, 2026-10-21 : « c'est des astuces en
         soi ») : /builder/mecaniques devient /mecaniques. Publique et indexée : 308. La
         règle passe aussi AVANT la route /builder/[user], qui aurait pris « mecaniques »
         pour un pseudo. /astuces-guilde vise la destination directement, sans chaîne. */
      { source: "/builder/mecaniques", destination: "/mecaniques", permanent: true },
      { source: "/astuces-guilde", destination: "/mecaniques", permanent: true },
      /* Trois anciennes pages PUBLIQUES devenues des sections d'autres pages. Elles
         redirigeaient par une page-relais `redirect()`, qui répond 307 : un moteur
         gardait donc l'ancienne adresse. Ici en 308, il déplace son lien. */
      { source: "/collections", destination: "/crafts", permanent: true },
      { source: "/competences", destination: "/classes", permanent: true },
      { source: "/oasis", destination: "/donjons#oasis", permanent: true },
      /* LES PAGES DU STAFF RETIRÉES LE 2026-10-21 (décision de Maxime) : statistiques,
         journal, coffre AirGuild, plan de farm, ventes. Leurs données restent en base ;
         l'adresse mène au tableau de bord des bras droits, qui les remplace. */
      ...["/journal", "/statistiques", "/coffre", "/plan-farm", "/mes-ventes"].map((source) => (
        { source, destination: "/staff", permanent: false })),
      /* /annonce envoyait la même commande `post_embed` que l'onglet Embed du Bot
         Discord — l'onglet par défaut de /discord, qui reprend aussi sa présélection
         du salon d'annonces. Pas de paramètre : /discord n'en lit aucun. */
      { source: "/annonce", destination: "/discord", permanent: false },
      /* LA BOUTIQUE ET SES ADRESSES, retirées le même jour. Des notifications en base,
         des MP et des messages Discord pointent encore sur elles : chacune mène à
         l'accueil plutôt qu'à une page morte. /messages et /demandes visaient la
         Boutique ; elles visent l'accueil sans détour. */
      ...["/boutique", "/messages", "/demandes", "/dettes", "/requetes/:id*"].map((source) => (
        { source, destination: "/", permanent: false })),
      /* INFORMATION GUILDE (2026-10-21). Quête Guilde a quitté le site (Maxime : « Enlever
         le bouton Quêtes devenu inutile ») : ses notifications en base pointent encore sur
         /quetes, qui mène à la page des membres. Le recensement est devenu une SECTION de
         cette page : /recensement mène à son ancre, et ses filtres suivent dans la requête
         (/recensement?classe=Primat → /guilde?classe=Primat#recensement). Deux pages
         réservées à la guilde, jamais indexées : 307. */
      { source: "/quetes", destination: "/guilde", permanent: false },
      { source: "/recensement", destination: "/guilde#recensement", permanent: false },
      /* LE TABLEAU DE BORD TOUT-EN-UN (2026-10-21, SPEC-INFORMATION-GUILDE §3) : le
         GuildViewer, le Suivi et les Candidatures sont des sections de /staff. Leurs
         notifications en base (/guildviewer?dossier=…&onglet=absences) et la file des bras
         droits y mènent toujours : la requête suit, et la page lit ?dossier=, ?onglet=,
         ?vue=, ?filtre=, ?statut=. La vue des absences du GuildViewer a sa section — la
         règle `has` passe avant la règle générale. Pages réservées au staff : 307. */
      { source: "/guildviewer", has: [{ type: "query", key: "vue", value: "absences" }], destination: "/staff?section=absences", permanent: false },
      { source: "/guildviewer", destination: "/staff?section=membres", permanent: false },
      { source: "/suivi", destination: "/staff?section=suivi", permanent: false },
      { source: "/candidatures", destination: "/staff?section=candidatures", permanent: false },
    ];
  },
};
