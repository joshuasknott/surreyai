import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  Copy,
  DownloadSimple,
  Globe,
  Link as LinkIcon,
  LockKey,
  Package,
  UploadSimple,
  WarningCircle,
} from "@phosphor-icons/react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Header, Loading, Notice, PortfolioThumbnail } from "../components/ui";
import { WorkshopSteps } from "../components/WorkshopSteps";
import {
  api,
  loadProject,
  message,
  projectsApi,
  retainedDraftNotice,
  saveDraftToAccount,
} from "../lib/api";
import {
  downloadExport,
  exportFilename,
  exportPortfolioSite,
  exportPortfolioSource,
} from "../lib/export";
import { useAuth } from "../lib/auth";
import type { Project } from "../../shared/portfolio";
import "./settings.css";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s-]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}
type DomainRecord = {
  domain: string;
  status: "pending" | "active" | "error";
  dns: {
    txtName: string;
    txtVerified: boolean;
    cnameVerified: boolean;
    checkedAt: string;
  };
  providerStatus: string | null;
  lastError: string | null;
};
type DomainSetup = {
  domain: DomainRecord;
  cnameTarget: string;
  txtName: string;
  txtValue: string;
};

export function Publish() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [slug, setSlug] = useState("");
  const [publishedUrl, setPublishedUrl] = useState("");
  const [domainEnabled, setDomainEnabled] = useState<boolean | null>(null);
  const [domain, setDomain] = useState<DomainRecord | null>(null);
  const [domainSetup, setDomainSetup] = useState<DomainSetup | null>(null);
  const [domainInput, setDomainInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [domainBusy, setDomainBusy] = useState(false);
  const [error, setError] = useState(
    typeof location.state?.publishError === "string"
      ? location.state.publishError
      : "",
  );
  const [notice, setNotice] = useState(
    typeof location.state?.migrationNotice === "string"
      ? location.state.migrationNotice
      : "",
  );
  const [copied, setCopied] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const publicUrl =
    publishedUrl ||
    (project?.publishedAt && project.slug
      ? `${window.location.origin}/p/${project.slug}`
      : "");
  const canPublish = Boolean(project && user);
  useEffect(() => {
    let active = true;
    void loadProject(id)
      .then((value) => {
        if (!active) return;
        setProject(value);
        setSlug(value.publishedAt ? value.slug || "" : "");
        if (value.publishedAt && value.slug)
          setPublishedUrl(`${window.location.origin}/p/${value.slug}`);
      })
      .catch((e) => setError(message(e)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);
  useEffect(() => {
    if (!advancedOpen) return;
    if (!user || !project || project.id.startsWith("local_")) {
      setDomainEnabled(false);
      setDomain(null);
      setDomainSetup(null);
      return;
    }
    let active = true;
    void api<{ capabilities: { customDomains?: { enabled: boolean } } }>(
      "/config",
    )
      .then(async (config) => {
        if (!active) return;
        const enabled = config.capabilities.customDomains?.enabled === true;
        setDomainEnabled(enabled);
        if (enabled) {
          const result = await api<{ domain: DomainRecord | null }>(
            `/projects/${project.id}/domain`,
          );
          if (active) {
            setDomain(result.domain);
            setDomainInput(result.domain?.domain || "");
            if (result.domain) {
              const setup = await api<DomainSetup>(
                `/projects/${project.id}/domain`,
                {
                  method: "POST",
                  body: JSON.stringify({ domain: result.domain.domain }),
                },
              );
              if (active) setDomainSetup(setup);
            }
          }
        }
      })
      .catch((e) => active && setError(message(e)));
    return () => {
      active = false;
    };
  }, [project?.id, user?.id, advancedOpen]);
  const publish = async () => {
    if (!project || !canPublish) return;
    setBusy(true);
    setError("");
    setNotice("");
    let target = project;
    let migrationNotice = "";
    try {
      if (project.id.startsWith("local_")) {
        const saved = await saveDraftToAccount(project);
        target = saved.project;
        migrationNotice = saved.draftRetained ? retainedDraftNotice : "";
        setProject(target);
      }
      const result = await projectsApi.publish(
        target.id,
        target.publishedAt ? target.slug || undefined : slug || undefined,
        target.revision,
      );
      setProject(result.project);
      setSlug(result.project.slug || "");
      setPublishedUrl(result.publicUrl);
      setNotice(target.publishedAt ? "Your latest changes are now live." : "");
      if (target.id !== id)
        navigate(`/publish/${target.id}`, {
          replace: true,
          state: { migrationNotice },
        });
    } catch (e) {
      setError(message(e));
      if (target.id !== id)
        navigate(`/publish/${target.id}`, {
          replace: true,
          state: { publishError: message(e), migrationNotice },
        });
    } finally {
      setBusy(false);
    }
  };
  const unpublish = async () => {
    if (!project || project.id.startsWith("local_")) return;
    setBusy(true);
    setError("");
    try {
      const result = await api<{ project: Project }>(
        `/projects/${project.id}/unpublish`,
        {
          method: "POST",
          body: JSON.stringify({ expectedRevision: project.revision }),
        },
      );
      setProject(result.project);
      setPublishedUrl("");
      setNotice("The public page is now offline.");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };
  const copyUrl = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError(
        "Copy is unavailable in this browser. Select the address and copy it instead.",
      );
    }
  };
  const exportSite = async (source: boolean) => {
    if (!project) return;
    setBusy(true);
    setError("");
    try {
      const blob = source
        ? await exportPortfolioSource(project.document)
        : await exportPortfolioSite(project.document);
      downloadExport(blob, exportFilename(project.document, source));
      setNotice(
        source
          ? "Editable source export downloaded."
          : "Website export downloaded.",
      );
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };
  const connectDomain = async () => {
    if (!project || !domainInput.trim()) return;
    setDomainBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await api<DomainSetup>(`/projects/${project.id}/domain`, {
        method: "POST",
        body: JSON.stringify({ domain: domainInput.trim() }),
      });
      setDomain(result.domain);
      setDomainSetup(result);
      setDomainInput(result.domain.domain);
      setNotice("Domain reserved. Add the DNS records below, then verify.");
    } catch (e) {
      setError(message(e));
    } finally {
      setDomainBusy(false);
    }
  };
  const verifyDomain = async () => {
    if (!project) return;
    setDomainBusy(true);
    setError("");
    try {
      const result = await api<{
        domain: DomainRecord;
        dns: DomainRecord["dns"];
        cnameTarget: string;
      }>(`/projects/${project.id}/domain/verify`, { method: "POST" });
      setDomain(result.domain);
      setDomainSetup((current) =>
        current
          ? {
              ...current,
              domain: result.domain,
              cnameTarget: result.cnameTarget,
              txtName: result.dns.txtName,
            }
          : current,
      );
      setNotice(
        result.domain.status === "active"
          ? "Domain connected and active."
          : "DNS is still propagating. Check again in a few minutes.",
      );
    } catch (e) {
      setError(message(e));
    } finally {
      setDomainBusy(false);
    }
  };
  const disconnectDomain = async () => {
    if (
      !project ||
      !domain ||
      !window.confirm(
        `Disconnect ${domain.domain}? This removes its Portfolio Studio domain configuration.`,
      )
    )
      return;
    setDomainBusy(true);
    setError("");
    try {
      await api(`/projects/${project.id}/domain`, { method: "DELETE" });
      setDomain(null);
      setDomainSetup(null);
      setDomainInput("");
      setNotice("Custom domain disconnected.");
    } catch (e) {
      setError(message(e));
    } finally {
      setDomainBusy(false);
    }
  };
  const copyText = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setNotice("Copied to clipboard.");
    } catch {
      setError(
        "Copy is unavailable in this browser. Select the value and copy it instead.",
      );
    }
  };
  return (
    <>
      <Header />
      <main className="page wide-page settings-page publish-page">
        <Link className="back-link" to={`/editor/${id}`}>
          <ArrowLeft />
          Back to editor
        </Link>
        <WorkshopSteps current="publish" projectId={id} />
        <div className="page-intro publish-intro">
          <span className="eyebrow">READY WHEN YOU ARE</span>
          <h1>Publish your portfolio.</h1>
          <p>Share your work with a link. Update it whenever you like.</p>
        </div>
        {loading ? (
          <Loading label="Loading your publishing options…" />
        ) : error && !project ? (
          <Notice>{error}</Notice>
        ) : (
          project && (
            <>
              <div className="publish-grid">
                <section className="settings-card publish-card">
                  <div className="card-icon">
                    <Globe size={22} />
                  </div>
                  <div className="card-heading">
                    <div>
                      <span className="eyebrow">YOUR INCLUDED LINK</span>
                      <h2>
                        {project.publishedAt
                          ? "Your portfolio is live"
                          : "Ready to share"}
                      </h2>
                    </div>
                    {project.publishedAt && (
                      <span className="live-pill">
                        <span />
                        Live
                      </span>
                    )}
                  </div>
                  <p className="card-lead">
                    {project.publishedAt
                      ? "Your link stays the same whenever you publish changes."
                      : "Portfolio Studio will assign a secure public address for you automatically. No hosting account or setup is needed."}
                  </p>
                  {project.id.startsWith("local_") && !user && (
                    <div className="publish-account-note">
                      <LockKey size={18} />
                      <span>
                        Create a free Studio account to save your work and
                        publish.
                      </span>
                      <Link
                        className="button primary publish-primary-action"
                        to={`/auth?mode=signup&draft=${project.id}&intent=publish`}
                      >
                        Save &amp; publish <span aria-hidden="true">↗</span>
                      </Link>
                    </div>
                  )}
                  {error && <Notice>{error}</Notice>}
                  {notice && <Notice success>{notice}</Notice>}
                  {project.publishedAt && publicUrl ? (
                    <div className="publish-success" role="status">
                      <div className="publish-success-mark">
                        <Check size={20} weight="bold" />
                      </div>
                      <div>
                        <strong>Live and ready to share</strong>
                        <p>Your portfolio is available at this address.</p>
                      </div>
                      <div className="published-address">
                        <a href={publicUrl} target="_blank" rel="noreferrer">
                          {publicUrl} <span aria-hidden="true">↗</span>
                        </a>
                        <button
                          className="button secondary small"
                          onClick={() => void copyUrl()}
                        >
                          {copied ? <Check /> : <Copy />}
                          {copied ? "Copied" : "Copy address"}
                        </button>
                      </div>
                    </div>
                  ) : user ? (
                    <button
                      className="button primary publish-primary-action"
                      disabled={!canPublish || busy}
                      onClick={() => void publish()}
                    >
                      {busy
                        ? project.id.startsWith("local_")
                          ? "Saving and publishing…"
                          : "Publishing…"
                        : "Publish portfolio"}{" "}
                      <Globe />
                    </button>
                  ) : null}
                  {project.publishedAt && (
                    <button
                      className="button primary publish-primary-action"
                      disabled={busy}
                      onClick={() => void publish()}
                    >
                      {busy ? "Publishing…" : "Publish latest changes"}
                      <Globe />
                    </button>
                  )}
                </section>
                <aside className="publish-preview">
                  <div className="preview-heading">
                    <span className="eyebrow">SITE PREVIEW</span>
                  </div>
                  <PortfolioThumbnail
                    document={project.document}
                    height={420}
                  />
                  <Link className="preview-link" to={`/editor/${id}?preview=1`}>
                    Open full preview in editor{" "}
                    <span aria-hidden="true">↗</span>
                  </Link>
                </aside>
              </div>
              <details
                className="publish-details"
                onToggle={(event) => setAdvancedOpen(event.currentTarget.open)}
              >
                <summary>
                  <span>Advanced options</span>
                  <small>Address, downloads and custom domains</small>
                </summary>
                <div className="publish-details-body">
                  <section className="settings-card publish-advanced-card">
                    <span className="eyebrow">OPTIONAL ADDRESS</span>
                    <h2>Choose your Portfolio Studio address</h2>
                    <p className="card-lead">
                      Leave this blank to use an address generated for you.
                      Existing live links stay unchanged when you republish.
                    </p>
                    <label className="field-label">
                      Address handle
                      <div className="slug-field">
                        <span>{window.location.host}/p/</span>
                        <input
                          value={slug}
                          placeholder={slugify(project.name)}
                          onChange={(event) =>
                            setSlug(slugify(event.target.value))
                          }
                          disabled={busy || Boolean(project.publishedAt)}
                          aria-label="Public portfolio slug"
                        />
                        <button
                          className="icon-button"
                          onClick={() => setSlug(slugify(project.name))}
                          disabled={busy || Boolean(project.publishedAt)}
                          aria-label="Use portfolio name for address"
                        >
                          <UploadSimple size={17} />
                        </button>
                      </div>
                    </label>
                    {project.publishedAt && (
                      <div className="publish-live-actions">
                        <button
                          className="text-button danger-text"
                          disabled={busy}
                          onClick={() => {
                            if (
                              window.confirm(
                                "Take this portfolio offline? You can publish it again at any time.",
                              )
                            )
                              void unpublish();
                          }}
                        >
                          Take portfolio offline
                        </button>
                      </div>
                    )}
                  </section>
                  <section className="settings-card export-card">
                    <div className="card-icon">
                      <Package size={22} />
                    </div>
                    <div>
                      <span className="eyebrow">TAKE IT WITH YOU</span>
                      <h2>Export your website</h2>
                      <p className="card-lead">
                        Download a complete static copy with local images,
                        styles, fonts and your editable portfolio document. No
                        account keys are included.
                      </p>
                      <div className="export-actions">
                        <button
                          className="button secondary"
                          disabled={busy}
                          onClick={() => void exportSite(false)}
                        >
                          <DownloadSimple />
                          {busy ? "Preparing…" : "Download website"}
                        </button>
                        <button
                          className="button secondary"
                          disabled={busy}
                          onClick={() => void exportSite(true)}
                        >
                          <UploadSimple />
                          Download editable source
                        </button>
                      </div>
                      <p className="help-text">
                        The editable source is a private backup, including saved
                        CV details and hidden sections. Use the website download
                        for public hosting.
                      </p>
                    </div>
                  </section>
                  <section className="settings-card domain-card">
                    <div className="card-icon">
                      <LinkIcon size={22} />
                    </div>
                    <div>
                      <span className="eyebrow">YOUR OWN DOMAIN</span>
                      <h2>Bring your own address when you’re ready.</h2>
                      {project.id.startsWith("local_") ? (
                        <p className="card-lead">
                          Publish to your included address first. You can
                          connect a personal domain afterwards.
                        </p>
                      ) : domainEnabled === false ? (
                        <>
                          <p className="card-lead">
                            Custom domain connections are not enabled on this
                            Studio yet. Your free Portfolio Studio address and
                            downloads are ready to use now.
                          </p>
                          <span className="capability-note">
                            <WarningCircle /> Hosting owner setup is required
                            before a domain can be connected.
                          </span>
                        </>
                      ) : domainEnabled === null ? (
                        <p className="card-lead">
                          Checking custom domain availability…
                        </p>
                      ) : (
                        <>
                          <p className="card-lead">
                            Connect a subdomain you already own. We’ll show the
                            exact DNS records, verify them, and wait for hosting
                            SSL to become active.
                          </p>
                          {!domain && (
                            <>
                              <label className="field-label">
                                Your subdomain
                                <input
                                  value={domainInput}
                                  onChange={(event) =>
                                    setDomainInput(event.target.value)
                                  }
                                  placeholder="portfolio.example.com"
                                  disabled={domainBusy}
                                />
                              </label>
                              <button
                                className="button secondary domain-action"
                                disabled={domainBusy || !domainInput.trim()}
                                onClick={() => void connectDomain()}
                              >
                                {domainBusy
                                  ? "Connecting…"
                                  : "Show DNS instructions"}{" "}
                                <LinkIcon />
                              </button>
                            </>
                          )}
                          {domain && (
                            <div className="domain-status">
                              <div className="domain-status-heading">
                                <strong>{domain.domain}</strong>
                                <span
                                  className={`domain-state ${domain.status}`}
                                >
                                  {domain.status === "active"
                                    ? "Active"
                                    : domain.status === "error"
                                      ? "Needs attention"
                                      : "DNS pending"}
                                </span>
                              </div>
                              <p className="field-help">
                                {domain.status === "active"
                                  ? `Your domain is active${domain.providerStatus ? ` (${domain.providerStatus})` : ""}.`
                                  : domain.lastError ||
                                    "Add the records below, then verify. SSL can take a few minutes after DNS is correct."}
                              </p>
                              {domainSetup && (
                                <div className="dns-instructions">
                                  <div>
                                    <span>TXT name</span>
                                    <code>{domainSetup.txtName}</code>
                                    <button
                                      className="icon-button"
                                      onClick={() =>
                                        void copyText(domainSetup.txtName)
                                      }
                                      aria-label="Copy TXT name"
                                    >
                                      <Copy size={16} />
                                    </button>
                                  </div>
                                  <div>
                                    <span>TXT value</span>
                                    <code>{domainSetup.txtValue}</code>
                                    <button
                                      className="icon-button"
                                      onClick={() =>
                                        void copyText(domainSetup.txtValue)
                                      }
                                      aria-label="Copy TXT value"
                                    >
                                      <Copy size={16} />
                                    </button>
                                  </div>
                                  <div>
                                    <span>CNAME target</span>
                                    <code>{domainSetup.cnameTarget}</code>
                                    <button
                                      className="icon-button"
                                      onClick={() =>
                                        void copyText(domainSetup.cnameTarget)
                                      }
                                      aria-label="Copy CNAME target"
                                    >
                                      <Copy size={16} />
                                    </button>
                                  </div>
                                </div>
                              )}
                              {domain.status !== "active" && (
                                <button
                                  className="button secondary domain-action"
                                  disabled={domainBusy}
                                  onClick={() => void verifyDomain()}
                                >
                                  {domainBusy
                                    ? "Checking DNS…"
                                    : "Verify DNS records"}{" "}
                                  <Check />
                                </button>
                              )}
                              <button
                                className="text-button danger-text"
                                disabled={domainBusy}
                                onClick={() => void disconnectDomain()}
                              >
                                Disconnect domain
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </section>
                </div>
              </details>
            </>
          )
        )}
      </main>
    </>
  );
}
