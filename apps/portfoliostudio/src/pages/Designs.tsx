import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Check,
  DeviceMobile,
  Monitor,
} from "@phosphor-icons/react";
import { Header, Modal, PortfolioThumbnail } from "../components/ui";
import { templates } from "../data/templates";
import { Canvas } from "../components/Canvas";
import type { PortfolioTemplate } from "../../shared/portfolio";
export function DesignGallery({
  selected,
  onChoose,
}: {
  selected?: string;
  onChoose: (id: string) => void;
}) {
  const [filter, setFilter] = useState("All");
  const [preview, setPreview] = useState<PortfolioTemplate | null>(null);
  const [mobile, setMobile] = useState(false);
  return (
    <>
      <div className="filter-row">
        {["All", "Creative", "Technical", "Academic", "Professional"].map(
          (f) => (
            <button
              key={f}
              className={filter === f ? "active" : ""}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ),
        )}
      </div>
      <div className="design-grid">
        {templates
          .filter((t) => filter === "All" || t.category === filter)
          .map((t) => (
            <article
              key={t.id}
              className={`design-card ${selected === t.id ? "chosen" : ""}`}
            >
              <button
                className="design-image"
                onClick={() => setPreview(t)}
                aria-label={`Preview ${t.name}`}
              >
                <PortfolioThumbnail document={t.document} height={265} />
                <span className="preview-label">Preview design</span>
              </button>
              <div className="design-info">
                <div>
                  <h3>{t.name}</h3>
                  <p>{t.description}</p>
                </div>
                <button
                  className={
                    selected === t.id
                      ? "choose-design selected"
                      : "choose-design"
                  }
                  onClick={() => onChoose(t.id)}
                  aria-label={`Choose ${t.name}`}
                >
                  {selected === t.id ? <Check /> : <ArrowRight />}
                </button>
              </div>
              <span className="design-discipline">{t.discipline}</span>
            </article>
          ))}
      </div>
      {preview && (
        <Modal title={preview.name} wide onClose={() => setPreview(null)}>
          <div className="preview-actions">
            <span>{preview.description}</span>
            <button
              className="icon-button"
              aria-label="Desktop preview"
              aria-pressed={!mobile}
              onClick={() => setMobile(false)}
            >
              <Monitor />
            </button>
            <button
              className="icon-button"
              aria-label="Mobile preview"
              aria-pressed={mobile}
              onClick={() => setMobile(true)}
            >
              <DeviceMobile />
            </button>
            <button
              className="button primary small"
              onClick={() => {
                onChoose(preview.id);
                setPreview(null);
              }}
            >
              Use this design <ArrowRight />
            </button>
          </div>
          <div className={`design-full-preview ${mobile ? "mobile" : ""}`}>
            <Canvas
              width={mobile ? 390 : 1140}
              document={preview.document}
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
