import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ShieldCheck } from "@phosphor-icons/react";
import { Header, Loading, Notice } from "../components/ui";
import { useAuth } from "../lib/auth";
import { api, authApi, message } from "../lib/api";

export function AdminSetup() {
  const { user, loading, setUser } = useAuth();
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const invitation = window.location.hash.slice(1);
    if (invitation) {
      sessionStorage.setItem("portfolio-studio:owner-invite", invitation);
      window.history.replaceState(null, "", "/admin/setup");
    }
    setToken(sessionStorage.getItem("portfolio-studio:owner-invite") || "");
  }, []);
  const claim = async () => {
    setBusy(true);
    setError("");
    try {
      await api("/admin/claim", {
        method: "POST",
        body: JSON.stringify({ token }),
      });
      const session = await authApi.session();
      setUser(session.user);
      sessionStorage.removeItem("portfolio-studio:owner-invite");
      navigate("/admin", { replace: true });
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Header />
      <main className="auth-page">
        <span className="eyebrow">FOR THE STUDIO OWNER</span>
        <ShieldCheck size={30} color="#ff4a00" />
        <h1 style={{ marginTop: 24 }}>
          Your Studio,
          <br />
          ready to manage.
        </h1>
        <p>
          Connect this one-time invitation to your account to manage society AI
          providers and allowances.
        </p>
        {error && <Notice>{error}</Notice>}
        {loading ? (
          <Loading />
        ) : user?.isAdmin ? (
          <Link className="button primary" to="/admin">
            Open administration <ArrowRight />
          </Link>
        ) : !user ? (
          <div className="form-stack">
            <Link
              className="button primary"
              to="/auth?mode=signup&next=%2Fadmin%2Fsetup"
            >
              Create your account <ArrowRight />
            </Link>
            <Link className="button secondary" to="/auth?next=%2Fadmin%2Fsetup">
              I already have an account
            </Link>
            <small className="help-text">
              Keep your invitation private. It can be used once.
            </small>
          </div>
        ) : (
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              void claim();
            }}
          >
            <p className="help-text">Signed in as {user.email}</p>
            {!token && (
              <label>
                Owner invitation code
                <input
                  type="password"
                  autoComplete="off"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  required
                />
              </label>
            )}
            <button className="button primary" disabled={busy || !token}>
              Activate administrator access <ArrowRight />
            </button>
          </form>
        )}
      </main>
    </>
  );
}
