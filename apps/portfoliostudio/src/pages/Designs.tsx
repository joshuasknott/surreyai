import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Check,
  DeviceMobile,
  Monitor,
  Sparkle,
} from "@phosphor-icons/react";
import { Header, Modal, PortfolioThumbnail } from "../components/ui";
import { templates } from "../data/templates";
import {
  createPersonalizedPortfolio,
  recommendDesigns,
  switchPortfolioDesign,
} from "../data/personalize";
import { Canvas } from "../components/Canvas";
import type { StudentProfile as SharedStudentProfile } from "../../shared/student";
import "./onboarding.css";
import type {
  PortfolioDocument,
  PortfolioTemplate,
} from "../../shared/portfolio";

type Recommendation = { id: string; reason: string };
const approvedDesignIds = new Set([
  "signal-v2",
  "field-notes",
  "cobalt-v2",
  "portrait",
  "offset",
  "ledger",
  "nightfall",
  "open-studio",
  "first-light",
  "colourblock",
]);
const approvedTemplates = templates.filter((template) =>
  approvedDesignIds.has(template.id),
);

export function DesignGallery({
  selected,
  onChoose,
  student,
  document,
}: {
  selected?: string;
  onChoose: (id: string, document?: PortfolioDocument) => void;
  student?: SharedStudentProfile;
  document?: PortfolioDocument;
}) {
  const [filter, setFilter] = useState("All");
  const [preview, setPreview] = useState<PortfolioTemplate | null>(null);
  const [mobile, setMobile] = useState(false);
  const recommendations = useMemo<Recommendation[]>(
    () => (student ? recommendDesigns(student) : []),
    [student],
  );
  const recommendationById = useMemo(
    () => new Map(recommendations.map((item) => [item.id, item.reason])),
    [recommendations],
  );
  const orderedTemplates = useMemo(() => {
    const ranked = new Map(
      recommendations.map((item, index) => [item.id, index]),
    );
    return [...approvedTemplates].sort((a, b) => {
      const aRank = ranked.get(a.id);
      const bRank = ranked.get(b.id);
      if (aRank === undefined && bRank === undefined) return 0;
      if (aRank === undefined) return 1;
      if (bRank === undefined) return -1;
      return aRank - bRank;
    });
  }, [recommendations]);

  const getDocument = (template: PortfolioTemplate) => {
    if (document) return switchPortfolioDesign(document, template.id);
    return student
      ? createPersonalizedPortfolio(template.id, student)
      : template.document;
  };
  const visibleTemplates = orderedTemplates.filter(
    (template) => filter === "All" || template.category === filter,
  );

  return (
    <>
      <div className="filter-row" aria-label="Filter designs">
        {["All", "Creative", "Technical", "Academic", "Professional"].map(
          (category) => (
            <button
              key={category}
              className={filter === category ? "active" : ""}
              onClick={() => setFilter(category)}
              type="button"
            >
              {category}
            </button>
          ),
        )}
      </div>
      {student && recommendations.length > 0 && (
        <div className="design-recommendation-note" role="status">
          <Sparkle />
          <span>
            Your best matches are first. Every direction stays editable, and you
            can choose any of the ten.
          </span>
        </div>
      )}
      <div className="design-grid">
        {visibleTemplates.map((template) => {
          const personalized = getDocument(template);
          const reason = recommendationById.get(template.id);
          return (
            <article
              key={template.id}
              className={`design-card ${selected === template.id ? "chosen" : ""}`}
            >
              <button
                className="design-image"
                type="button"
                onClick={() => setPreview(template)}
                aria-label={`Preview ${template.name}`}
              >
                <PortfolioThumbnail document={personalized} height={265} />
                <span className="preview-label">Preview design</span>
              </button>
              <div className="design-info">
                <div>
                  <div className="design-name-row">
                    <h3>{template.name}</h3>
                    {reason && (
                      <span className="design-recommended">Recommended</span>
                    )}
                  </div>
                  <p>{template.description}</p>
                  {reason && <p className="design-reason">{reason}</p>}
                </div>
                <button
                  type="button"
                  className={
                    selected === template.id
                      ? "choose-design selected"
                      : "choose-design"
                  }
                  onClick={() => onChoose(template.id, personalized)}
                  aria-label={`Choose ${template.name}`}
                >
                  {selected === template.id ? <Check /> : <ArrowRight />}
                </button>
              </div>
              <span className="design-discipline">{template.discipline}</span>
            </article>
          );
        })}
      </div>
      {preview && (
        <Modal title={preview.name} wide onClose={() => setPreview(null)}>
          <div className="preview-actions">
            <span>
              {preview.description}
              {recommendationById.get(preview.id) && (
                <small className="preview-reason">
                  <Sparkle /> {recommendationById.get(preview.id)}
                </small>
              )}
            </span>
            <button
              className="icon-button"
              type="button"
              aria-label="Desktop preview"
              aria-pressed={!mobile}
              onClick={() => setMobile(false)}
            >
              <Monitor />
            </button>
            <button
              className="icon-button"
              type="button"
              aria-label="Mobile preview"
              aria-pressed={mobile}
              onClick={() => setMobile(true)}
            >
              <DeviceMobile />
            </button>
            <button
              className="button primary small"
              type="button"
              onClick={() => {
                onChoose(preview.id, getDocument(preview));
                setPreview(null);
              }}
            >
              Use this design <ArrowRight />
            </button>
          </div>
          <div className={`design-full-preview ${mobile ? "mobile" : ""}`}>
            <Canvas
              width={mobile ? 390 : 1140}
              document={getDocument(preview)}
              preview
            />
          </div>
        </Modal>
      )}
    </>
  );
}

export function Designs() {
  const [, setParams] = useSearchParams();
  return (
    <>
      <Header />
      <main className="page wide-page">
        <div className="page-intro">
          <span className="eyebrow">A PLACE TO BEGIN</span>
          <h1>Find your starting point.</h1>
          <p>Ten different perspectives. Every detail is yours to change.</p>
        </div>
        <DesignGallery
          onChoose={(id) => {
            setParams({ design: id });
            window.location.assign(`/new?design=${id}`);
          }}
        />
        <div className="scratch-strip">
          <div>
            <h2>Have something else in mind?</h2>
            <p>Start with a blank canvas and a conversation.</p>
          </div>
          <Link className="button secondary" to="/new?scratch=true">
            Create from scratch <ArrowRight />
          </Link>
        </div>
      </main>
    </>
  );
}
