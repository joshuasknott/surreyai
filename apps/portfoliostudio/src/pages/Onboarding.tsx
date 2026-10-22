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
import { DesignGallery } from "./Designs";
import { blankPortfolio, createFromTemplate } from "../data/templates";
import { createDraft, message, removeDraft } from "../lib/api";
import { readCv } from "../lib/import";
import {
  entryIntentFromParams,
  matchesEntryIntent,
  normalizeStoredEntryIntent,
  type OnboardingEntryIntent,
} from "../lib/onboarding-session";
import type { PortfolioDocument } from "../../shared/portfolio";
import "./onboarding.css";
const onboardingStorageKey = "portfolio-studio:onboarding:v1";
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
      design: boundedString(value.design, 80) || "cobalt",
      scratch: value.scratch === true,
      prompt: boundedString(value.prompt, 5000),
    };
  } catch {
    return null;
  }
}
export function Onboarding() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
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
  const [name, setName] = useState(resume?.name || "");
  const [headline, setHeadline] = useState(resume?.headline || "");
  const [bio, setBio] = useState(resume?.bio || "");
  const [workedOn, setWorkedOn] = useState(resume?.workedOn || "");
  const [cv, setCv] = useState(resume?.cv || "");
  const [filename, setFilename] = useState(resume?.filename || "");
  const [design, setDesign] = useState(
    params.get("design")?.trim().toLowerCase() || resume?.design || "cobalt",
  );
  const [scratch, setScratch] = useState(
    entryIntent === "scratch" ||
      (entryIntent === "default" && resume?.scratch === true),
  );
  const [prompt, setPrompt] = useState(resume?.prompt || "");
  useEffect(() => {
    try {
      sessionStorage.setItem(
        onboardingStorageKey,
        JSON.stringify({
          version: 1,
          entryIntent: snapshotIntent,
          step,
          manual,
          name,
          headline,
          bio,
          workedOn,
          cv,
          filename,
          design,
          scratch,
          prompt,
        } satisfies OnboardingSnapshot),
      );
    } catch {
      /* Private browsing or a full session store can reject optional recovery. */
    }
  }, [
    step,
    manual,
    name,
    headline,
    bio,
    workedOn,
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
      const guessedName = text
        .split(/\n/)
        .map((s) => s.trim())
        .find((s) => s.length > 2 && s.length < 60);
      if (!name && guessedName) setName(guessedName);
      setManual(true);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };
  const finish = () => {
    setError("");
    try {
      const profile = {
        name: name.trim() || "Your name",
        headline: headline.trim() || "A little about what you do.",
        bio: bio.trim(),
        location: "",
        email: "",
        photo: "",
        links: [],
      };
      let document: PortfolioDocument = scratch
        ? blankPortfolio(profile)
        : createFromTemplate(design, profile);
      // Example work belongs in the gallery, never in a student's new portfolio.
      document = {
        ...document,
        sections: document.sections.map((section) => {
          if (section.type === "hero")
            return {
              ...section,
              title: profile.headline,
              subtitle: profile.name,
              body: profile.bio,
              image: scratch ? "" : section.image,
              imageAlt: scratch ? "" : section.imageAlt,
            };
          if (section.type === "about")
            return {
              ...section,
              title: "A little about me",
              body: profile.bio || "Tell your story here.",
              items: [],
            };
          if (section.type === "projects" || section.type === "gallery")
            return {
              ...section,
              title: workedOn.trim() ? "Selected work" : section.title,
              body: "",
              image: "",
              imageAlt: "",
              visible: Boolean(workedOn.trim()),
              items: workedOn.trim()
                ? [
                    {
                      id: "my-work",
                      title: workedOn.trim(),
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
            };
          if (section.type === "contact")
            return {
              ...section,
              title: "Let’s connect.",
              body: "Add your email and links in the editor.",
              items: [],
              buttonLabel: "",
              buttonUrl: "",
            };
          return {
            ...section,
            items: [],
            body: "",
            image: "",
            imageAlt: "",
            visible: false,
          };
        }),
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
                <label>
                  Your name
                  <input
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={120}
                    placeholder="e.g. Amina Patel"
                  />
                </label>
                <label>
                  What do you do?
                  <input
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    maxLength={240}
                    placeholder="e.g. Computer science student & creative developer"
                  />
                </label>
                <label>
                  One thing you’ve worked on{" "}
                  <span className="optional">optional</span>
                  <input
                    value={workedOn}
                    onChange={(e) => setWorkedOn(e.target.value)}
                    maxLength={240}
                    placeholder="e.g. a society event, coursework or a part-time job"
                  />
                  <small className="help-text">
                    Coursework, volunteering and part-time work all count.
                  </small>
                </label>
                <label>
                  A little about you <span className="optional">optional</span>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={6000}
                    rows={4}
                    placeholder="Your interests, what you’re working on, and where you want to go."
                  />
                </label>
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
                      AI can help organise this in the editor. Only include
                      details you want to share.
                    </p>
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
                    maxLength={5000}
                    placeholder="A clean, editorial portfolio for a design student. Big typography, warm colours and space for photography…"
                  />
                </label>
                <p className="help-text">
                  Start with an editable blank canvas. Your idea will be ready
                  to send to AI in the editor.
                </p>
              </div>
            ) : (
              <DesignGallery selected={design} onChoose={setDesign} />
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
            disabled={busy || (step === 0 && manual && !name.trim())}
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
