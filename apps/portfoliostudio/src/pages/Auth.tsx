import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, DownloadSimple } from "@phosphor-icons/react";
import { Brand, Notice } from "../components/ui";
import {
  api,
  authApi,
  getDrafts,
  message,
  retainedDraftNotice,
  saveDraftToAccount,
} from "../lib/api";
import { useAuth } from "../lib/auth";
export function Auth() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [signup, setSignup] = useState(params.get("mode") === "signup");
  const [reset, setReset] = useState(false);
  const [name, setName] = useState(
    () =>
      getDrafts().find((draft) => draft.id === params.get("draft"))?.document
        .profile.name || "",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const finish = async () => {
    const draftId = params.get("draft");
    const draft = draftId ? getDrafts().find((p) => p.id === draftId) : null;
    if (draft) {
      const { project, draftRetained } = await saveDraftToAccount(draft);
      navigate(
        `/${params.get("intent") === "publish" ? "publish" : "editor"}/${project.id}`,
        {
          replace: true,
          state: { migrationNotice: draftRetained ? retainedDraftNotice : "" },
        },
      );
    } else {
      const next = params.get("next");
      navigate(
        next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard",
        { replace: true },
      );
    }
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      if (reset) {
        await api("/auth/reset-password", {
          method: "POST",
          body: JSON.stringify({ email, code, password }),
        });
        setReset(false);
        setSuccess("Password updated. Sign in with your new password.");
        setPassword("");
      } else if (signup) {
        const result = await authApi.signup(name, email, password);
        setUser(result.user);
        setRecovery(result.recoveryCode);
      } else {
        const result = await authApi.login(email, password);
        setUser(result.user);
        await finish();
      }
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };
  const saveCode = () => {
    const blob = new Blob(
      [
        `Portfolio Studio recovery code\nAccount: ${email}\n\n${recovery}\n\nStore this privately. It can reset your account password.\n`,
      ],
      { type: "text/plain" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "portfolio-studio-recovery.txt";
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <>
      <header className="app-header">
        <Brand />
        <Link to="/">Back to home</Link>
      </header>
      <main className="auth-page">
        <span className="eyebrow">YOUR OWN LITTLE CORNER OF THE INTERNET</span>
        <h1>
          {recovery
            ? "Keep this somewhere safe."
            : reset
              ? "Back to your workspace."
              : signup
                ? "Make yourself at home."
                : "Welcome back."}
        </h1>
        <p>
          {recovery
            ? "Your recovery code lets you reset a forgotten password. We only show it once."
            : reset
              ? "Use the recovery code you saved when you joined."
              : "Save your progress. Share what you’re proud of."}
        </p>
        {error && <Notice>{error}</Notice>}
        {success && <Notice success>{success}</Notice>}
        {recovery ? (
          <div className="form-stack">
            <code className="recovery-code">{recovery}</code>
            <button className="button secondary" onClick={saveCode}>
              <DownloadSimple />
              Download recovery code
            </button>
            <button
              className="button primary"
              disabled={busy}
              onClick={() => {
                setBusy(true);
                finish()
                  .catch((e) => setError(message(e)))
                  .finally(() => setBusy(false));
              }}
            >
              I’ve saved it. Continue <ArrowRight />
            </button>
          </div>
        ) : (
          <form className="form-stack" onSubmit={submit}>
            {signup && !reset && (
              <label>
                Your name
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={120}
                  autoComplete="name"
                />
              </label>
            )}
            <label>
              Email
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                maxLength={254}
              />
            </label>
            {reset && (
              <label>
                Recovery code
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  autoComplete="off"
                  required
                />
              </label>
            )}
            <label>
              {reset ? "New password" : "Password"}
              <input
                type="password"
                required
                minLength={signup || reset ? 12 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={
                  signup || reset ? "new-password" : "current-password"
                }
                maxLength={128}
              />
              {(signup || reset) && (
                <small>
                  At least 12 characters. A few memorable words work well.
                </small>
              )}
            </label>
            <button className="button primary" disabled={busy} type="submit">
              {busy
                ? "One moment…"
                : reset
                  ? "Reset password"
                  : signup
                    ? "Create account"
                    : "Sign in"}
              <ArrowRight />
            </button>
            {!reset && (
              <button
                className="text-button centered"
                type="button"
                onClick={() => {
                  setSignup(!signup);
                  setError("");
                }}
              >
                {signup
                  ? "Already have an account? Sign in"
                  : "New here? Create an account"}
              </button>
            )}
            {!signup && (
              <button
                className="text-button centered muted"
                type="button"
                onClick={() => setReset(!reset)}
              >
                {reset ? "Back to sign in" : "Forgot your password?"}
              </button>
            )}
            <small className="auth-terms">
              By continuing you agree to our <Link to="/terms">terms</Link> and{" "}
              <Link to="/privacy">privacy notice</Link>.
            </small>
          </form>
        )}
      </main>
    </>
  );
}
