import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleNotch,
  X,
} from "@phosphor-icons/react";
import { useAuth } from "../lib/auth";
import { PortfolioRenderer } from "../portfolio/PortfolioRenderer";
import type { PortfolioDocument } from "../../shared/portfolio";
export function Brand() {
  return (
    <Link to="/" className="brand" aria-label="Portfolio Studio home">
      <img src="/brand/ai-monogram.png" alt="" />
      <span>Portfolio Studio</span>
    </Link>
  );
}
export function Header({ children }: { children?: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <header className="app-header">
      <Brand />
      <nav aria-label="Main navigation">
        {children || (
          <>
            <Link to="/designs">Explore designs</Link>
            <a href="https://surreyaisociety.org/resources">Society resources</a>
            {user ? (
              <>
                <Link to="/dashboard">My portfolios</Link>
                <button
                  className="avatar"
                  title="Sign out"
                  aria-label="Sign out"
                  onClick={() => logout().then(() => navigate("/"))}
                >
                  {user.name[0]?.toUpperCase()}
                </button>
              </>
            ) : (
              <Link to="/auth" className="button secondary small">
                Sign in <ArrowRight />
              </Link>
            )}
          </>
        )}
      </nav>
    </header>
  );
}
export function Footer() {
  return (
    <footer className="site-footer">
      <span>Made for your next chapter.</span>
      <span>
        <Link to="/privacy">Privacy</Link>
        <Link to="/terms">Terms</Link>
        <a href="https://surreyaisociety.org/resources">Society resources</a>
        <a
          href="https://github.com/joshuasknott/surreyai/tree/main/apps/portfoliostudio"
          target="_blank"
          rel="noreferrer"
        >
          Source code
        </a>
        <img src="/brand/surrey-ai-logo.png" alt="Surrey AI Society" />
      </span>
    </footer>
  );
}
export function Loading({
  label = "Loading your workspace…",
}: {
  label?: string;
}) {
  return (
    <div className="loading" role="status">
      <CircleNotch className="spin" size={24} />
      <span>{label}</span>
    </div>
  );
}
export function Notice({
  children,
  success = false,
}: {
  children: ReactNode;
  success?: boolean;
}) {
  return (
    <div
      className={`notice ${success ? "success" : ""}`}
      role={success ? "status" : "alert"}
    >
      {success && <Check />}
      {children}
    </div>
  );
}
export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <h2>{title}</h2>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function BackLink({
  to = "/dashboard",
  children = "Back to portfolios",
}: {
  to?: string;
  children?: ReactNode;
}) {
  return (
    <Link className="back-link" to={to}>
      <ArrowLeft />
      {children}
    </Link>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
    const el = dialog.current;
    return () => el?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className={`modal ${wide ? "wide" : ""}`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === dialog.current) onClose();
      }}
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function PortfolioThumbnail({
  document,
  height = 290,
}: {
  document: PortfolioDocument;
  height?: number;
}) {
  const outer = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(360);
  useEffect(() => {
    const el = outer.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      ref={outer}
      className="portfolio-thumbnail"
      style={{ height, background: document.theme.background }}
      aria-hidden="true"
    >
      <div
        inert
        style={{
          width: 1140,
          transform: `scale(${width / 1140})`,
          transformOrigin: "top left",
        }}
      >
        <PortfolioRenderer document={document} preview />
      </div>
    </div>
  );
}
