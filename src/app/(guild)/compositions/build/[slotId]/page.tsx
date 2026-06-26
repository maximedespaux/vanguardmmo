import "../../../builder/airbuilder.css";
import { RefBuilderRunner } from "./RefBuilderRunner";

// /compositions/build/<slotId> — build de référence d'un poste de Chambre Secrète.
// ?edit=1 (admin) → édition ; sinon consultation. Le moteur AirBuilder est réutilisé tel quel.
export default async function RefBuildPage({ params, searchParams }: { params: Promise<{ slotId: string }>; searchParams: Promise<{ edit?: string }> }) {
  const { slotId } = await params;
  const { edit } = await searchParams;
  return (
    <div className="abx builder-readonly">
      <RefBuilderRunner slotId={slotId} edit={edit === "1"} />
    </div>
  );
}
