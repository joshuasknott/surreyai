import { lazy, Suspense, useEffect, useState } from "react";
import { Link, Route, Routes, useLocation, useParams } from "react-router-dom";
import { Header, Loading, Notice } from "./components/ui";
import { Landing } from "./pages/Landing";
const Designs = lazy(() =>
  import("./pages/Designs").then((module) => ({ default: module.Designs })),
);
const Onboarding = lazy(() =>
  import("./pages/Onboarding").then((module) => ({
    default: module.Onboarding,
  })),
);
const Auth = lazy(() =>
  import("./pages/Auth").then((module) => ({ default: module.Auth })),
);
const Dashboard = lazy(() =>
  import("./pages/Dashboard").then((module) => ({ default: module.Dashboard })),
);
const Editor = lazy(() =>
  import("./pages/Editor").then((module) => ({ default: module.Editor })),
);
const Publish = lazy(() =>
  import("./pages/Publish").then((module) => ({ default: module.Publish })),
);
const Settings = lazy(() =>
  import("./pages/Settings").then((module) => ({ default: module.Settings })),
);
const AdminSetup = lazy(() =>
  import("./pages/AdminSetup").then((module) => ({
    default: module.AdminSetup,
  })),
);
const Admin = lazy(() =>
  import("./pages/Admin").then((module) => ({ default: module.Admin })),
);
import { PortfolioRenderer } from "./portfolio/PortfolioRenderer";
import { api, message } from "./lib/api";
import type { PortfolioDocument } from "../shared/portfolio";
function PublicPortfolio() {
  const { slug } = useParams();
  const [portfolio, setPortfolio] = useState<PortfolioDocument | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api<{ document: PortfolioDocument }>(
      `/public/${encodeURIComponent(slug || "")}`,
    )
      .then((r) => {
        setPortfolio(r.document);
        document.title = r.document.seo.title || r.document.name;
        const meta = document.querySelector('meta[name="description"]');
        meta?.setAttribute("content", r.document.seo.description);
      })
      .catch((e) => setError(message(e)));
  }, [slug]);
  return portfolio ? (
    <PortfolioRenderer document={portfolio} />
  ) : error ? (
    <main className="public-error">
      <h1>This page isn’t available.</h1>
      <p>It may have moved or its owner may have unpublished it.</p>
    </main>
  ) : (
    <Loading label="Loading portfolio…" />
  );
}
function Legal({ privacy = false }: { privacy?: boolean }) {
  return (
    <>
      <Header />
      <main className="page prose">
        <h1>
          {privacy
            ? "Your information, handled thoughtfully."
            : "A place for your work."}
        </h1>
        {privacy ? (
          <>
            <p>
              Portfolio Studio is a public project by Surrey AI Society. We
              store the account details, portfolio content and settings you
              choose to save.
            </p>
            <h2>What stays on your device</h2>
            <p>
              Your original uploaded CV is read in your browser. Its extracted
              text is only sent to an AI provider when you explicitly include it
              with a request, including when you choose to improve extraction
              with AI. Unsigned drafts are stored on this device.
            </p>
            <h2>What is shared</h2>
            <p>
              Publishing makes your chosen portfolio content publicly
              accessible. AI requests send your current portfolio, instructions,
              saved student information and any included CV text to the selected
              provider. Avoid including information you don’t want that provider
              to process. Their own terms and retention policies apply.
            </p>
            <p>
              Unused student information and hidden sections are excluded from
              published pages and website downloads. Editable source downloads
              are private backups and include that information.
            </p>
            <h2>Account and key security</h2>
            <p>
              Passwords are stored as salted hashes. Personal API keys are
              encrypted on the server and never included in exports. Session
              cookies keep you signed in; we don’t use advertising trackers.
            </p>
            <h2>Removing information</h2>
            <p>
              You can unpublish or delete a portfolio from your workspace.
              Contact the project maintainer through the repository for account
              deletion requests. Export your work before removing it.
            </p>
            <p>
              Infrastructure is provided by Cloudflare. Example gallery
              photographs may load from Unsplash; your browser connects to those
              services when viewing them.
            </p>
          </>
        ) : (
          <>
            <p>
              Portfolio Studio helps you create, edit and publish a portfolio.
              Your content and website belong to you. You can export your
              website and move to another host.
            </p>
            <h2>Keep it yours</h2>
            <p>
              Only upload content you own or have permission to use. Check
              factual accuracy, links, permissions and AI suggestions before
              publishing. Gallery biographies and projects are fictional
              examples.
            </p>
            <h2>A shared resource</h2>
            <p>
              Society AI and managed hosting have usage allowances. Availability
              can change. Keep an export of important work. Please don’t use the
              service for unlawful content, impersonation, spam or attempts to
              access another person’s data.
            </p>
            <h2>AI and external services</h2>
            <p>
              A consumer AI subscription does not automatically grant
              third-party API access. Connecting a personal API key uses that
              provider’s allowance and may incur charges under your account.
              Custom domains remain your responsibility and can be moved at any
              time.
            </p>
            <h2>Project and support</h2>
            <p>
              Portfolio Studio is maintained by Surrey AI Society. Report issues
              or request support through the{" "}
              <a href="https://github.com/joshuasknott/surreyai/issues">
                project repository
              </a>
              .
            </p>
          </>
        )}
      </main>
    </>
  );
}
function NotFound() {
  return (
    <>
      <Header />
      <main className="page auth-page">
        <h1>A little off the beaten path.</h1>
        <p>That page doesn’t exist.</p>
        <Link to="/dashboard" className="button primary">
          Back to your portfolios
        </Link>
      </main>
    </>
  );
}
export function App() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    if (!location.pathname.startsWith("/p/"))
      document.title = "Portfolio Studio — Your work deserves a website";
  }, [location.pathname]);
  return (
    <AppErrorBoundary>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/designs" element={<Designs />} />
          <Route path="/new" element={<Onboarding />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route
            path="/editor/:id"
            element={<Editor key={location.pathname} />}
          />
          <Route
            path="/publish/:id"
            element={<Publish key={location.pathname} />}
          />
          <Route path="/settings/:id" element={<Settings />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/setup" element={<AdminSetup />} />
          <Route path="/p/:slug" element={<PublicPortfolio />} />
          <Route path="/privacy" element={<Legal privacy />} />
          <Route path="/terms" element={<Legal />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </AppErrorBoundary>
  );
}
import { Component, type ReactNode } from "react";
class AppErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="page auth-page">
        <h1>Let’s try that again.</h1>
        <Notice>The page couldn’t load. Your saved portfolios are safe.</Notice>
        <button
          className="button primary"
          onClick={() => window.location.reload()}
        >
          Reload page
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
