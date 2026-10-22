import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Copy,
  DotsThree,
  GearSix,
  Plus,
  Trash,
} from "@phosphor-icons/react";
import {
  Header,
  Loading,
  Modal,
  Notice,
  PortfolioThumbnail,
} from "../components/ui";
import {
  createDraft,
  getDrafts,
  message,
  projectsApi,
  removeDraft,
} from "../lib/api";
import { useAuth } from "../lib/auth";
import { portfolioSchema, type Project } from "../../shared/portfolio";
export function Dashboard() {
  const importInput = useRef<HTMLInputElement>(null);
  const { user, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [menu, setMenu] = useState("");
  const [deleting, setDeleting] = useState<Project | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = async () => {
    setLoading(true);
    try {
      const cloud = user ? (await projectsApi.list()).projects : [];
      setProjects(
        [...cloud, ...getDrafts()].sort((a, b) =>
          b.updatedAt.localeCompare(a.updatedAt),
        ),
      );
    } catch (e) {
      setError(message(e));
      setProjects(getDrafts());
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (!authLoading) void refresh();
  }, [user, authLoading]);
  const duplicate = async (project: Project) => {
    setMenu("");
    try {
      const document = {
        ...structuredClone(project.document),
        name: `${project.name.slice(0, 100)} (copy)`,
      };
      if (user && !project.id.startsWith("local_"))
        await projectsApi.create(document, project.aiMode);
      else createDraft(document, project.aiMode);
      await refresh();
    } catch (e) {
      setError(message(e));
    }
  };
  return (
    <>
      <Header />
      <main className="page dashboard">
        <div className="page-title-row">
          <div>
            <span className="eyebrow">YOUR WORKSPACE</span>
            <h1>
              {user
                ? `Hello, ${user.name.split(" ")[0]}.`
                : "Your next chapter."}
            </h1>
            <p>A little space for everything you’re becoming.</p>
          </div>
          <div className="dashboard-import">
            <Link className="button primary" to="/new">
              <Plus />
              New portfolio
            </Link>
            <button
              className="text-button"
              onClick={() => importInput.current?.click()}
            >
              Import portfolio.json
            </button>
          </div>
        </div>
        <input
          ref={importInput}
          hidden
          type="file"
          accept=".json,application/json"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              if (file.size > 15000000)
                throw new Error("Choose a portfolio JSON smaller than 15 MB.");
              const document = portfolioSchema.parse(
                JSON.parse(await file.text()),
              );
              if (user) await projectsApi.create(document);
              else createDraft(document);
              await refresh();
            } catch (err) {
              setError(message(err));
            }
            e.target.value = "";
          }}
        />
        {error && <Notice>{error}</Notice>}
        {!user && !authLoading && (
          <div className="gentle-banner">
            <span>
              Your drafts are saved on this device. Sign in to keep them across
              devices.
            </span>
            <Link to="/auth">
              Sign in <ArrowRight />
            </Link>
          </div>
        )}
        {loading ? (
          <Loading />
        ) : (
          <div className="project-grid">
            {projects.map((project) => (
              <article className="project-card" key={project.id}>
                <Link
                  to={`/editor/${project.id}`}
                  aria-label={`Open ${project.name}`}
                >
                  <PortfolioThumbnail
                    document={project.document}
                    height={290}
                  />
                </Link>
                <div className="project-info">
                  <div>
                    <Link to={`/editor/${project.id}`}>
                      <h2>{project.name}</h2>
                    </Link>
                    <p>
                      <span
                        className={`status-dot ${project.publishedAt ? "live" : ""}`}
                      />
                      {project.publishedAt
                        ? "Published"
                        : project.id.startsWith("local_")
                          ? "Draft on this device"
                          : "Draft"}
                      <span>
                        Edited{" "}
                        {new Date(project.updatedAt).toLocaleDateString(
                          undefined,
                          { month: "short", day: "numeric" },
                        )}
                      </span>
                    </p>
                  </div>
                  <div className="menu-wrap">
                    <button
                      className="icon-button"
                      aria-label={`Options for ${project.name}`}
                      aria-expanded={menu === project.id}
                      onClick={() =>
                        setMenu(menu === project.id ? "" : project.id)
                      }
                    >
                      <DotsThree size={24} />
                    </button>
                    {menu === project.id && (
                      <div className="dropdown">
                        <Link to={`/settings/${project.id}`}>
                          <GearSix />
                          Settings
                        </Link>
                        <button onClick={() => void duplicate(project)}>
                          <Copy />
                          Duplicate
                        </button>
                        <button
                          className="danger"
                          onClick={() => {
                            setMenu("");
                            setDeleting(project);
                          }}
                        >
                          <Trash />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))}
            <Link to="/new" className="new-project-card">
              <span>
                <Plus size={26} />
              </span>
              <strong>Your next portfolio</strong>
              <p>Start from a design or your own idea.</p>
            </Link>
          </div>
        )}
        {user?.isAdmin && (
          <Link className="back-link" to="/admin">
            <GearSix />
            Society AI administration
          </Link>
        )}
      </main>
      {deleting && (
        <Modal title="Delete this portfolio?" onClose={() => setDeleting(null)}>
          <p>
            “{deleting.name}” will be removed from your workspace. Its published
            page will also be taken offline.
          </p>
          <div className="modal-actions">
            <button
              className="button secondary"
              onClick={() => setDeleting(null)}
            >
              Keep portfolio
            </button>
            <button
              className="button danger-button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  if (deleting.id.startsWith("local_"))
                    removeDraft(deleting.id);
                  else await projectsApi.remove(deleting.id);
                  setDeleting(null);
                  await refresh();
                } catch (e) {
                  setError(message(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Delete portfolio
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
