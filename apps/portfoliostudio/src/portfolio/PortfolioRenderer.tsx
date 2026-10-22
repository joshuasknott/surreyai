import type {
  CSSProperties,
  FocusEvent,
  MouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import type {
  PortfolioDocument,
  PortfolioItem,
  PortfolioSection,
  SelectedElement,
} from "../../shared/portfolio";
import "./portfolio.css";

export interface PortfolioRendererProps {
  document: PortfolioDocument;
  editable?: boolean;
  selected?: SelectedElement | null;
  onSelect?: (selection: SelectedElement) => void;
  onEdit?: (selection: SelectedElement, value: string) => void;
  onResize?: (change: { selection: SelectedElement; width: number }) => void;
  preview?: boolean;
}

const selection = (
  sectionId: string,
  field: SelectedElement["field"],
  itemId?: string,
  itemField?: SelectedElement["itemField"],
): SelectedElement => ({ sectionId, field, itemId, itemField });

const fontStack = (
  font: PortfolioDocument["theme"]["headingFont"],
  heading = false,
) => {
  const stacks: Record<PortfolioDocument["theme"]["headingFont"], string> = {
    inter: "Inter, system-ui, sans-serif",
    fraunces: "Fraunces, Georgia, serif",
    "space-grotesk": "'Space Grotesk', Inter, system-ui, sans-serif",
    "plex-mono": "'IBM Plex Mono', ui-monospace, SFMono-Regular, monospace",
  };
  return stacks[font] || (heading ? stacks.fraunces : stacks.inter);
};

const safeHref = (value: string) => {
  if (!value) return undefined;
  if (/^#[A-Za-z][A-Za-z0-9_-]*$/.test(value)) return value;
  if (
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !/[\r\n<>]/.test(value)
  )
    return value;
  try {
    const url = new URL(value);
    return ["https:", "http:", "mailto:", "tel:"].includes(url.protocol)
      ? value
      : undefined;
  } catch {
    return undefined;
  }
};

const sectionAnchor = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, "-");

const navigationLabel = (section: PortfolioSection) => {
  const labels: Partial<Record<PortfolioSection["type"], string>> = {
    projects: "Work",
    gallery: "Gallery",
    experience: "Experience",
    education: "Education",
    about: "About",
    skills: "Skills",
    achievements: "Awards",
    interests: "Interests",
    contact: "Contact",
    text: "Notes",
    links: "Links",
  };
  const label = labels[section.type] || section.title.trim() || "Explore";
  return label.length > 14 ? `${label.slice(0, 13).trimEnd()}…` : label;
};

function TextField({
  sectionId,
  field,
  value,
  className = "",
  editable,
  selected,
  onSelect,
  onEdit,
  itemId,
  itemField,
  as = "span",
}: {
  sectionId: string;
  field: SelectedElement["field"];
  value: string;
  className?: string;
  editable: boolean;
  selected?: SelectedElement | null;
  onSelect?: PortfolioRendererProps["onSelect"];
  onEdit?: PortfolioRendererProps["onEdit"];
  itemId?: string;
  itemField?: SelectedElement["itemField"];
  as?: "span" | "p" | "h1" | "h2" | "h3" | "div";
}) {
  const picked = selection(sectionId, field, itemId, itemField);
  const active =
    selected?.sectionId === sectionId &&
    selected.field === field &&
    selected.itemId === itemId &&
    selected.itemField === itemField;
  const Component = as;
  const blur = (event: FocusEvent<HTMLElement>) => {
    const next = event.currentTarget.textContent || "";
    if (next !== value) onEdit?.(picked, next);
  };
  return (
    <Component
      className={"pf-editable " + className + (active ? " is-selected" : "")}
      data-section-id={sectionId}
      data-field={field}
      data-item-id={itemId}
      data-item-field={itemField}
      contentEditable={editable}
      suppressContentEditableWarning
      onPaste={
        editable
          ? (event) => {
              event.preventDefault();
              event.currentTarget.textContent =
                event.clipboardData.getData("text/plain");
            }
          : undefined
      }
      onClick={(event) => {
        event.stopPropagation();
        onSelect?.(picked);
      }}
      onBlur={editable ? blur : undefined}
      data-placeholder={editable && !value ? "Click to add text" : undefined}
      tabIndex={editable ? 0 : undefined}
    >
      {value}
    </Component>
  );
}

function preventLink(event: MouseEvent<HTMLAnchorElement>) {
  event.preventDefault();
}
function mediaAlt(value: PortfolioItem | PortfolioSection) {
  return value.imageAlt || value.title;
}

function ItemCard({
  section,
  item,
  editable,
  selected,
  onSelect,
  onEdit,
}: {
  section: PortfolioSection;
  item: PortfolioItem;
  editable: boolean;
  selected?: SelectedElement | null;
  onSelect?: PortfolioRendererProps["onSelect"];
  onEdit?: PortfolioRendererProps["onEdit"];
}) {
  const picked = selection(section.id, "item", item.id);
  const active =
    selected?.sectionId === section.id &&
    selected.field === "item" &&
    selected.itemId === item.id;
  const href = safeHref(item.url);
  return (
    <article
      className={"pf-item " + (active ? "is-selected" : "")}
      data-section-id={section.id}
      data-field="item"
      data-item-id={item.id}
      onClick={(event) => {
        event.stopPropagation();
        onSelect?.(picked);
      }}
      tabIndex={editable ? 0 : undefined}
      onKeyDown={(event) => {
        if (editable && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onSelect?.(picked);
        }
      }}
    >
      {item.image && (
        <div className="pf-item-media">
          <img
            src={item.image}
            alt={mediaAlt(item)}
            loading="lazy"
            onClick={(event) => {
              event.stopPropagation();
              onSelect?.(selection(section.id, "item", item.id, "image"));
            }}
          />
        </div>
      )}
      <div className="pf-item-copy">
        {item.date && <span className="pf-item-date">{item.date}</span>}
        <TextField
          sectionId={section.id}
          field="item"
          itemId={item.id}
          itemField="title"
          value={item.title}
          className="pf-item-title"
          editable={editable}
          selected={selected}
          onSelect={onSelect}
          onEdit={onEdit}
          as="h3"
        />
        {item.subtitle && (
          <TextField
            sectionId={section.id}
            field="item"
            itemId={item.id}
            itemField="subtitle"
            value={item.subtitle}
            className="pf-item-subtitle"
            editable={editable}
            selected={selected}
            onSelect={onSelect}
            onEdit={onEdit}
            as="p"
          />
        )}
        <TextField
          sectionId={section.id}
          field="item"
          itemId={item.id}
          itemField="description"
          value={item.description}
          className="pf-item-description"
          editable={editable}
          selected={selected}
          onSelect={onSelect}
          onEdit={onEdit}
          as="p"
        />
        {item.tags.length > 0 && (
          <div className="pf-item-tags">
            {item.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        )}
        {href && !editable && (
          <a
            className="pf-item-url"
            href={href}
            target={href.startsWith("http") ? "_blank" : undefined}
            rel={href.startsWith("http") ? "noreferrer" : undefined}
            onClick={(event) => event.stopPropagation()}
          >
            View project <span aria-hidden="true">↗</span>
          </a>
        )}
      </div>
    </article>
  );
}

function SectionImage({
  section,
  editable,
  selected,
  onSelect,
  onResize,
}: {
  section: PortfolioSection;
  editable: boolean;
  selected?: SelectedElement | null;
  onSelect?: PortfolioRendererProps["onSelect"];
  onResize?: PortfolioRendererProps["onResize"];
}) {
  if (!section.image) return null;
  const active =
    selected?.sectionId === section.id && selected.field === "image";
  const canResize =
    editable &&
    Boolean(onResize) &&
    active &&
    section.type === "hero" &&
    (section.style.imagePosition === "left" ||
      section.style.imagePosition === "right");
  const startResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!onResize) return;
    event.preventDefault();
    event.stopPropagation();
    const container = event.currentTarget.parentElement?.parentElement;
    const containerWidth = container?.getBoundingClientRect().width || 0;
    if (!containerWidth) return;
    const surface = event.currentTarget.ownerDocument.defaultView;
    if (!surface) return;
    const startX = event.clientX;
    const startWidth = section.style.imageWidth;
    const direction = section.style.imagePosition === "left" ? 1 : -1;
    let lastWidth = startWidth;
    const move = (moveEvent: PointerEvent) => {
      const width = Math.max(
        20,
        Math.min(
          80,
          Math.round(
            startWidth +
              (((moveEvent.clientX - startX) * direction) / containerWidth) *
                100,
          ),
        ),
      );
      if (width !== lastWidth) {
        lastWidth = width;
        onResize({ selection: selection(section.id, "image"), width });
      }
    };
    const end = () => {
      surface.removeEventListener("pointermove", move);
      surface.removeEventListener("pointerup", end);
      surface.removeEventListener("pointercancel", end);
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    surface.addEventListener("pointermove", move);
    surface.addEventListener("pointerup", end, { once: true });
    surface.addEventListener("pointercancel", end, { once: true });
  };
  return (
    <div
      className={"pf-section-image " + (active ? "is-selected" : "")}
      data-section-id={section.id}
      data-field="image"
      onClick={(event) => {
        event.stopPropagation();
        onSelect?.(selection(section.id, "image"));
      }}
    >
      <img
        src={section.image}
        alt={mediaAlt(section)}
        loading={editable ? "eager" : "lazy"}
      />
      {canResize && (
        <button
          type="button"
          className="pf-image-resize-handle"
          aria-label="Resize image"
          onPointerDown={startResize}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
              event.preventDefault();
              onResize?.({
                selection: selection(section.id, "image"),
                width: Math.max(
                  20,
                  Math.min(
                    80,
                    section.style.imageWidth +
                      (event.key === "ArrowRight" ? 2 : -2),
                  ),
                ),
              });
            }
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <span aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

function Items({
  section,
  editable,
  selected,
  onSelect,
  onEdit,
}: {
  section: PortfolioSection;
  editable: boolean;
  selected?: SelectedElement | null;
  onSelect?: PortfolioRendererProps["onSelect"];
  onEdit?: PortfolioRendererProps["onEdit"];
}) {
  return (
    <div className="pf-items">
      {section.items.map((item) => (
        <ItemCard
          key={item.id}
          section={section}
          item={item}
          editable={editable}
          selected={selected}
          onSelect={onSelect}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}

function SectionContent({
  section,
  editable,
  selected,
  onSelect,
  onEdit,
  onResize,
}: {
  section: PortfolioSection;
  editable: boolean;
  selected?: SelectedElement | null;
  onSelect?: PortfolioRendererProps["onSelect"];
  onEdit?: PortfolioRendererProps["onEdit"];
  onResize?: PortfolioRendererProps["onResize"];
}) {
  const title = (
    <TextField
      sectionId={section.id}
      field="title"
      value={section.title}
      className="pf-section-title"
      editable={editable}
      selected={selected}
      onSelect={onSelect}
      onEdit={onEdit}
      as={section.type === "hero" ? "h1" : "h2"}
    />
  );
  const subtitle =
    section.subtitle || editable ? (
      <TextField
        sectionId={section.id}
        field="subtitle"
        value={section.subtitle}
        className="pf-section-subtitle"
        editable={editable}
        selected={selected}
        onSelect={onSelect}
        onEdit={onEdit}
        as="p"
      />
    ) : null;
  const body =
    section.body || editable ? (
      <TextField
        sectionId={section.id}
        field="body"
        value={section.body}
        className="pf-section-body"
        editable={editable}
        selected={selected}
        onSelect={onSelect}
        onEdit={onEdit}
        as="p"
      />
    ) : null;
  const media = (
    <SectionImage
      section={section}
      editable={editable}
      selected={selected}
      onSelect={onSelect}
      onResize={onResize}
    />
  );
  if (section.type === "hero")
    return (
      <div className="pf-hero-content">
        <div className="pf-hero-copy">
          {subtitle}
          {title}
          {body}
          {section.buttonLabel && (
            <a
              className="pf-button"
              href={editable ? undefined : safeHref(section.buttonUrl) || "#"}
              onClick={editable ? preventLink : undefined}
            >
              {section.buttonLabel} <span aria-hidden="true">↗</span>
            </a>
          )}
        </div>
        {media}
      </div>
    );
  if (
    section.type === "projects" ||
    section.type === "gallery" ||
    section.type === "experience" ||
    section.type === "education"
  )
    return (
      <>
        <div className="pf-section-intro">
          {title}
          {body}
        </div>
        <Items
          section={section}
          editable={editable}
          selected={selected}
          onSelect={onSelect}
          onEdit={onEdit}
        />
      </>
    );
  if (
    section.type === "skills" ||
    section.type === "links" ||
    section.type === "achievements" ||
    section.type === "interests"
  )
    return (
      <>
        <div className="pf-section-intro">
          {title}
          {body}
        </div>
        {section.items.length > 0 && (
          <Items
            section={section}
            editable={editable}
            selected={selected}
            onSelect={onSelect}
            onEdit={onEdit}
          />
        )}
        {section.body && (
          <div className="pf-chip-list">
            {section.body
              .split("·")
              .map((value) => value.trim())
              .filter(Boolean)
              .map((value) => (
                <span key={value}>{value}</span>
              ))}
          </div>
        )}
      </>
    );
  return (
    <div className="pf-text-content">
      {title}
      {subtitle}
      {body}
      {media}
      {section.buttonLabel && (
        <a
          className="pf-button"
          href={editable ? undefined : safeHref(section.buttonUrl) || "#"}
          onClick={editable ? preventLink : undefined}
        >
          {section.buttonLabel} <span aria-hidden="true">↗</span>
        </a>
      )}
    </div>
  );
}

export function PortfolioRenderer({
  document,
  editable = false,
  selected = null,
  onSelect,
  onEdit,
  onResize,
  preview = false,
}: PortfolioRendererProps) {
  const visibleSections = document.sections.filter(
    (section) => section.visible,
  );
  const navigationSections = visibleSections.filter(
    (section) => section.type !== "hero",
  );
  const vars = {
    "--pf-bg": document.theme.background,
    "--pf-surface": document.theme.surface,
    "--pf-color": document.theme.color,
    "--pf-muted": document.theme.muted,
    "--pf-accent": document.theme.accent,
    "--pf-border": document.theme.border,
    "--pf-radius": document.theme.radius + "px",
    "--pf-max": document.theme.maxWidth + "px",
    "--pf-body-size": document.theme.fontSize + "px",
    "--pf-heading-font": fontStack(document.theme.headingFont, true),
    "--pf-body-font": fontStack(document.theme.bodyFont),
    "--pf-heading-weight": document.theme.headingWeight,
  } as CSSProperties;
  return (
    <main
      className={
        "pf-site pf-template-" +
        document.templateId +
        (editable ? " pf-editing" : "") +
        (preview ? " pf-preview" : "")
      }
      style={vars}
      data-template={document.templateId}
    >
      <header className={"pf-site-nav pf-nav-" + document.theme.navigation}>
        <a
          className="pf-site-mark"
          href={editable ? undefined : "#top"}
          onClick={editable ? preventLink : undefined}
          aria-label="Back to top"
        >
          {document.profile.name || document.name}
        </a>
        <nav aria-label="Portfolio navigation">
          {navigationSections.map((section) => (
            <a
              key={section.id}
              href={editable ? undefined : "#" + sectionAnchor(section.id)}
              onClick={editable ? preventLink : undefined}
            >
              {navigationLabel(section)}
            </a>
          ))}
        </nav>
      </header>
      <div className="pf-site-content" id="top">
        {visibleSections.map((section) => (
          <section
            key={section.id}
            id={sectionAnchor(section.id)}
            className={
              "pf-section pf-type-" +
              section.type +
              " pf-layout-" +
              section.layout +
              " pf-image-" +
              (section.image ? section.style.imagePosition : "none") +
              " pf-align-" +
              section.style.textAlign +
              (editable &&
              selected?.sectionId === section.id &&
              selected.field === "section"
                ? " pf-selected-section"
                : "")
            }
            data-section-id={section.id}
            data-field="section"
            style={
              {
                background: section.style.background,
                color: section.style.color,
                "--pf-section-accent": section.style.accent,
                "--pf-section-heading-size": section.style.headingSize
                  ? section.style.headingSize + "px"
                  : undefined,
                "--pf-section-columns": section.style.columns,
                "--pf-section-image-width": section.style.imageWidth + "%",
                "--pf-section-padding-top": section.style.paddingTop + "px",
                "--pf-section-padding-bottom":
                  section.style.paddingBottom + "px",
                textAlign: section.style.textAlign,
              } as CSSProperties
            }
            onClick={() => onSelect?.(selection(section.id, "section"))}
          >
            <div className="pf-section-inner">
              <SectionContent
                section={section}
                editable={editable}
                selected={selected}
                onSelect={onSelect}
                onEdit={onEdit}
                onResize={onResize}
              />
            </div>
          </section>
        ))}
      </div>
      <footer className="pf-site-footer">
        <span>{document.profile.name}</span>
        <span>{document.profile.location}</span>
        {document.profile.email && (
          <a
            href={
              editable
                ? undefined
                : safeHref(`mailto:${document.profile.email}`)
            }
            onClick={editable ? preventLink : undefined}
          >
            {document.profile.email}
          </a>
        )}
        {document.profile.links.length > 0 && (
          <nav aria-label="Profile links">
            {document.profile.links
              .filter((link) => safeHref(link.url))
              .map((link) => (
                <a
                  key={link.id}
                  href={editable ? undefined : safeHref(link.url)}
                  onClick={editable ? preventLink : undefined}
                  target={editable ? undefined : "_blank"}
                  rel="noreferrer"
                >
                  {link.label}
                </a>
              ))}
          </nav>
        )}
        <span>© {new Date().getFullYear()}</span>
      </footer>
    </main>
  );
}
