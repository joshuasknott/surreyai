import { useEffect, useState } from "react";
import {
  ArrowLeft,
  FloppyDisk,
  Plus,
  SlidersHorizontal,
  Trash,
} from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { Header, Loading, Notice } from "../components/ui";
import { api, message } from "../lib/api";
import { useAuth } from "../lib/auth";
import "./settings.css";

const supportedProviders = [
  { id: "workers-ai", name: "Surrey AI Society AI" },
  { id: "openai", name: "OpenAI" },
  { id: "anthropic", name: "Anthropic" },
  { id: "gemini", name: "Google Gemini" },
  { id: "openrouter", name: "OpenRouter" },
  { id: "deepseek", name: "DeepSeek" },
] as const;

type Provider = {
  id: string;
  name: string;
  enabled: boolean;
  models: string[];
  reasoning: boolean;
  maxInputTokens: number;
  maxOutputTokens: number;
  dailyLimit: number;
  userDailyLimit: number;
  inputNeuronsPerMillion: number;
  outputNeuronsPerMillion: number;
  hasApiKey?: boolean;
  apiKey?: string;
  clearApiKey?: boolean;
};

const defaults = {
  maxInputTokens: 16_384,
  maxOutputTokens: 4_096,
  dailyLimit: 9_000,
  userDailyLimit: 1_500,
  inputNeuronsPerMillion: 4_119,
  outputNeuronsPerMillion: 34_868,
};

function normalizeProvider(provider: Partial<Provider>): Provider {
  return {
    ...defaults,
    id: provider.id || "openai",
    name:
      provider.name ||
      supportedProviders.find((item) => item.id === provider.id)?.name ||
      provider.id ||
      "Provider",
    enabled: provider.enabled === true,
    models: Array.isArray(provider.models)
      ? provider.models.map(String).filter(Boolean)
      : [],
    reasoning: provider.reasoning === true,
    maxInputTokens: Number(provider.maxInputTokens ?? defaults.maxInputTokens),
    maxOutputTokens: Number(
      provider.maxOutputTokens ?? defaults.maxOutputTokens,
    ),
    dailyLimit: Number(provider.dailyLimit ?? defaults.dailyLimit),
    userDailyLimit: Number(provider.userDailyLimit ?? defaults.userDailyLimit),
    inputNeuronsPerMillion: Number(
      provider.inputNeuronsPerMillion ?? defaults.inputNeuronsPerMillion,
    ),
    outputNeuronsPerMillion: Number(
      provider.outputNeuronsPerMillion ?? defaults.outputNeuronsPerMillion,
    ),
    hasApiKey: provider.hasApiKey,
    apiKey: provider.apiKey,
    clearApiKey: provider.clearApiKey,
  };
}

function supportsReasoning(provider: Pick<Provider, "id" | "models">) {
  if (provider.id === "openai") {
    return provider.models.some((model) =>
      /^(?:o[1-9](?:-|$)|gpt-5(?:[-.]|$))/i.test(model),
    );
  }
  if (provider.id === "gemini") {
    return provider.models.some((model) =>
      /^gemini-2\.5-(?:pro|flash|flash-lite)(?:-|$)/i.test(model),
    );
  }
  return false;
}

function blankProvider(existing: Provider[]): Provider {
  const preset =
    supportedProviders.find(
      (item) => !existing.some((provider) => provider.id === item.id),
    ) || supportedProviders[0];
  return normalizeProvider({
    id: preset.id,
    name: preset.name,
    models: [],
    enabled: false,
  });
}

