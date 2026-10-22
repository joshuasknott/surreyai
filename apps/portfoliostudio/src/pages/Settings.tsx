import { useEffect, useState } from "react";
import {
  ArrowCounterClockwise,
  ArrowLeft,
  Check,
  Copy,
  DownloadSimple,
  Key,
  Link as LinkIcon,
  Plus,
  ShieldCheck,
  Sparkle,
  Trash,
  UserCircle,
} from "@phosphor-icons/react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Header, Loading, Notice } from "../components/ui";
import { api, loadProject, message, projectsApi, saveDraft } from "../lib/api";
import { useAuth } from "../lib/auth";
import { syncProfileSections } from "../lib/profile";
import type {
  AiMode,
  PortfolioDocument,
  Project,
  ProjectVersion,
} from "../../shared/portfolio";
import "./settings.css";

type AiSettings = {
  mode: AiMode;
  provider: string | null;
  hasApiKey: boolean;
  updatedAt: string | null;
};
type AiProvider = {
  id: string;
  name: string;
  enabled: boolean;
  models: string[];
  hasApiKey: boolean;
};
type LinkValue = { id: string; label: string; url: string };

const personalProviders: AiProvider[] = [
  {
    id: "openai",
    name: "OpenAI",
    enabled: true,
    models: ["gpt-5-mini", "gpt-4.1-mini"],
    hasApiKey: false,
  },
  {
    id: "anthropic",
    name: "Anthropic",
    enabled: true,
    models: ["claude-sonnet-4-5-20250929", "claude-haiku-4-5-20251001"],
    hasApiKey: false,
  },
  {
    id: "gemini",
    name: "Google Gemini",
    enabled: true,
    models: ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.5-pro"],
    hasApiKey: false,
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    enabled: true,
    models: ["openai/gpt-5-mini"],
    hasApiKey: false,
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    enabled: true,
    models: ["deepseek-v4-flash"],
    hasApiKey: false,
  },
];

function readModel(id: string) {
  try {
    return localStorage.getItem(`portfolio-studio:ai-model:${id}`) || "";
  } catch {
    return "";
  }
}
function writeModel(id: string, model: string) {
  try {
    localStorage.setItem(`portfolio-studio:ai-model:${id}`, model);
  } catch {
    /* private browsing can reject storage */
  }
}

