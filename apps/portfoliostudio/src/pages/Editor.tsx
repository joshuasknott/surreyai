import { useEffect, useRef, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUUpLeft,
  ArrowUUpRight,
  ArrowsOutSimple,
  ChatCircle,
  Check,
  CursorClick,
  DeviceMobile,
  DeviceTablet,
  DotsSixVertical,
  Eye,
  EyeSlash,
  GearSix,
  Image,
  List,
  Monitor,
  PaintBrush,
  Plus,
  Sparkle,
  Trash,
  X,
} from "@phosphor-icons/react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Canvas } from "../components/Canvas";
import { Loading, Modal, Notice } from "../components/ui";
import { WorkshopSteps } from "../components/WorkshopSteps";
import { useProject } from "../lib/useProject";
import { api, message, uploadImage } from "../lib/api";
import { useAuth } from "../lib/auth";
import { readImage } from "../lib/import";
import {
  fontNames,
  newId,
  portfolioSchema,
  sectionLayouts,
  sectionSchema,
  sectionTypes,
  type PortfolioDocument,
  type PortfolioItem,
  type PortfolioSection,
  type PortfolioTheme,
  type SelectedElement,
} from "../../shared/portfolio";

function SortableSection({
  section,
  active,
  onSelect,
  onToggle,
  onMove,
  first,
  last,
}: {
  section: PortfolioSection;
  active: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onMove: (direction: -1 | 1) => void;
  first: boolean;
  last: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: section.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`section-row ${active ? "active" : ""} ${!section.visible ? "hidden-section" : ""}`}
    >
      <button
        className="drag-handle"
        aria-label={`Move ${section.title || section.type}`}
        {...attributes}
        {...listeners}
      >
        <DotsSixVertical />
      </button>
      <button className="section-name" onClick={onSelect}>
        <span>{section.title || section.type}</span>
        <small>{section.type}</small>
      </button>
      <button
        className="icon-button"
        aria-label={section.visible ? "Hide section" : "Show section"}
        onClick={onToggle}
      >
        {section.visible ? <Eye /> : <EyeSlash />}
      </button>
      <div className="section-order-actions">
        <button
          aria-label={`Move ${section.title || section.type} up`}
          disabled={first}
          onClick={() => onMove(-1)}
        >
          <ArrowUp size={13} />
        </button>
        <button
          aria-label={`Move ${section.title || section.type} down`}
          disabled={last}
          onClick={() => onMove(1)}
        >
          <ArrowDown size={13} />
        </button>
      </div>
    </div>
  );
}
function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="color-field">
      <span>{label}</span>
      <span>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
        />
        <code>{value.toUpperCase()}</code>
      </span>
    </label>
  );
}
function Slider({
  label,
  value,
  min,
  max,
  onChange,
  unit = "px",
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  unit?: string;
}) {
  return (
    <label className="slider-field">
      <span>
        {label}
        <small>
          {value}
          {unit}
        </small>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

export function Editor() {
  const { id = "" } = useParams();
  const [params] = useSearchParams();
  const location = useLocation();
  const [migrationNotice, setMigrationNotice] = useState(
    typeof location.state?.migrationNotice === "string"
      ? location.state.migrationNotice
      : "",
  );
  const navigate = useNavigate();
  const { user } = useAuth();
  const state = useProject(id);
  const {
    project,
    change,
    save,
    error,
    setError,
    status,
    undo,
    redo,
    canUndo,
    canRedo,
  } = state;
  const [tab, setTab] = useState<"chat" | "design" | "sections">("chat");
  const [selected, setSelected] = useState<SelectedElement | null>(null);
  const [width, setWidth] = useState(1140);
  const [preview, setPreview] = useState(params.get("preview") === "1");
  const [sidebar, setSidebar] = useState(() => window.innerWidth > 760);
  const [showGuide, setShowGuide] = useState(() => {
    try {
      return (
        localStorage.getItem("portfolio-studio:editor-guide-dismissed") !==
        "true"
      );
    } catch {
      return true;
    }
  });
  const [addSection, setAddSection] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [proposal, setProposal] = useState<{
    document: PortfolioDocument;
    summary: string;
  } | null>(null);
  const [chat, setChat] = useState<
    { role: "user" | "assistant"; text: string }[]
  >([]);
  const [brief, setBrief] = useState<{ cv: string; prompt: string } | null>(
    null,
  );
  const [includeCv, setIncludeCv] = useState(false);
  const [aiConnection, setAiConnection] = useState<{
    provider: string;
    model: string;
  } | null>(null);
  const [itemEditor, setItemEditor] = useState<{
    sectionId: string;
    item: PortfolioItem;
  } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(`portfolio-studio:brief:${id}`);
      if (stored) {
        const b = JSON.parse(stored);
        setBrief(b);
        if (b.prompt) setPrompt(b.prompt);
      }
    } catch {
      /* optional creation brief */
    }
  }, [id]);
  useEffect(() => {
    const keyboard = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.matches("input,textarea,[contenteditable]")) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void save();
      }
      if (e.key === "Escape") {
        setSelected(null);
        setPreview(false);
      }
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, [undo, redo, save]);
  useEffect(() => {
    if (!user) return;
    api<{ settings: { mode: string; provider: string | null } }>("/ai/settings")
      .then(({ settings }) => {
        if (settings.provider && settings.mode === project?.aiMode) {
          let model = "";
          try {
            model =
              localStorage.getItem(
                `portfolio-studio:ai-model:${settings.provider}`,
              ) || "";
          } catch {
            /* optional preference */
          }
          setAiConnection({ provider: settings.provider, model });
        } else setAiConnection(null);
      })
      .catch(() => {});
  }, [user, project?.aiMode]);
  const document = project?.document;
  const section = document?.sections.find((s) => s.id === selected?.sectionId);
  const updateSection = (update: Partial<PortfolioSection>) => {
    if (!document || !section) return;
    change({
      ...document,
      sections: document.sections.map((s) =>
        s.id === section.id ? { ...s, ...update } : s,
      ),
    });
  };
  const updateStyle = (update: Partial<PortfolioSection["style"]>) => {
    if (section) updateSection({ style: { ...section.style, ...update } });
  };
  const changeTheme = (update: Partial<PortfolioTheme>) => {
    if (!document) return;
    change({
      ...document,
      theme: { ...document.theme, ...update },
      sections: document.sections.map((s) => {
        const style = { ...s.style };
        for (const key of ["background", "color", "accent"] as const)
          if (update[key] && style[key] === document.theme[key])
            style[key] = update[key];
        return { ...s, style };
      }),
    });
  };
  const directEdit = (target: SelectedElement, value: string) => {
    if (!document) return;
    const next = structuredClone(document);
    const sec = next.sections.find((s) => s.id === target.sectionId);
    if (!sec) return;
    if (target.itemId && target.itemField) {
      const item = sec.items.find((i) => i.id === target.itemId);
      if (item) item[target.itemField] = value;
    } else if (
      target.field === "title" ||
      target.field === "subtitle" ||
      target.field === "body" ||
      target.field === "image"
    )
      sec[target.field] = value;
    change(next);
  };
  const moveSection = (event: DragEndEvent) => {
    if (!document || !event.over || event.active.id === event.over.id) return;
    const from = document.sections.findIndex((s) => s.id === event.active.id);
    const to = document.sections.findIndex((s) => s.id === event.over!.id);
    change({ ...document, sections: arrayMove(document.sections, from, to) });
  };
  const createSection = (type: (typeof sectionTypes)[number]) => {
    if (!document) return;
    const s = sectionSchema.parse({
      id: newId("section"),
      type,
      title:
        type === "projects"
          ? "Selected work"
          : type.charAt(0).toUpperCase() + type.slice(1),
      body: "",
      layout: ["projects", "gallery", "skills"].includes(type)
        ? "grid"
        : "columns",
      style: {
        background: document.theme.background,
        color: document.theme.color,
        accent: document.theme.accent,
      },
    });
    change({ ...document, sections: [...document.sections, s] });
    setSelected({ sectionId: s.id, field: "section" });
    setTab("design");
    setAddSection(false);
  };
  const askAi = async () => {
    if (!document || !prompt.trim() || busy) return;
    if (!user) {
      try {
        sessionStorage.setItem(
          `portfolio-studio:brief:${id}`,
          JSON.stringify({
            cv: brief?.cv || "",
            prompt: prompt.trim(),
            pending: true,
          }),
        );
        const saved = await save();
        if (saved) navigate(`/auth?mode=signup&draft=${id}`);
      } catch (e) {
        setError(message(e));
      }
      return;
    }
    setBusy(true);
    setError("");
    const request = prompt.trim();
    setChat((c) => [...c, { role: "user", text: request }]);
    setPrompt("");
    try {
      const result = await api<{
        document: PortfolioDocument;
        summary: string;
      }>("/ai/generate", {
        method: "POST",
        body: JSON.stringify({
          document,
          prompt: request,
          selection: selected || undefined,
          cv: includeCv ? brief?.cv : undefined,
          mode: project!.aiMode,
          provider: aiConnection?.provider,
          model: aiConnection?.model || undefined,
        }),
      });
      const valid = portfolioSchema.parse(result.document);
      setProposal({ document: valid, summary: result.summary });
      setChat((c) => [...c, { role: "assistant", text: result.summary }]);
    } catch (e) {
      setError(message(e));
      setPrompt(request);
    } finally {
      setBusy(false);
    }
  };
  const saveAndGo = async (to: string) => {
    const saved = await save();
    if (saved) navigate(to);
  };
  if (!project || !document)
    return (
      <main className="page">
        <Link className="back-link" to="/dashboard">
          <ArrowLeft />
          My portfolios
        </Link>
        {error ? <Notice>{error}</Notice> : <Loading />}
      </main>
    );
  return (
    <div className={`editor ${preview ? "preview-mode" : ""}`}>
      <header className="editor-header">
        <div className="editor-project">
          <button
            className="icon-button"
            aria-label="Back to portfolios"
            onClick={() => void saveAndGo("/dashboard")}
          >
            <ArrowLeft />
          </button>
          <img src="/brand/ai-monogram.png" alt="Surrey AI Society" />
          <input
            aria-label="Portfolio name"
            value={document.name}
            maxLength={120}
            onChange={(e) => change({ ...document, name: e.target.value })}
          />
          <button
            className="save-status"
            onClick={() => void save()}
            title="Save now"
          >
            {status === "Saving…" ? (
              status
            ) : (
              <>
                <span className="status-dot" />
                {status}
              </>
            )}
          </button>
        </div>
        <div className="device-switch" aria-label="Preview size">
          {[
            { value: 1140, label: "Desktop", icon: Monitor },
            { value: 768, label: "Tablet", icon: DeviceTablet },
            { value: 390, label: "Mobile", icon: DeviceMobile },
          ].map((device) => (
            <button
              key={device.value}
              title={device.label}
              aria-label={device.label}
              aria-pressed={width === device.value}
              className={width === device.value ? "active" : ""}
              onClick={() => setWidth(device.value)}
            >
              <device.icon size={18} />
            </button>
          ))}
        </div>
        <div className="editor-actions">
          <button
            className="icon-button"
            title="Undo"
            aria-label="Undo"
            disabled={!canUndo || !!proposal}
            onClick={undo}
          >
            <ArrowUUpLeft />
          </button>
          <button
            className="icon-button"
            title="Redo"
            aria-label="Redo"
            disabled={!canRedo || !!proposal}
            onClick={redo}
          >
            <ArrowUUpRight />
          </button>
          <button
            className="icon-button settings-action"
            title="Project settings"
            aria-label="Project settings"
            onClick={() => void saveAndGo(`/settings/${id}`)}
          >
            <GearSix />
          </button>
          <button
            className="button secondary small"
            onClick={() => setPreview(!preview)}
          >
            {preview ? "Back to editor" : "Preview"}
            <Eye />
          </button>
          <button
            className="button primary small"
            disabled={busy || !!proposal}
            onClick={() => void saveAndGo(`/publish/${id}`)}
          >
            Publish
            <ArrowRight />
          </button>
        </div>
      </header>
      {!preview && !project.publishedAt && (
        <div className="editor-workshop-bar">
          <WorkshopSteps current="personalise" projectId={id} />
        </div>
      )}
      {!preview && showGuide && (
        <div className="workshop-help">
          <p>
            <strong>Make it yours.</strong> Click text to edit it, or ask AI for
            a hand. Check the mobile preview, then publish when you’re ready.
          </p>
          <button
            className="text-button"
            onClick={() => {
              setShowGuide(false);
              try {
                localStorage.setItem(
                  "portfolio-studio:editor-guide-dismissed",
                  "true",
                );
              } catch {
                /* optional preference */
              }
            }}
          >
            Got it
          </button>
        </div>
      )}
      {error && (
        <div className="editor-notice">
          <Notice>
            {error}
            {!user && <Link to={`/auth?mode=signup&draft=${id}`}>Sign in</Link>}
            <button
              className="icon-button"
              aria-label="Dismiss message"
              onClick={() => setError("")}
            >
              <X />
            </button>
          </Notice>
        </div>
      )}
      <>
        {state.backup && (
          <div className="backup-banner">
            <span>
              We found edits on this device that were not saved to your account.
            </span>
            <button className="button secondary small" onClick={state.recover}>
              Recover edits
            </button>
            <button className="text-button" onClick={state.discardBackup}>
              Use saved version
            </button>
          </div>
        )}
      </>
      {migrationNotice && (
        <div className="editor-notice">
          <Notice success>
            {migrationNotice}
            <button
              className="icon-button"
              aria-label="Dismiss saved draft notice"
              onClick={() => setMigrationNotice("")}
            >
              <X />
            </button>
          </Notice>
        </div>
      )}
      <div className="editor-body">
        {!preview && sidebar && (
          <aside className="editor-sidebar">
            <div className="editor-tabs">
              <button
                className={tab === "chat" ? "active" : ""}
                onClick={() => setTab("chat")}
              >
                <Sparkle />
                AI
              </button>
              <button
                className={tab === "design" ? "active" : ""}
                onClick={() => setTab("design")}
              >
                <PaintBrush />
                Design
              </button>
              <button
                className={tab === "sections" ? "active" : ""}
                onClick={() => setTab("sections")}
              >
                <List />
                Sections
              </button>
              <button
                className="panel-close"
                aria-label="Close editing panel"
                onClick={() => setSidebar(false)}
              >
                <X />
              </button>
            </div>
            {tab === "chat" && (
              <div className="chat-panel">
                <div className="chat-history">
                  {chat.length === 0 ? (
                    <div className="chat-welcome">
                      <span className="ai-glyph">
                        <Sparkle size={25} />
                      </span>
                      <h2>Your work. Your words.</h2>
                      <p>
                        {project.aiMode === "society"
                          ? "Society AI is ready to help. "
                          : "Your assistant is ready to help. "}
                        Describe a change, or select part of your page to focus
                        on it.
                      </p>
                      <div className="suggestions">
                        {[
                          "Help me improve my introduction",
                          "Make my project descriptions clearer",
                          "Give my design a more personal feel",
                        ].map((p) => (
                          <button
                            key={p}
                            onClick={() => {
                              setPrompt(p);
                              input.current?.focus();
                            }}
                          >
                            {p}
                            <ArrowRight />
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    chat.map((entry, i) => (
                      <div key={i} className={`chat-message ${entry.role}`}>
                        {entry.role === "assistant" && <Sparkle size={17} />}
                        <p>{entry.text}</p>
                      </div>
                    ))
                  )}
                  {busy && (
                    <div className="ai-thinking" role="status">
                      <span />
                      Thinking about your portfolio…
                    </div>
                  )}
                  {proposal && (
                    <div className="proposal-review">
                      <strong>Here’s a preview.</strong>
                      <p>
                        Your saved design stays as it was until you keep this
                        change.
                      </p>
                      <div>
                        <button
                          className="button primary small"
                          onClick={() => {
                            change(proposal.document);
                            setProposal(null);
                            setIncludeCv(false);
                          }}
                        >
                          <Check />
                          Keep changes
                        </button>
                        <button
                          className="text-button"
                          onClick={() => setProposal(null)}
                        >
                          Discard
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                {!user && (
                  <p className="ai-signin-hint">
                    Create a free Studio account to use AI. Your draft comes
                    with you.
                  </p>
                )}
                {brief?.cv && (
                  <label className="cv-consent">
                    <input
                      type="checkbox"
                      checked={includeCv}
                      onChange={(e) => setIncludeCv(e.target.checked)}
                    />
                    Include my imported CV text with this request
                  </label>
                )}
                <div className="chat-composer">
                  {selected && (
                    <div className="target-chip">
                      <CursorClick size={14} />
                      {section?.type} · {selected.field}
                      <button
                        aria-label="Clear selection"
                        onClick={() => setSelected(null)}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                  <textarea
                    ref={input}
                    aria-label="Ask AI to change your portfolio"
                    placeholder={
                      selected
                        ? "What would you change here?"
                        : "What would you like to create?"
                    }
                    value={prompt}
                    maxLength={4000}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" &&
                        !e.shiftKey &&
                        !e.nativeEvent.isComposing
                      ) {
                        e.preventDefault();
                        void askAi();
                      }
                    }}
                    rows={3}
                  />
                  <div>
                    <button
                      className="ai-provider-label"
                      onClick={() => void saveAndGo(`/settings/${id}?tab=ai`)}
                    >
                      {project.aiMode === "society"
                        ? "Society AI"
                        : project.aiMode === "key"
                          ? "Your API key"
                          : "AI account"}
                    </button>
                    <button
                      className="send-button"
                      aria-label="Send AI request"
                      disabled={busy || !prompt.trim() || !!proposal}
                      onClick={() => void askAi()}
                    >
                      <ArrowUp size={18} />
                    </button>
                  </div>
                </div>
                <small className="chat-footnote">
                  Review AI suggestions before publishing.
                </small>
              </div>
            )}
            {tab === "sections" && (
              <div className="sidebar-scroll">
                <div className="panel-heading">
                  <h2>Your page</h2>
                  <button
                    className="icon-button"
                    aria-label="Add section"
                    onClick={() => setAddSection(true)}
                  >
                    <Plus />
                  </button>
                </div>
                <p className="panel-help">
                  Drag or use the arrows to reorder. Select to edit.
                </p>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={moveSection}
                >
                  <SortableContext
                    items={document.sections.map((s) => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {document.sections.map((s, index) => (
                      <SortableSection
                        key={s.id}
                        section={s}
                        active={selected?.sectionId === s.id}
                        first={index === 0}
                        last={index === document.sections.length - 1}
                        onMove={(direction) =>
                          change({
                            ...document,
                            sections: arrayMove(
                              document.sections,
                              index,
                              index + direction,
                            ),
                          })
                        }
                        onSelect={() => {
                          setSelected({ sectionId: s.id, field: "section" });
                          setTab("design");
                        }}
                        onToggle={() =>
                          change({
                            ...document,
                            sections: document.sections.map((sec) =>
                              sec.id === s.id
                                ? { ...sec, visible: !sec.visible }
                                : sec,
                            ),
                          })
                        }
                      />
                    ))}
                  </SortableContext>
                </DndContext>
                <button
                  className="button secondary full-width"
                  disabled={document.sections.length >= 30}
                  onClick={() => setAddSection(true)}
                >
                  <Plus />
                  Add a section
                </button>
              </div>
            )}
            {tab === "design" && (
              <div className="sidebar-scroll">
                {section ? (
                  <>
                    <div className="panel-heading">
                      <h2>
                        {section.type.charAt(0).toUpperCase() +
                          section.type.slice(1)}
                      </h2>
                      <button
                        className="text-button"
                        onClick={() => setSelected(null)}
                      >
                        Page style
                      </button>
                    </div>
                    <div className="form-stack compact">
                      <label>
                        Heading
                        <input
                          value={section.title}
                          maxLength={400}
                          onChange={(e) =>
                            updateSection({ title: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        Eyebrow / subtitle
                        <input
                          value={section.subtitle}
                          maxLength={500}
                          onChange={(e) =>
                            updateSection({ subtitle: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        Text
                        <textarea
                          rows={4}
                          value={section.body}
                          maxLength={12000}
                          onChange={(e) =>
                            updateSection({ body: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        Layout
                        <select
                          value={section.layout}
                          onChange={(e) =>
                            updateSection({
                              layout: e.target
                                .value as PortfolioSection["layout"],
                            })
                          }
                        >
                          {sectionLayouts.map((l) => (
                            <option key={l} value={l}>
                              {l.charAt(0).toUpperCase() + l.slice(1)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="button-pair">
                        <button
                          className="button secondary small"
                          onClick={() => imageInput.current?.click()}
                        >
                          <Image />
                          {section.image ? "Replace image" : "Add image"}
                        </button>
                        {section.image && (
                          <button
                            className="icon-button"
                            aria-label="Remove image"
                            onClick={() =>
                              updateSection({ image: "", imageAlt: "" })
                            }
                          >
                            <Trash />
                          </button>
                        )}
                      </div>
                      {section.image && (
                        <>
                          <label>
                            Image description
                            <input
                              value={section.imageAlt}
                              onChange={(e) =>
                                updateSection({ imageAlt: e.target.value })
                              }
                              maxLength={240}
                              placeholder="Describe the image for screen readers"
                            />
                          </label>
                          <label>
                            Image position
                            <select
                              value={section.style.imagePosition}
                              onChange={(e) =>
                                updateStyle({
                                  imagePosition: e.target
                                    .value as PortfolioSection["style"]["imagePosition"],
                                })
                              }
                            >
                              {["left", "right", "background", "none"].map(
                                (p) => (
                                  <option key={p}>{p}</option>
                                ),
                              )}
                            </select>
                          </label>
                          <Slider
                            label="Image width"
                            value={section.style.imageWidth}
                            min={20}
                            max={80}
                            unit="%"
                            onChange={(v) => updateStyle({ imageWidth: v })}
                          />
                        </>
                      )}
                      <Slider
                        label="Heading size"
                        value={section.style.headingSize || 64}
                        min={24}
                        max={160}
                        onChange={(v) => updateStyle({ headingSize: v })}
                      />
                      <Slider
                        label="Space above"
                        value={section.style.paddingTop}
                        min={0}
                        max={240}
                        onChange={(v) => updateStyle({ paddingTop: v })}
                      />
                      <Slider
                        label="Space below"
                        value={section.style.paddingBottom}
                        min={0}
                        max={240}
                        onChange={(v) => updateStyle({ paddingBottom: v })}
                      />
                      <label>
                        Text alignment
                        <select
                          value={section.style.textAlign}
                          onChange={(e) =>
                            updateStyle({
                              textAlign: e.target
                                .value as PortfolioSection["style"]["textAlign"],
                            })
                          }
                        >
                          <option>left</option>
                          <option>center</option>
                          <option>right</option>
                        </select>
                      </label>
                      {[
                        "projects",
                        "gallery",
                        "skills",
                        "links",
                        "achievements",
                        "interests",
                      ].includes(section.type) && (
                        <Slider
                          label="Columns"
                          value={section.style.columns}
                          min={1}
                          max={4}
                          unit=""
                          onChange={(v) => updateStyle({ columns: v })}
                        />
                      )}
                      <ColorField
                        label="Background"
                        value={
                          section.style.background || document.theme.background
                        }
                        onChange={(v) => updateStyle({ background: v })}
                      />
                      <ColorField
                        label="Text"
                        value={section.style.color || document.theme.color}
                        onChange={(v) => updateStyle({ color: v })}
                      />
                      <ColorField
                        label="Accent"
                        value={section.style.accent || document.theme.accent}
                        onChange={(v) => updateStyle({ accent: v })}
                      />
                      <details>
                        <summary>Button & link</summary>
                        <label>
                          Button text
                          <input
                            value={section.buttonLabel}
                            onChange={(e) =>
                              updateSection({ buttonLabel: e.target.value })
                            }
                            maxLength={80}
                          />
                        </label>
                        <label>
                          Link
                          <input
                            value={section.buttonUrl}
                            onChange={(e) =>
                              updateSection({ buttonUrl: e.target.value })
                            }
                            placeholder="https:// or mailto:"
                          />
                        </label>
                      </details>
                      <details open={section.items.length > 0}>
                        <summary>Items ({section.items.length})</summary>
                        <div className="item-list">
                          {section.items.map((item, index) => (
                            <div className="item-row" key={item.id}>
                              <button
                                onClick={() =>
                                  setItemEditor({
                                    sectionId: section.id,
                                    item: structuredClone(item),
                                  })
                                }
                              >
                                {item.title || "Untitled item"}
                              </button>
                              <button
                                className="icon-button"
                                aria-label="Move item up"
                                disabled={index === 0}
                                onClick={() =>
                                  updateSection({
                                    items: arrayMove(
                                      section.items,
                                      index,
                                      index - 1,
                                    ),
                                  })
                                }
                              >
                                <ArrowUp />
                              </button>
                              <button
                                className="icon-button"
                                aria-label="Move item down"
                                disabled={index === section.items.length - 1}
                                onClick={() =>
                                  updateSection({
                                    items: arrayMove(
                                      section.items,
                                      index,
                                      index + 1,
                                    ),
                                  })
                                }
                              >
                                <ArrowDown />
                              </button>
                              <button
                                className="icon-button"
                                aria-label="Delete item"
                                onClick={() =>
                                  updateSection({
                                    items: section.items.filter(
                                      (i) => i.id !== item.id,
                                    ),
                                  })
                                }
                              >
                                <Trash />
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          className="button secondary small full-width"
                          disabled={section.items.length >= 40}
                          onClick={() =>
                            setItemEditor({
                              sectionId: section.id,
                              item: {
                                id: newId("item"),
                                title: "",
                                subtitle: "",
                                description: "",
                                image: "",
                                imageAlt: "",
                                url: "",
                                tags: [],
                                date: "",
                              },
                            })
                          }
                        >
                          <Plus />
                          Add an item
                        </button>
                      </details>
                      <button
                        className="text-button danger"
                        disabled={document.sections.length === 1}
                        onClick={() => setConfirmDelete(true)}
                      >
                        <Trash />
                        Delete section
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="panel-heading">
                      <h2>Make it feel like you.</h2>
                    </div>
                    <p className="panel-help">
                      Your page’s overall style. Select any section for its own
                      controls.
                    </p>
                    <div className="form-stack compact">
                      <label>
                        Heading font
                        <select
                          value={document.theme.headingFont}
                          onChange={(e) =>
                            change({
                              ...document,
                              theme: {
                                ...document.theme,
                                headingFont: e.target
                                  .value as (typeof fontNames)[number],
                              },
                            })
                          }
                        >
                          {fontNames.map((f) => (
                            <option key={f} value={f}>
                              {f === "plex-mono"
                                ? "IBM Plex Mono"
                                : f.replace("-", " ")}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Body font
                        <select
                          value={document.theme.bodyFont}
                          onChange={(e) =>
                            change({
                              ...document,
                              theme: {
                                ...document.theme,
                                bodyFont: e.target
                                  .value as (typeof fontNames)[number],
                              },
                            })
                          }
                        >
                          {fontNames.map((f) => (
                            <option key={f} value={f}>
                              {f.replace("-", " ")}
                            </option>
                          ))}
                        </select>
                      </label>
                      <Slider
                        label="Body size"
                        value={document.theme.fontSize}
                        min={14}
                        max={22}
                        onChange={(v) =>
                          change({
                            ...document,
                            theme: { ...document.theme, fontSize: v },
                          })
                        }
                      />
                      <Slider
                        label="Heading weight"
                        value={document.theme.headingWeight}
                        min={300}
                        max={800}
                        unit=""
                        onChange={(v) => changeTheme({ headingWeight: v })}
                      />
                      <Slider
                        label="Page width"
                        value={document.theme.maxWidth}
                        min={720}
                        max={1600}
                        onChange={(v) =>
                          change({
                            ...document,
                            theme: { ...document.theme, maxWidth: v },
                          })
                        }
                      />
                      <Slider
                        label="Corner radius"
                        value={document.theme.radius}
                        min={0}
                        max={40}
                        onChange={(v) =>
                          change({
                            ...document,
                            theme: { ...document.theme, radius: v },
                          })
                        }
                      />
                      <ColorField
                        label="Background"
                        value={document.theme.background}
                        onChange={(v) => changeTheme({ background: v })}
                      />
                      <ColorField
                        label="Text"
                        value={document.theme.color}
                        onChange={(v) => changeTheme({ color: v })}
                      />
                      <ColorField
                        label="Accent"
                        value={document.theme.accent}
                        onChange={(v) => changeTheme({ accent: v })}
                      />
                      <button
                        className="button secondary"
                        onClick={() => void saveAndGo(`/settings/${id}`)}
                      >
                        Your details & links <ArrowRight />
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </aside>
        )}
        <div className="editor-stage">
          {!preview && (
            <div className="canvas-context">
              <button
                className="icon-button"
                aria-label={
                  sidebar ? "Hide editing panel" : "Show editing panel"
                }
                onClick={() => setSidebar(!sidebar)}
              >
                <ArrowsOutSimple />
              </button>
              <span>
                {proposal
                  ? "Previewing AI changes"
                  : selected
                    ? `${section?.type || "Section"} / ${selected.field}`
                    : "Click anything to edit it"}
              </span>
              {selected && (
                <>
                  <button
                    className="text-button"
                    onClick={() => {
                      setTab("design");
                      setSidebar(true);
                    }}
                  >
                    Edit style
                  </button>
                  <button
                    className="text-button"
                    onClick={() => {
                      setTab("chat");
                      setSidebar(true);
                      input.current?.focus();
                    }}
                  >
                    <Sparkle />
                    Ask AI
                  </button>
                  <button
                    className="icon-button"
                    aria-label="Clear selection"
                    onClick={() => setSelected(null)}
                  >
                    <X />
                  </button>
                </>
              )}
            </div>
          )}
          <Canvas
            width={width}
            document={proposal?.document || document}
            editable={!preview && !proposal}
            selected={selected}
            onSelect={(s) => {
              setSelected(s);
            }}
            onEdit={directEdit}
            onResize={({ selection, width }) =>
              change({
                ...document,
                sections: document.sections.map((s) =>
                  s.id === selection.sectionId
                    ? { ...s, style: { ...s.style, imageWidth: width } }
                    : s,
                ),
              })
            }
          />
          {!preview && (
            <div className="canvas-dock">
              <button
                title="Select and edit"
                aria-label="Select and edit"
                onClick={() => {
                  setTab("design");
                  setSidebar(true);
                }}
              >
                <CursorClick />
              </button>
              <button
                title="Add a section"
                aria-label="Add a section"
                onClick={() => setAddSection(true)}
              >
                <Plus />
              </button>
              <button
                title="Ask AI about selection"
                aria-label="Ask AI about selection"
                onClick={() => {
                  setTab("chat");
                  setSidebar(true);
                  input.current?.focus();
                }}
              >
                <ChatCircle />
              </button>
            </div>
          )}
        </div>
      </div>
      <input
        ref={imageInput}
        hidden
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          try {
            const image = await uploadImage(id, await readImage(file));
            updateSection({ image });
          } catch (err) {
            setError(message(err));
          }
          e.target.value = "";
        }}
      />
      {addSection && (
        <Modal
          title="What would you like to add?"
          onClose={() => setAddSection(false)}
        >
          <div className="section-picker">
            {sectionTypes.map((type) => (
              <button key={type} onClick={() => createSection(type)}>
                <Plus />
                <span>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                <ArrowRight />
              </button>
            ))}
          </div>
        </Modal>
      )}
      {confirmDelete && section && (
        <Modal
          title="Delete this section?"
          onClose={() => setConfirmDelete(false)}
        >
          <p>You can undo this change in the editor.</p>
          <div className="modal-actions">
            <button
              className="button secondary"
              onClick={() => setConfirmDelete(false)}
            >
              Keep section
            </button>
            <button
              className="button danger-button"
              onClick={() => {
                change({
                  ...document,
                  sections: document.sections.filter(
                    (s) => s.id !== section.id,
                  ),
                });
                setSelected(null);
                setConfirmDelete(false);
              }}
            >
              Delete section
            </button>
          </div>
        </Modal>
      )}
      {itemEditor && (
        <Modal
          title={itemEditor.item.title || "Add an item"}
          onClose={() => setItemEditor(null)}
        >
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              const sec = document.sections.find(
                (s) => s.id === itemEditor.sectionId,
              )!;
              const existing = sec.items.some(
                (i) => i.id === itemEditor.item.id,
              );
              change({
                ...document,
                sections: document.sections.map((s) =>
                  s.id === sec.id
                    ? {
                        ...s,
                        items: existing
                          ? s.items.map((i) =>
                              i.id === itemEditor.item.id ? itemEditor.item : i,
                            )
                          : [...s.items, itemEditor.item],
                      }
                    : s,
                ),
              });
              setItemEditor(null);
            }}
          >
            {(["title", "subtitle", "description", "date", "url"] as const).map(
              (field) => (
                <label key={field}>
                  {
                    {
                      title: "Title",
                      subtitle: "Subtitle / organisation",
                      description: "Description",
                      date: "Date or period",
                      url: "Link",
                    }[field]
                  }
                  {field === "description" ? (
                    <textarea
                      rows={4}
                      value={itemEditor.item[field]}
                      onChange={(e) =>
                        setItemEditor({
                          ...itemEditor,
                          item: { ...itemEditor.item, [field]: e.target.value },
                        })
                      }
                      maxLength={4000}
                    />
                  ) : (
                    <input
                      value={itemEditor.item[field]}
                      required={field === "title"}
                      maxLength={
                        field === "url" ? 2048 : field === "date" ? 100 : 240
                      }
                      onChange={(e) =>
                        setItemEditor({
                          ...itemEditor,
                          item: { ...itemEditor.item, [field]: e.target.value },
                        })
                      }
                      placeholder={field === "url" ? "https://" : ""}
                    />
                  )}
                </label>
              ),
            )}
            <label>
              Tags <span className="optional">separated with commas</span>
              <input
                value={itemEditor.item.tags.join(", ")}
                onChange={(e) =>
                  setItemEditor({
                    ...itemEditor,
                    item: {
                      ...itemEditor.item,
                      tags: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .slice(0, 20),
                    },
                  })
                }
              />
            </label>
            <label className="button secondary">
              <Image />
              {itemEditor.item.image ? "Replace image" : "Add an image"}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={async (e) => {
                  if (!e.target.files?.[0]) return;
                  try {
                    const image = await uploadImage(
                      id,
                      await readImage(e.target.files[0]),
                    );
                    setItemEditor({
                      ...itemEditor,
                      item: { ...itemEditor.item, image },
                    });
                  } catch (err) {
                    setError(message(err));
                  }
                }}
              />
            </label>
            {itemEditor.item.image && (
              <label>
                Image description
                <input
                  value={itemEditor.item.imageAlt}
                  onChange={(e) =>
                    setItemEditor({
                      ...itemEditor,
                      item: { ...itemEditor.item, imageAlt: e.target.value },
                    })
                  }
                  maxLength={240}
                />
              </label>
            )}
            <button className="button primary" type="submit">
              Save item <Check />
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
