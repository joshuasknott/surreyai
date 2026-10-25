import { useMemo, useRef, useState } from "react";
import { UploadSimple } from "@phosphor-icons/react";
import {
  portfolioSchema,
  type PortfolioDocument,
} from "../../shared/portfolio";
import {
  studentProfileSchema,
  type StudentProfile,
} from "../../shared/student";
import { extractStudentProfile } from "../../shared/student-import";
import {
  mergeStudentProfile,
  studentFromDocument,
  switchPortfolioDesign,
} from "../data/personalize";
import { templates } from "../data/templates";
import { readCv } from "../lib/import";
import { message } from "../lib/api";
import { DesignGallery } from "../pages/Designs";
import { StudentDetails } from "./StudentDetails";
import { Modal, Notice } from "./ui";
import "./portfolio-content-dialogs.css";

export function PortfolioDesignDialog({
  document,
  onApply,
  onClose,
}: {
  document: PortfolioDocument;
  onApply: (document: PortfolioDocument) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState(document.templateId);
  const name = templates.find((template) => template.id === selected)?.name;
  return (
    <Modal title="Find your next look" wide onClose={onClose}>
      <p className="content-dialog-intro">
        Explore all ten designs with your current writing and images. Your
        sections and edits stay with you.
      </p>
      <DesignGallery
        document={document}
        selected={selected}
        onChoose={setSelected}
      />
      <div className="content-dialog-actions">
        <button className="button secondary" onClick={onClose}>
          Keep current design
        </button>
        <button
          className="button primary"
          disabled={!name || selected === document.templateId}
          onClick={() => onApply(switchPortfolioDesign(document, selected))}
        >
          Use {name || "this design"}
        </button>
      </div>
    </Modal>
  );
}

export function PortfolioInformationDialog({
  document,
  onApply,
  onClose,
}: {
  document: PortfolioDocument;
  onApply: (document: PortfolioDocument, conflicts: string[]) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState<StudentProfile>(() =>
    studentFromDocument(document),
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const merged = useMemo(() => {
    const valid = studentProfileSchema.safeParse(value);
    return valid.success ? mergeStudentProfile(document, valid.data) : null;
  }, [document, value]);
  const importCv = async (file?: File) => {
    if (!file || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = extractStudentProfile(await readCv(file));
      setValue(result.profile);
      setWarnings(result.warnings);
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };
  return (
    <Modal title="Your information" wide onClose={onClose}>
      <div className="information-dialog">
        <p className="content-dialog-intro">
          Your details are available to every design and to AI when you ask for
          a change. Check imported information here. Your own writing on the
          page is preserved.
        </p>
        <button
          className="button secondary small"
          disabled={busy}
          onClick={() => fileInput.current?.click()}
        >
          <UploadSimple />
          {busy ? "Reading your CV…" : "Review a new CV"}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".pdf,.docx,.txt"
          hidden
          aria-label="Upload a new CV"
          onChange={(event) => void importCv(event.target.files?.[0])}
        />
        {error && <Notice>{error}</Notice>}
        {warnings.length > 0 && (
          <div className="information-notes" role="status">
            <strong>Check these details</strong>
            <ul>
              {warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </div>
        )}
        <StudentDetails value={value} onChange={setValue} />
        {merged && merged.conflicts.length > 0 && (
          <div className="information-notes">
            <strong>Your edited writing will stay as it is</strong>
            <ul>
              {merged.conflicts.map((conflict, index) => (
                <li key={index}>{conflict}</li>
              ))}
            </ul>
            <p>
              You can change these entries directly on the canvas or ask AI to
              revise them using your updated information.
            </p>
          </div>
        )}
      </div>
      <div className="content-dialog-actions">
        <button className="button secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          className="button primary"
          disabled={busy || !value.name.trim()}
          onClick={() => {
            if (!merged) {
              setError("Check the details and links before saving.");
              return;
            }
            const validated = portfolioSchema.safeParse(merged.document);
            if (!validated.success) {
              setError(
                "Some sections have too much content to save. Shorten the entries or remove unused items, then try again.",
              );
              return;
            }
            onApply(validated.data, merged.conflicts);
          }}
        >
          Update my information
        </button>
      </div>
    </Modal>
  );
}
