import {
  ArrowRight,
  CursorClick,
  DownloadSimple,
  Sparkle,
} from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { Footer, Header, PortfolioThumbnail } from "../components/ui";
import { templates } from "../data/templates";
export function Landing() {
  return (
    <>
      <Header />
      <main>
        <section className="landing-hero">
          <span className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</span>
          <h1>
            Your work deserves
            <br />a website.
          </h1>
          <p>
            Turn what you’ve done into something you’re proud to share.
            <br className="desktop-only" /> Create a portfolio with AI. Make it
            yours.
          </p>
          <Link className="button primary" to="/new">
            Create your portfolio <ArrowRight size={18} />
          </Link>
          <span className="microcopy">Free to start. No coding needed.</span>
        </section>
        <section
          className="landing-previews"
          aria-label="A few things you could create"
        >
          {templates.slice(0, 3).map((t) => (
            <Link
              key={t.id}
              to={`/designs?preview=${t.id}`}
              className={`preview-card ${t.id}`}
            >
              <PortfolioThumbnail document={t.document} height={320} />
              <span>
                {t.name}
                <small>{t.discipline}</small>
                <ArrowRight />
              </span>
            </Link>
          ))}
        </section>
        <section className="landing-benefits">
          <div>
            <Sparkle size={25} />
            <h2>A starting point that feels like you.</h2>
            <p>
              Choose one of ten considered designs, or describe something
              entirely your own.
            </p>
          </div>
          <div>
            <CursorClick size={25} />
            <h2>Change anything. Naturally.</h2>
            <p>
              Click to edit, move a section, or ask AI. You’re always in control
              of your website.
            </p>
          </div>
          <div>
            <DownloadSimple size={25} />
            <h2>Your work. Your website.</h2>
            <p>
              Publish in a few clicks. Take your files with you whenever you’re
              ready.
            </p>
          </div>
        </section>
        <section className="landing-end">
          <h2>
            A little help.
            <br />A lot of possibility.
          </h2>
          <Link className="button primary" to="/new">
            Let’s make something <ArrowRight />
          </Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
