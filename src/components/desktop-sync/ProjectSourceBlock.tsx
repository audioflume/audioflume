type ProjectSource = "mock" | "local-api";

type ProjectSourceBlockProps = {
  projectSource: ProjectSource;
  sourceDescription: string;
  onChangeProjectSource: (source: ProjectSource) => void;
};

export default function ProjectSourceBlock({
  projectSource,
  sourceDescription,
  onChangeProjectSource,
}: ProjectSourceBlockProps) {
  return (
    <div className="section-block">
      <div>
        <h2>Project source</h2>
        <p>{sourceDescription}</p>
      </div>

      <div className="source-toggle" aria-label="Project data source">
        <button
          type="button"
          className={projectSource === "mock" ? "is-active" : ""}
          onClick={() => onChangeProjectSource("mock")}
        >
          Mock
        </button>
        <button
          type="button"
          className={projectSource === "local-api" ? "is-active" : ""}
          onClick={() => onChangeProjectSource("local-api")}
        >
          Filmwave
        </button>
      </div>
    </div>
  );
}
