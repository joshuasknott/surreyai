import { useCallback, useEffect, useRef, useState } from "react";
import { loadProject, message, projectsApi, saveDraft } from "./api";
import {
  portfolioSchema,
  type PortfolioDocument,
  type Project,
} from "../../shared/portfolio";
export function useProject(id: string) {
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Loading…");
  const [history, setHistory] = useState<PortfolioDocument[]>([]);
  const [future, setFuture] = useState<PortfolioDocument[]>([]);
  const [backup, setBackup] = useState<PortfolioDocument | null>(null);
  const current = useRef<Project | null>(null);
  const dirty = useRef(false);
  const saving = useRef<Promise<Project | null> | null>(null);
  useEffect(() => {
    let active = true;
    loadProject(id)
      .then((p) => {
        if (active) {
          current.current = p;
          setProject(p);
          setStatus(
            id.startsWith("local_")
              ? "Saved on this device"
              : "All changes saved",
          );
          try {
            const stored = JSON.parse(
              localStorage.getItem(`portfolio-studio:backup:${id}`) || "null",
            );
            if (
              stored &&
              stored.updatedAt > p.updatedAt &&
              JSON.stringify(stored.document) !== JSON.stringify(p.document)
            ) {
              const parsed = portfolioSchema.safeParse(stored.document);
              if (parsed.success) setBackup(parsed.data);
            }
          } catch {
            /* ignore an invalid optional recovery copy */
          }
        }
      })
      .catch((e) => {
        if (active) setError(message(e));
      });
    return () => {
      active = false;
    };
  }, [id]);
  const change = useCallback(
    (document: PortfolioDocument, addHistory = true) => {
      const previous = current.current;
      if (!previous) return;
      if (addHistory) {
        setHistory((h) => [...h.slice(-29), previous.document]);
        setFuture([]);
      }
      const next = {
        ...previous,
        document,
        name: document.name,
        updatedAt: new Date().toISOString(),
      };
      current.current = next;
      setProject(next);
      dirty.current = true;
      try {
        if (id.startsWith("local_")) {
          saveDraft(next);
          dirty.current = false;
          setStatus("Saved on this device");
        } else {
          localStorage.setItem(
            `portfolio-studio:backup:${id}`,
            JSON.stringify(next),
          );
          setStatus("Unsaved changes");
        }
      } catch {
        setError(
          "This device is running low on storage. Keep this tab open and save to your account or export your portfolio.",
        );
      }
    },
    [id],
  );
  const save = useCallback(async (): Promise<Project | null> => {
    if (saving.current) {
      await saving.current;
      if (dirty.current) return save();
      return current.current;
    }
    const p = current.current;
    if (!p || !dirty.current || id.startsWith("local_")) return p;
    const valid = portfolioSchema.safeParse(p.document);
    if (!valid.success) {
      setError(
        `Check your portfolio: ${valid.error.issues[0]?.message || "invalid value"}`,
      );
      return null;
    }
    setStatus("Saving…");
    const task = projectsApi
      .update({ ...p, document: valid.data })
      .then(({ project: saved }) => {
        const latest = current.current;
        if (!latest) return saved;
        const changed = latest.document !== p.document;
        const next = changed ? { ...latest, revision: saved.revision } : saved;
        current.current = next;
        setProject(next);
        dirty.current = changed;
        setStatus(changed ? "Unsaved changes" : "All changes saved");
        if (!changed) localStorage.removeItem(`portfolio-studio:backup:${id}`);
        return next;
      })
      .catch((e) => {
        setStatus("Save needs attention");
        setError(message(e));
        return null;
      })
      .finally(() => {
        saving.current = null;
      });
    saving.current = task;
    return task;
  }, [id]);
  useEffect(() => {
    if (!project || id.startsWith("local_")) return;
    const timer = setTimeout(() => {
      void save();
    }, 8000);
    return () => clearTimeout(timer);
  }, [project?.document, id, save]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  const undo = useCallback(() => {
    if (!history.length || !current.current) return;
    setFuture((f) => [current.current!.document, ...f]);
    const previous = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    change(previous, false);
  }, [history, change]);
  const redo = useCallback(() => {
    if (!future.length || !current.current) return;
    setHistory((h) => [...h, current.current!.document]);
    const next = future[0];
    setFuture((f) => f.slice(1));
    change(next, false);
  }, [future, change]);
  const recover = () => {
    if (backup) {
      change(backup);
      setBackup(null);
    }
  };
  const discardBackup = () => {
    localStorage.removeItem(`portfolio-studio:backup:${id}`);
    setBackup(null);
  };
  return {
    project,
    change,
    save,
    error,
    setError,
    status,
    undo,
    redo,
    canUndo: !!history.length,
    canRedo: !!future.length,
    backup,
    recover,
    discardBackup,
  };
}