export function Settings() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [aiSettings, setAiSettings] = useState<AiSettings>({
    mode: "society",
    provider: null,
    hasApiKey: false,
    updatedAt: null,
  });
  const [selectedModel, setSelectedModel] = useState("");
  const [portfolioName, setPortfolioName] = useState("");
  const [profileName, setProfileName] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [email, setEmail] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [links, setLinks] = useState<LinkValue[]>([]);
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [keyNeedsReplacement, setKeyNeedsReplacement] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.all([
      loadProject(id),
      user
        ? projectsApi
            .versions(id)
            .catch(() => ({ versions: [] as ProjectVersion[] }))
        : Promise.resolve({ versions: [] as ProjectVersion[] }),
    ])
      .then(([loaded, versionResult]) => {
        if (!active) return;
        setProject(loaded);
        setVersions(versionResult.versions);
        setPortfolioName(loaded.document.name);
        setProfileName(loaded.document.profile.name);
        setHeadline(loaded.document.profile.headline);
        setBio(loaded.document.profile.bio);
        setLocation(loaded.document.profile.location);
        setEmail(loaded.document.profile.email);
        setSeoTitle(loaded.document.seo.title);
        setSeoDescription(loaded.document.seo.description);
        setLinks(loaded.document.profile.links);
      })
      .catch((e) => setError(message(e)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id, user]);

  useEffect(() => {
    if (!user) return;
    void Promise.all([
      api<{ settings: AiSettings }>("/ai/settings"),
      api<{ providers: AiProvider[] }>("/ai/providers"),
    ])
      .then(([settings, providerResult]) => {
        setAiSettings(settings.settings);
        setProviders(providerResult.providers);
        if (settings.settings.provider) {
          const provider = providerResult.providers.find(
            (item) => item.id === settings.settings.provider,
          );
          const storedModel = readModel(settings.settings.provider);
          setSelectedModel(
            settings.settings.mode === "society" &&
              provider &&
              !provider.models.includes(storedModel)
              ? provider.models[0] || ""
              : storedModel,
          );
        }
      })
      .catch((e) => setError(message(e)));
  }, [user]);

  const providerOptions =
    aiSettings.mode === "society" ? providers : personalProviders;
  const activeProvider =
    providerOptions.find((provider) => provider.id === aiSettings.provider) ||
    providerOptions[0];
  const hasUnsavedProfile = project
    ? portfolioName !== project.document.name ||
      profileName !== project.document.profile.name ||
      headline !== project.document.profile.headline ||
      bio !== project.document.profile.bio ||
      location !== project.document.profile.location ||
      email !== project.document.profile.email ||
      seoTitle !== project.document.seo.title ||
      seoDescription !== project.document.seo.description ||
      JSON.stringify(links) !== JSON.stringify(project.document.profile.links)
    : false;

  const saveProfile = async () => {
    if (!project) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const safePortfolioName = portfolioName.trim() || project.document.name;
      const safeProfileName =
        profileName.trim() || project.document.profile.name;
      const document: PortfolioDocument = {
        ...project.document,
        name: safePortfolioName,
        profile: {
          ...project.document.profile,
          name: safeProfileName,
          headline: headline.trim(),
          bio,
          location: location.trim(),
          email: email.trim(),
          links: links
            .filter((link) => link.label.trim() || link.url.trim())
            .map((link) => ({
              ...link,
              label: link.label.trim(),
              url: link.url.trim(),
            })),
        },
        sections: syncProfileSections(project.document, {
          name: safeProfileName,
          headline,
          bio,
          email,
        }),
        seo: {
          title: seoTitle.trim() || `${safeProfileName} — Portfolio`,
          description: seoDescription.trim() || bio.slice(0, 400),
        },
      };
      const saved = project.id.startsWith("local_")
        ? (() => {
            const local = {
              ...project,
              name: document.name,
              document,
              updatedAt: new Date().toISOString(),
              revision: project.revision + 1,
            };
            saveDraft(local);
            return local;
          })()
        : (
            await projectsApi.update({
              ...project,
              name: document.name,
              document,
            })
          ).project;
      setProject(saved);
      setNotice("Portfolio settings saved.");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };

  const saveAi = async () => {
    if (!user || !project) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await api<{ settings: AiSettings }>("/ai/settings", {
        method: "PATCH",
        body: JSON.stringify({
          mode: aiSettings.mode,
          provider: aiSettings.provider,
          ...(aiKeyVisible && apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
          ...(aiKeyVisible && keyNeedsReplacement && !apiKey.trim()
            ? { clearApiKey: true }
            : {}),
        }),
      });
      if (aiSettings.provider && selectedModel)
        writeModel(aiSettings.provider, selectedModel);
      setAiSettings(result.settings);
      setApiKey("");
      setKeyNeedsReplacement(false);
      try {
        const nextProject = { ...project, aiMode: aiSettings.mode };
        const saved = project.id.startsWith("local_")
          ? (() => {
              const local = {
                ...nextProject,
                updatedAt: new Date().toISOString(),
                revision: project.revision + 1,
              };
              saveDraft(local);
              return local;
            })()
          : (await projectsApi.update(nextProject)).project;
        setProject(saved);
        setNotice("AI access settings saved.");
      } catch (syncError) {
        setError(
          `AI access was saved, but the portfolio mode could not be synced: ${message(syncError)}`,
        );
      }
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };

  const restore = async (version: ProjectVersion) => {
    if (!project || project.id.startsWith("local_")) return;
    if (
      hasUnsavedProfile &&
      !window.confirm(
        "You have unsaved settings. Restore this version and discard them?",
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      const result = await projectsApi.restore(
        project.id,
        version.id,
        project.revision,
      );
      const document = result.project.document;
      setProject(result.project);
      setPortfolioName(document.name);
      setProfileName(document.profile.name);
      setHeadline(document.profile.headline);
      setBio(document.profile.bio);
      setLocation(document.profile.location);
      setEmail(document.profile.email);
      setSeoTitle(document.seo.title);
      setSeoDescription(document.seo.description);
      setLinks(document.profile.links);
      setNotice(`Restored “${version.label}”.`);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };

  const newRecoveryCode = async () => {
    if (!user) return;
    setBusy(true);
    setError("");
    try {
      const result = await api<{ recoveryCode: string }>(
        "/auth/recovery-code",
        { method: "POST" },
      );
      setRecoveryCode(result.recoveryCode);
      setNotice("Recovery code created. Store it somewhere safe.");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };

  const addLink = () =>
    setLinks([
      ...links,
      { id: `link_${crypto.randomUUID()}`, label: "", url: "" },
    ]);
  const copyRecoveryCode = async () => {
    if (!recoveryCode) return;
    try {
      await navigator.clipboard.writeText(recoveryCode);
      setNotice("Recovery code copied.");
    } catch {
      setError(
        "Copy was blocked by the browser. Select the code and copy it manually.",
      );
    }
  };
  const downloadRecoveryCode = () => {
    if (!recoveryCode) return;
    const url = URL.createObjectURL(
      new Blob([`Portfolio Studio recovery code\n\n${recoveryCode}\n`], {
        type: "text/plain;charset=utf-8",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "portfolio-studio-recovery-code.txt";
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const selectProvider = (
    providerId: string | null,
    mode = aiSettings.mode,
  ) => {
    const options = mode === "society" ? providers : personalProviders;
    const provider =
      options.find((item) => item.id === providerId) || options[0];
    const savedModel = provider ? readModel(provider.id) : "";
    const model =
      mode === "society" && provider && !provider.models.includes(savedModel)
        ? provider.models[0] || ""
        : savedModel || provider?.models[0] || "";
    if (mode === "key" && provider?.id !== aiSettings.provider)
      setKeyNeedsReplacement(true);
    setAiSettings((current) => ({
      ...current,
      mode,
      provider: provider?.id || null,
      ...(mode === "key" && provider?.id !== current.provider
        ? { hasApiKey: false }
        : {}),
    }));
    setSelectedModel(model);
    if (mode !== "key") setApiKey("");
  };
  const changeAiMode = (mode: AiMode) =>
    selectProvider(aiSettings.provider, mode);
  const changeAiProvider = (providerId: string) => selectProvider(providerId);
  const aiKeyVisible = aiSettings.mode === "key";

  return (
    <>
      <Header />
      <main className="page settings-page">
        <Link className="back-link" to={`/editor/${id}`}>
          <ArrowLeft />
          Back to editor
        </Link>
        <div className="page-intro">
          <span className="eyebrow">PORTFOLIO SETTINGS</span>
          <h1>{project ? project.name : "Portfolio settings"}</h1>
          <p>
            Shape what people see, how AI helps and how you can return to
            earlier work.
          </p>
        </div>
        {loading ? (
          <Loading />
        ) : error && !project ? (
          <Notice>{error}</Notice>
        ) : (
          project && (
            <div className="settings-layout">
              <div className="settings-main">
                {error && <Notice>{error}</Notice>}
                {notice && <Notice success>{notice}</Notice>}
                <section className="settings-card">
                  <div className="card-heading">
                    <div>
                      <span className="eyebrow">PROFILE</span>
                      <h2>Tell your story clearly.</h2>
                    </div>
                    <UserCircle className="card-heading-icon" size={25} />
                  </div>
                  <div className="settings-form">
                    <label className="field-label">
                      Portfolio name
                      <input
                        value={portfolioName}
                        onChange={(e) => setPortfolioName(e.target.value)}
                        maxLength={120}
                      />
                    </label>
                    <label className="field-label">
                      Your name
                      <input
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        maxLength={120}
                      />
                    </label>
                    <div className="form-grid">
                      <label className="field-label">
                        Headline
                        <input
                          value={headline}
                          onChange={(e) => setHeadline(e.target.value)}
                          maxLength={240}
                        />
                      </label>
                      <label className="field-label">
                        Location
                        <input
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          maxLength={120}
                          placeholder="Guildford, UK"
                        />
                      </label>
                    </div>
                    <label className="field-label">
                      About you
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        maxLength={6000}
                        rows={6}
                      />
                    </label>
                    <div className="form-grid">
                      <label className="field-label">
                        Email
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          maxLength={254}
                        />
                      </label>
                      <span className="field-help">
                        Only share an email you want visitors to use.
                      </span>
                    </div>
                    <div className="links-editor">
                      <div className="subheading">
                        <strong>Links</strong>
                        <button className="text-button" onClick={addLink}>
                          <Plus />
                          Add link
                        </button>
                      </div>
                      {links.map((link, index) => (
                        <div className="link-row" key={link.id}>
                          <LinkIcon size={18} />
                          <input
                            aria-label={`Link ${index + 1} label`}
                            placeholder="Label"
                            value={link.label}
                            onChange={(e) =>
                              setLinks(
                                links.map((item) =>
                                  item.id === link.id
                                    ? { ...item, label: e.target.value }
                                    : item,
                                ),
                              )
                            }
                          />
                          <input
                            aria-label={`Link ${index + 1} URL`}
                            placeholder="https://…"
                            value={link.url}
                            onChange={(e) =>
                              setLinks(
                                links.map((item) =>
                                  item.id === link.id
                                    ? { ...item, url: e.target.value }
                                    : item,
                                ),
                              )
                            }
                          />
                          <button
                            className="icon-button"
                            aria-label={`Remove link ${index + 1}`}
                            onClick={() =>
                              setLinks(
                                links.filter((item) => item.id !== link.id),
                              )
                            }
                          >
                            <Trash size={17} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="card-actions">
                    <button
                      className="button primary"
                      disabled={busy}
                      onClick={() => void saveProfile()}
                    >
                      {busy ? "Saving…" : "Save profile"} <Check />
                    </button>
                  </div>
                </section>
                <section className="settings-card">
                  <div className="card-heading">
                    <div>
                      <span className="eyebrow">SEARCH PREVIEW</span>
                      <h2>Make the first impression count.</h2>
                    </div>
                  </div>
                  <label className="field-label">
                    Page title
                    <input
                      value={seoTitle}
                      onChange={(e) => setSeoTitle(e.target.value)}
                      maxLength={160}
                    />
                  </label>
                  <label className="field-label">
                    Description
                    <textarea
                      value={seoDescription}
                      onChange={(e) => setSeoDescription(e.target.value)}
                      maxLength={400}
                      rows={3}
                    />
                  </label>
                  <div className="card-actions">
                    <button
                      className="button secondary"
                      disabled={busy}
                      onClick={() => void saveProfile()}
                    >
                      Save search preview
                    </button>
                  </div>
                </section>
                {user && (
                  <section className="settings-card">
                    <div className="card-heading">
                      <div>
                        <span className="eyebrow">AI ACCESS</span>
                        <h2>Choose how your assistant works.</h2>
                      </div>
                      <Sparkle className="card-heading-icon" size={25} />
                    </div>
                    <div className="ai-settings-list">
                      <button
                        className={`ai-setting-row ${aiSettings.mode === "society" ? "selected" : ""}`}
                        onClick={() => changeAiMode("society")}
                      >
                        <Sparkle />
                        <span>
                          <strong>Use Surrey AI Society AI</strong>
                          <small>Shared, configured models for students.</small>
                        </span>
                        <span className="radio-dot">
                          {aiSettings.mode === "society" && <Check size={12} />}
                        </span>
                      </button>
                      <button
                        className={`ai-setting-row ${aiSettings.mode === "account" ? "selected" : ""}`}
                        onClick={() => changeAiMode("account")}
                      >
                        <UserCircle />
                        <span>
                          <strong>Sign in with an AI provider</strong>
                          <small>
                            Account connections are not enabled yet.
                          </small>
                        </span>
                        <span className="radio-dot">
                          {aiSettings.mode === "account" && <Check size={12} />}
                        </span>
                      </button>
                      <button
                        className={`ai-setting-row ${aiSettings.mode === "key" ? "selected" : ""}`}
                        onClick={() => changeAiMode("key")}
                      >
                        <Key />
                        <span>
                          <strong>Use your own API key</strong>
                          <small>
                            {aiSettings.hasApiKey
                              ? "A key is stored securely."
                              : "Connect your own allowance."}
                          </small>
                        </span>
                        <span className="radio-dot">
                          {aiSettings.mode === "key" && <Check size={12} />}
                        </span>
                      </button>
                    </div>
                    <div className="form-grid">
                      <label className="field-label">
                        Provider
                        <select
                          value={aiSettings.provider || ""}
                          onChange={(e) =>
                            changeAiProvider(e.target.value || "")
                          }
                        >
                          <option value="">Choose a provider</option>
                          {providerOptions.map((provider) => (
                            <option key={provider.id} value={provider.id}>
                              {provider.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      {aiSettings.mode === "society" ? (
                        <label className="field-label">
                          Model{" "}
                          <span className="optional">
                            enabled by the society
                          </span>
                          <select
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            disabled={!activeProvider?.models.length}
                          >
                            <option value="">
                              {activeProvider?.models.length
                                ? "Choose a model"
                                : "No enabled models"}
                            </option>
                            {activeProvider?.models.map((model) => (
                              <option key={model} value={model}>
                                {model}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : (
                        <label className="field-label">
                          Model{" "}
                          <span className="optional">saved on this device</span>
                          <input
                            list="portfolio-ai-models"
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            placeholder={
                              activeProvider?.models[0] || "Enter a model name"
                            }
                          />
                          <datalist id="portfolio-ai-models">
                            {activeProvider?.models.map((model) => (
                              <option key={model} value={model} />
                            ))}
                          </datalist>
                        </label>
                      )}
                    </div>
                    {aiKeyVisible && (
                      <label className="field-label">
                        API key{" "}
                        {aiSettings.hasApiKey && !keyNeedsReplacement && (
                          <span className="optional">stored</span>
                        )}
                        <input
                          type="password"
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder={
                            keyNeedsReplacement
                              ? "Enter a new key for this provider"
                              : aiSettings.hasApiKey
                                ? "Enter a new key to replace it"
                                : "sk-…"
                          }
                          autoComplete="off"
                        />
                      </label>
                    )}
                    {keyNeedsReplacement && aiKeyVisible && (
                      <p className="field-help">
                        This provider needs a new key. Saving will clear the
                        previous provider key.
                      </p>
                    )}
                    <p className="field-help">
                      <ShieldCheck />{" "}
                      {aiKeyVisible
                        ? "Keys are encrypted on the server and never included in exports."
                        : aiSettings.mode === "society"
                          ? "Society models are limited to the enabled list above."
                          : "Model preferences stay on this device; enter any model supported by your provider."}
                    </p>
                    <div className="card-actions">
                      <button
                        className="button primary"
                        disabled={
                          busy ||
                          (aiSettings.mode === "society" &&
                            !activeProvider?.models.length)
                        }
                        onClick={() => void saveAi()}
                      >
                        {busy ? "Saving…" : "Save AI settings"} <Check />
                      </button>
                    </div>
                  </section>
                )}
                {user && (
                  <section className="settings-card">
                    <div className="card-heading">
                      <div>
                        <span className="eyebrow">SAVED VERSIONS</span>
                        <h2>Return to a version you trust.</h2>
                      </div>
                      <ArrowCounterClockwise
                        className="card-heading-icon"
                        size={25}
                      />
                    </div>
                    {versions.length ? (
                      <div className="version-list">
                        {versions.map((version) => (
                          <div className="version-row" key={version.id}>
                            <div>
                              <strong>{version.label}</strong>
                              <small>
                                {new Date(version.createdAt).toLocaleString()}
                              </small>
                            </div>
                            <button
                              className="button secondary small"
                              disabled={busy}
                              onClick={() => void restore(version)}
                            >
                              Restore
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="field-help">
                        Versions appear after you save a cloud portfolio.
                      </p>
                    )}
                  </section>
                )}
                {user && (
                  <section className="settings-card security-card">
                    <div className="card-heading">
                      <div>
                        <span className="eyebrow">ACCOUNT RECOVERY</span>
                        <h2>Keep a recovery code somewhere safe.</h2>
                      </div>
                      <ShieldCheck className="card-heading-icon" size={25} />
                    </div>
                    <p className="card-lead">
                      A recovery code lets you reset your password if you lose
                      access. We only show a new code once.
                    </p>
                    {recoveryCode && (
                      <>
                        <code className="recovery-code">{recoveryCode}</code>
                        <div className="export-actions">
                          <button
                            className="button secondary small"
                            onClick={() => void copyRecoveryCode()}
                          >
                            <Copy />
                            Copy code
                          </button>
                          <button
                            className="button secondary small"
                            onClick={downloadRecoveryCode}
                          >
                            <DownloadSimple />
                            Download
                          </button>
                        </div>
                      </>
                    )}
                    <button
                      className="button secondary"
                      disabled={busy}
                      onClick={() => void newRecoveryCode()}
                    >
                      {recoveryCode
                        ? "Generate a new code"
                        : "Generate recovery code"}
                    </button>
                  </section>
                )}
              </div>
              <aside className="settings-side">
                <div className="settings-sticky">
                  <div className="settings-side-preview">
                    <span className="eyebrow">CURRENT PORTFOLIO</span>
                    <div className="side-preview-placeholder">
                      <span>{profileName.slice(0, 1).toUpperCase()}</span>
                      <strong>{headline || portfolioName}</strong>
                    </div>
                  </div>
                  <Link
                    className="button secondary full-button"
                    to={`/publish/${id}`}
                  >
                    Publish & share <ArrowLeft className="flip-x" />
                  </Link>
                  <button
                    className="text-button danger-text"
                    onClick={() => navigate("/dashboard")}
                  >
                    Leave settings
                  </button>
                </div>
              </aside>
            </div>
          )
        )}
      </main>
    </>
  );
}
