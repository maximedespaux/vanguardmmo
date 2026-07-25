import "@/app/(verified)/builder/airbuilder.css";
import { SharedBuildViewer } from "./SharedBuildViewer";

// Vue PUBLIQUE d'un build partagé (lisible sans login si le build est public).
export default async function SharedBuildPage({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;
  return (
    <div className="abx builder-readonly" style={{ padding: 16, maxWidth: 1120, margin: "0 auto" }}>
      <SharedBuildViewer shareId={shareId} />
    </div>
  );
}
