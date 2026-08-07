import type { IconName } from "@/components/Icon";

/**
 * De quoi parle une notification — dit avant de la lire.
 *
 * La cloche mélangeait tout : un message, une quête, un achat et une demande
 * d'objet s'affichaient avec la même icône grise et le même titre. On ne savait
 * pas ce qui méritait qu'on s'interrompe. Chaque type porte donc désormais son
 * étiquette, sa couleur et son icône.
 *
 * Les clés existantes en base sont conservées telles quelles — une notification
 * déjà écrite ne se réécrit pas — d'où les variantes de casse.
 */
export type FamilleNotif = { label: string; icone: IconName; couleur: string };

const FAMILLES: Record<string, FamilleNotif> = {
  QUETE: { label: "Quête", icone: "target", couleur: "#4ADE80" },
  quete: { label: "Quête", icone: "target", couleur: "#4ADE80" },
  vente: { label: "Échange", icone: "swap", couleur: "#FF8C1A" },
  vente_enjeu: { label: "Échange", icone: "swap", couleur: "#FF8C1A" },
  bank_request: { label: "Boutique", icone: "cart", couleur: "#FFD24A" },
  demande: { label: "Requête objet", icone: "package", couleur: "#C77DFF" },
  requete: { label: "Requête objet", icone: "package", couleur: "#C77DFF" },
  REQ_MESSAGE: { label: "Message", icone: "message", couleur: "#4EA8FF" },
  decision: { label: "Décision", icone: "shield", couleur: "#FF8C1A" },
  xp: { label: "Progression", icone: "medal", couleur: "#4ADE80" },
  debit: { label: "Compte", icone: "coins", couleur: "#FFD24A" },
};

const PARDEFAUT: FamilleNotif = { label: "Info", icone: "info", couleur: "#9a9aa8" };

export const familleNotif = (type: string): FamilleNotif =>
  FAMILLES[type] ?? (type.endsWith("_MESSAGE") ? FAMILLES.REQ_MESSAGE : PARDEFAUT);

/** Au-delà, on coupe et on propose « en savoir plus » : la cloche n'est pas une page. */
export const LIMITE_APERCU = 110;
