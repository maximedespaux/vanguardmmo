import "./airbuilder.css";
import { BuilderRunner } from "./BuilderRunner";
import { BUILDER_MARKUP } from "./markup";

export default function BuilderPage() {
  return (
    <div className="abx">
      <div dangerouslySetInnerHTML={{ __html: BUILDER_MARKUP }} />
      <BuilderRunner />
    </div>
  );
}