export function Admin() {
  const { user, loading: authLoading } = useAuth();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (authLoading || !user?.isAdmin) {
      if (!authLoading) setLoading(false);
      return;
    }
    void api<{ config: { providers: Provider[] } }>("/admin/ai/config")
      .then((result) =>
        setProviders(result.config.providers.map(normalizeProvider)),
      )
      .catch((e) => setError(message(e)))
      .finally(() => setLoading(false));
  }, [authLoading, user]);

  const update = (id: string, change: Partial<Provider>) =>
    setProviders((current) =>
      current.map((provider) =>
        provider.id === id ? { ...provider, ...change } : provider,
      ),
    );

  const save = async () => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const ids = providers.map((provider) => provider.id);
      const invalid = providers.find(
        (provider) =>
          !supportedProviders.some((item) => item.id === provider.id),
      );
      if (invalid)
        throw new Error(
          `“${invalid.id}” is not a supported provider. Choose one of the listed provider IDs.`,
        );
      if (new Set(ids).size !== ids.length)
        throw new Error("Each provider can only appear once.");
      const payload = providers.map((provider) => ({
        ...provider,
        models: provider.models.map((model) => model.trim()).filter(Boolean),
        reasoning: supportsReasoning(provider) && provider.reasoning,
        apiKey: provider.apiKey?.trim() || undefined,
        clearApiKey: provider.clearApiKey || undefined,
      }));
      const result = await api<{ config: { providers: Provider[] } }>(
        "/admin/ai/config",
        { method: "PATCH", body: JSON.stringify({ providers: payload }) },
      );
      setProviders(result.config.providers.map(normalizeProvider));
      setNotice("Society AI configuration saved.");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };

  if (!authLoading && !user?.isAdmin)
    return (
      <>
        <Header />
        <main className="page settings-page">
          <Link className="back-link" to="/dashboard">
            <ArrowLeft />
            Back to portfolios
          </Link>
          <div className="page-intro">
            <span className="eyebrow">SOCIETY AI</span>
            <h1>Administration is restricted.</h1>
            <p>
              This area is only available to configured Portfolio Studio
              administrators.
            </p>
          </div>
          <Notice>
            Sign in with an administrator account to manage shared AI access.
          </Notice>
        </main>
      </>
    );

  return (
    <>
      <Header />
      <main className="page wide-page settings-page admin-page">
        <Link className="back-link" to="/dashboard">
          <ArrowLeft />
          Back to portfolios
        </Link>
        <div className="page-intro">
          <span className="eyebrow">SOCIETY AI ADMINISTRATION</span>
          <h1>Make the shared allowance useful.</h1>
          <p>
            Enable only the providers and models students can use. Usage
            allowances are measured in neurons and enforced by the server.
          </p>
        </div>
        {loading ? (
          <Loading label="Loading provider configuration…" />
        ) : (
          <>
            {error && <Notice>{error}</Notice>}
            {notice && <Notice success>{notice}</Notice>}
            <section className="settings-card admin-intro-card">
              <div className="card-icon">
                <SlidersHorizontal size={22} />
              </div>
              <div>
                <span className="eyebrow">CONTROLLED ACCESS</span>
                <h2>Provider configuration</h2>
                <p className="card-lead">
                  API keys are stored encrypted by the server. Students see
                  enabled provider names and models only.
                </p>
              </div>
            </section>
            <div className="admin-provider-list">
              {providers.map((provider) => {
                const reasoningAvailable = supportsReasoning(provider);
                return (
                  <article
                    className={`settings-card provider-card ${provider.enabled ? "provider-enabled" : ""}`}
                    key={provider.id}
                  >
                    <div className="provider-heading">
                      <div>
                        <input
                          className="provider-name-input"
                          value={provider.name}
                          onChange={(e) =>
                            update(provider.id, { name: e.target.value })
                          }
                          aria-label="Provider name"
                        />
                        <span className="provider-id">{provider.id}</span>
                      </div>
                      <label className="toggle-label">
                        <input
                          type="checkbox"
                          checked={provider.enabled}
                          onChange={(e) =>
                            update(provider.id, { enabled: e.target.checked })
                          }
                        />
                        <span className="toggle" />
                        {provider.enabled ? "Enabled" : "Disabled"}
                      </label>
                    </div>
                    <div className="form-grid">
                      <label className="field-label">
                        Provider
                        <select
                          value={provider.id}
                          onChange={(e) => {
                            const preset = supportedProviders.find(
                              (item) => item.id === e.target.value,
                            );
                            update(provider.id, {
                              id: e.target.value,
                              name: preset?.name || provider.name,
                            });
                          }}
                        >
                          <option value={provider.id}>
                            {supportedProviders.find(
                              (item) => item.id === provider.id,
                            )?.name || `Unsupported: ${provider.id}`}
                          </option>
                          {supportedProviders
                            .filter(
                              (item) =>
                                item.id !== provider.id &&
                                !providers.some(
                                  (other) =>
                                    other !== provider && other.id === item.id,
                                ),
                            )
                            .map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                        </select>
                      </label>
                      <label className="field-label">
                        Models <span className="optional">comma separated</span>
                        <input
                          value={provider.models.join(", ")}
                          onChange={(e) =>
                            update(provider.id, {
                              models: e.target.value.split(","),
                            })
                          }
                          placeholder="Model IDs enabled for students"
                        />
                      </label>
                    </div>
                    <div className="form-grid three">
                      <label className="field-label">
                        Max input tokens
                        <input
                          type="number"
                          min={256}
                          max={200000}
                          value={provider.maxInputTokens}
                          onChange={(e) =>
                            update(provider.id, {
                              maxInputTokens: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                      <label className="field-label">
                        Max output tokens
                        <input
                          type="number"
                          min={256}
                          max={100000}
                          value={provider.maxOutputTokens}
                          onChange={(e) =>
                            update(provider.id, {
                              maxOutputTokens: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                      <label className="field-label">
                        Daily allowance{" "}
                        <span className="optional">neurons</span>
                        <input
                          type="number"
                          min={0}
                          max={2000000000}
                          value={provider.dailyLimit}
                          onChange={(e) =>
                            update(provider.id, {
                              dailyLimit: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                      <label className="field-label">
                        Per student / day{" "}
                        <span className="optional">neurons</span>
                        <input
                          type="number"
                          min={0}
                          max={500000000}
                          value={provider.userDailyLimit}
                          onChange={(e) =>
                            update(provider.id, {
                              userDailyLimit: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                      <label className="field-label">
                        Input cost{" "}
                        <span className="optional">neurons / 1M tokens</span>
                        <input
                          type="number"
                          min={0}
                          value={provider.inputNeuronsPerMillion}
                          onChange={(e) =>
                            update(provider.id, {
                              inputNeuronsPerMillion: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                      <label className="field-label">
                        Output cost{" "}
                        <span className="optional">neurons / 1M tokens</span>
                        <input
                          type="number"
                          min={0}
                          value={provider.outputNeuronsPerMillion}
                          onChange={(e) =>
                            update(provider.id, {
                              outputNeuronsPerMillion: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                    </div>
                    <label className="checkbox-line">
                      <input
                        type="checkbox"
                        checked={reasoningAvailable && provider.reasoning}
                        disabled={!reasoningAvailable}
                        onChange={(e) =>
                          update(provider.id, { reasoning: e.target.checked })
                        }
                      />{" "}
                      {reasoningAvailable
                        ? "Allow deeper reasoning"
                        : "Deeper reasoning unavailable"}{" "}
                      <span className="optional">
                        {reasoningAvailable
                          ? "compatible models only"
                          : "add a supported OpenAI or Gemini model"}
                      </span>
                    </label>
                    <div className="provider-secret">
                      <label className="field-label">
                        Provider API key{" "}
                        {provider.hasApiKey && (
                          <span className="optional">stored</span>
                        )}
                        <input
                          type="password"
                          autoComplete="off"
                          value={provider.apiKey || ""}
                          onChange={(e) =>
                            update(provider.id, { apiKey: e.target.value })
                          }
                          placeholder={
                            provider.hasApiKey
                              ? "Enter a new key to replace it"
                              : "Only required for hosted providers"
                          }
                        />
                      </label>
                      {provider.hasApiKey && (
                        <label className="checkbox-line">
                          <input
                            type="checkbox"
                            checked={provider.clearApiKey === true}
                            onChange={(e) =>
                              update(provider.id, {
                                clearApiKey: e.target.checked,
                              })
                            }
                          />{" "}
                          Remove stored key
                        </label>
                      )}
                    </div>
                    <button
                      className="text-button danger-text"
                      onClick={() =>
                        setProviders((current) =>
                          current.filter((item) => item !== provider),
                        )
                      }
                    >
                      <Trash />
                      Remove provider
                    </button>
                  </article>
                );
              })}
            </div>
            <div className="admin-actions">
              <button
                className="button secondary"
                onClick={() =>
                  setProviders((current) => [
                    ...current,
                    blankProvider(current),
                  ])
                }
              >
                <Plus />
                Add provider
              </button>
              <button
                className="button primary"
                disabled={busy}
                onClick={() => void save()}
              >
                {busy ? "Saving…" : "Save configuration"} <FloppyDisk />
              </button>
            </div>
          </>
        )}
      </main>
    </>
  );
}
