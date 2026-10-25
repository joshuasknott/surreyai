import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  Sparkle,
  UploadSimple,
} from "@phosphor-icons/react";
import { Brand, Notice } from "../components/ui";
import { WorkshopSteps } from "../components/WorkshopSteps";
import { StudentDetails } from "../components/StudentDetails";
import { DesignGallery } from "./Designs";
import {
  createStudentCanvas,
  createPersonalizedPortfolio,
} from "../data/personalize";
import { createDraft, api, message, removeDraft } from "../lib/api";
import { useAuth } from "../lib/auth";
import { readCv } from "../lib/import";
import {
  extractStudentProfile,
  studentProfileSchema,
  type StudentProfile,
} from "../../shared/student";
import {
  entryIntentFromParams,
  matchesEntryIntent,
  normalizeStoredEntryIntent,
  type OnboardingEntryIntent,
} from "../lib/onboarding-session";
import type { PortfolioDocument } from "../../shared/portfolio";
import "./onboarding.css";
const onboardingStorageKey = "portfolio-studio:onboarding:v1";
const legacyDesignAliases: Record<string, string> = {
  cobalt: "cobalt-v2",
  form: "open-studio",
  fieldnotes: "field-notes",
  signal: "signal-v2",
  studio: "open-studio",
  bloom: "field-notes",
  frame: "offset",
  archive: "ledger",
  patch: "open-studio",
  current: "field-notes",
};
function normalizeDesignId(value: string): string {
  const id = value.trim().toLowerCase();
  return legacyDesignAliases[id] || id || "first-light";
}
type OnboardingSnapshot = {
  version: 1;
  entryIntent: OnboardingEntryIntent;
  step: number;
  manual: boolean;
  name: string;
  headline: string;
  bio: string;
  workedOn: string;
  cv: string;
  filename: string;
  design: string;
  scratch: boolean;
  prompt: string;
  student?: StudentProfile;
};
function boundedString(value: unknown, max: number): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}
function readOnboardingSnapshot(): OnboardingSnapshot | null {
  try {
    const raw = sessionStorage.getItem(onboardingStorageKey);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<OnboardingSnapshot>;
    if (!value || typeof value !== "object" || value.version !== 1) return null;
    return {
      version: 1,
      entryIntent: normalizeStoredEntryIntent(value.entryIntent),
      step: value.step === 1 ? 1 : 0,
      manual: value.manual === true,
      name: boundedString(value.name, 120),
      headline: boundedString(value.headline, 240),
      bio: boundedString(value.bio, 6000),
      workedOn: boundedString(value.workedOn, 240),
      cv: boundedString(value.cv, 40_000),
      filename: boundedString(value.filename, 240),
      design: normalizeDesignId(boundedString(value.design, 80)),
      scratch: value.scratch === true,
      prompt: boundedString(value.prompt, 8000),
      student: studentProfileSchema.safeParse(value.student).success
        ? studentProfileSchema.parse(value.student)
        : undefined,
    };
  } catch {
    return null;
  }
}
export function Onboarding() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [restored] = useState(readOnboardingSnapshot);
  const entryIntent = entryIntentFromParams(params);
  const canRestore = restored
    ? matchesEntryIntent(entryIntent, restored.entryIntent)
    : false;
  const resume = canRestore ? restored : null;
  const snapshotIntent =
    entryIntent === "default"
      ? (restored?.entryIntent ?? entryIntent)
      : entryIntent;
  const [step, setStep] = useState(resume?.step || 0);
  const [manual, setManual] = useState(resume?.manual || false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const [student, setStudent] = useState<StudentProfile>(
    () =>
      resume?.student ||
      studentProfileSchema.parse({
        version: 1,
        name: resume?.name || "",
        headline: resume?.headline || "",
        bio: resume?.bio || "",
        projects: resume?.workedOn
          ? [
              {
                id: "onboarding-work",
                title: resume.workedOn,
                subtitle: "",
                description: "",
                image: "",
                imageAlt: "",
                url: "",
                tags: [],
                date: "",
              },
            ]
          : [],
      }),
  );
  const [cv, setCv] = useState(resume?.cv || "");
  const [filename, setFilename] = useState(resume?.filename || "");
  const [design, setDesign] = useState(
    normalizeDesignId(params.get("design") || resume?.design || "first-light"),
  );
  const [scratch, setScratch] = useState(
    entryIntent === "scratch" ||
      (entryIntent === "default" && resume?.scratch === true),
  );
  const [prompt, setPrompt] = useState(resume?.prompt || "");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [aiBusy, setAiBusy] = useState(false);
  useEffect(() => {
    try {
      sessionStorage.setItem(
        onboardingStorageKey,
        JSON.stringify({
          version: 1,
          entryIntent: snapshotIntent,
          step,
          manual,
          name: student.name,
          headline: student.headline,
          bio: student.bio,
          workedOn: student.projects[0]?.title || "",
          cv,
          filename,
          design,
          scratch,
          prompt,
          student,
        } satisfies OnboardingSnapshot),
      );
    } catch {
      /* Private browsing or a full session store can reject optional recovery. */
    }
  }, [
    step,
    manual,
    student,
    cv,
    filename,
    design,
    snapshotIntent,
    scratch,
    prompt,
  ]);
  const startAgain = () => {
    try {
      sessionStorage.removeItem(onboardingStorageKey);
    } catch {
      /* best effort */
    }
    window.location.assign("/new");
  };
  const upload = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const text = await readCv(file);
      setCv(text);
      setFilename(file.name);
      const extracted = extractStudentProfile(text);
      setStudent(extracted.profile);
      setWarnings(extracted.warnings);
      setManual(true);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };
  const improveWithAi = async () => {
    if (!cv.trim()) return;
    if (!user) {
      navigate("/auth?next=/new");
      return;
    }
    setAiBusy(true);
    setError("");
    try {
      const result = await api<{
        profile: StudentProfile;
        warnings?: string[];
        method: "ai";
      }>("/ai/extract-cv", {
        method: "POST",
        body: JSON.stringify({ text: cv }),
      });
      const parsed = studentProfileSchema.safeParse(result.profile);
      if (!parsed.success)
        throw new Error(
          "The AI returned details that need a little more review.",
        );
      setStudent(parsed.data);
      setWarnings(result.warnings || []);
    } catch (e) {
      setError(message(e));
    } finally {
      setAiBusy(false);
    }
  };
  const finish = () => {
    setError("");
    try {
      const normalizedStudent = studentProfileSchema.parse({
        ...student,
        name: student.name.trim() || "Your name",
        headline: student.headline.trim(),
      });
      let document: PortfolioDocument = scratch
        ? createStudentCanvas(normalizedStudent)
        : createPersonalizedPortfolio(design, normalizedStudent);
      document = {
        ...document,
        student: normalizedStudent,
        profile: {
          ...document.profile,
          name: normalizedStudent.name,
          headline: normalizedStudent.headline,
          bio: normalizedStudent.bio,
          location: normalizedStudent.location,
          email: normalizedStudent.email,
          photo: normalizedStudent.photo,
          links: normalizedStudent.links,
        },
        seo: {
          title: [normalizedStudent.name, normalizedStudent.headline]
            .filter(Boolean)
            .join(" — ")
            .slice(0, 160),
          description: normalizedStudent.bio.slice(0, 400),
        },
      };
      const project = createDraft(document, "society");
      const brief = cv || (scratch && prompt);
      if (brief) {
        try {
          sessionStorage.setItem(
            `portfolio-studio:brief:${project.id}`,
            JSON.stringify({
              cv,
              prompt: scratch ? prompt : "",
              pending: true,
            }),
          );
        } catch {
          // Do not leave a duplicate draft behind when optional session storage is full.
          try {
            removeDraft(project.id);
          } catch {
            /* best effort cleanup */
          }
          throw new Error(
            "Your browser could not save the private creation notes. Please free some session storage and try again.",
          );
        }
      }
      try {
        sessionStorage.removeItem(onboardingStorageKey);
      } catch {
        /* best effort */
      }
      navigate(`/editor/${project.id}`);
    } catch (e) {
      setError(message(e));
    }
  };
  return (
    <>
      <header className="app-header">
        <Brand />
        <span className="onboarding-progress">
          Step {step + 1} of 4{" "}
          <span>{["Your details", "Choose a design"][step]}</span>
        </span>
      </header>
      <main
        className={`onboarding onboarding-simple ${step === 1 && !scratch ? "onboarding-gallery" : ""}`}
      >
        <WorkshopSteps current={step === 0 ? "details" : "design"} />
        {resume && (
          <button className="text-button onboarding-reset" onClick={startAgain}>
            Start again
          </button>
        )}
        <div className="onboarding-heading">
          <span className="eyebrow">
            {["FIRST, A LITTLE ABOUT YOU", "MAKE IT YOURS"][step]}
          </span>
          <h1>{["Let’s start with you.", "Choose a starting point."][step]}</h1>
          <p>
            {
              [
                "Bring your CV, or add a few details. You can change everything later.",
                "Pick one of ten designs, or describe a blank canvas for AI to shape.",
              ][step]
            }
          </p>
        </div>
        {error && <Notice>{error}</Notice>}
        {step === 0 && (
          <div className="onboarding-form">
            {!manual ? (
              <>
                <button
                  className="upload-zone"
                  disabled={busy}
                  onClick={() => input.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    void upload(e.dataTransfer.files[0]);
                  }}
                >
                  <UploadSimple size={30} />
                  <strong>
                    {busy ? "Reading your CV…" : "Drop your CV here"}
                  </strong>
                  <span>or choose a file</span>
                  <small>PDF, DOCX or TXT · up to 10 MB</small>
                </button>
                <button
                  className="text-button manual-option"
                  onClick={() => setManual(true)}
                >
                  I’ll enter my details instead <ArrowRight />
                </button>
                <p className="privacy-note">
                  Your original CV stays on your device. Review your details
                  before adding them to your website.
                </p>
              </>
            ) : (
              <>
                <div className="file-status">
                  {filename ? (
                    <>
                      <FileText />
                      <span>{filename}</span>
                      <Check />
                    </>
                  ) : (
                    <span>
                      Start with the basics. You can add more in the editor.
                    </span>
                  )}
                </div>
                <StudentDetails value={student} onChange={setStudent} />
                {warnings.length > 0 && (
                  <div className="student-import-warnings" role="status">
                    <strong>Worth checking</strong>
                    <ul>
                      {warnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {cv && (
                  <details>
                    <summary>Review imported text</summary>
                    <textarea
                      aria-label="Imported CV text"
                      rows={7}
                      value={cv}
                      onChange={(e) => setCv(e.target.value)}
                    />
                    <p className="help-text">
                      This text stays on your device unless you choose to
                      improve the extraction with AI. Only include details you
                      want to share.
                    </p>
                    <button
                      className="text-button ai-extract-button"
                      type="button"
                      disabled={aiBusy}
                      onClick={() => void improveWithAi()}
                    >
                      <Sparkle />
                      {aiBusy
                        ? "Improving extraction…"
                        : user
                          ? "Improve extraction with AI"
                          : "Sign in to improve with AI"}
                    </button>
                  </details>
                )}
                <button
                  className="text-button"
                  onClick={() => input.current?.click()}
                >
                  <UploadSimple />
                  {filename ? "Choose another CV" : "Upload a CV"}
                </button>
              </>
            )}
            <input
              ref={input}
              type="file"
              accept=".pdf,.docx,.txt"
              hidden
              onChange={(e) => void upload(e.target.files?.[0])}
            />
          </div>
        )}
        {step === 1 && (
          <>
            <div className="creation-tabs">
              <button
                className={!scratch ? "active" : ""}
                onClick={() => setScratch(false)}
              >
                Start from a design
              </button>
              <button
                className={scratch ? "active" : ""}
                onClick={() => setScratch(true)}
              >
                <Sparkle />
                Create from scratch
              </button>
            </div>
            {scratch ? (
              <div className="onboarding-form">
                <label className="prompt-label">
                  What do you have in mind?
                  <textarea
                    rows={6}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    maxLength={8000}
                    placeholder="A clean, editorial portfolio for a design student. Big typography, warm colours and space for photography…"
                  />
                </label>
                <p className="help-text">
                  Start with an editable blank canvas. Your idea will be ready
                  to send to AI in the editor.
                </p>
              </div>
            ) : (
              <DesignGallery
                selected={design}
                student={student}
                onChoose={(id) => setDesign(id)}
              />
            )}
          </>
        )}
        <div className="onboarding-bottom">
          <button
            className="text-button"
            onClick={() => (step ? setStep(step - 1) : navigate("/"))}
          >
            <ArrowLeft />
            Back
          </button>
          <button
            className="button primary"
            disabled={
              busy || aiBusy || (step === 0 && manual && !student.name.trim())
            }
            onClick={() => {
              if (step === 0 && !manual) {
                setManual(true);
                return;
              }
              if (step < 1) {
                setStep(step + 1);
                window.scrollTo(0, 0);
              } else finish();
            }}
          >
            {step === 1 ? "Open my editor" : "Continue"}
            <ArrowRight />
          </button>
        </div>
      </main>
    </>
  );
}
