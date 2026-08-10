import { MesCommandes } from "@/components/MesCommandes";

/**
 * /messages — l'adresse reste vivante parce qu'elle a circulé dans des
 * notifications et des messages Discord, et qu'un lien mort se lit comme un
 * site cassé. Le suivi, lui, a rejoint la Boutique : on ne suit pas une
 * commande ailleurs que là où on l'a passée.
 */
export default function MessagesPage() {
  return <MesCommandes />;
}
