import { useState } from "react";
import {
  AsteriskSimple,
  Code,
  Cube,
  Database,
  Key,
  PencilSimple,
  PresentationChart,
  Sparkle,
  UsersThree,
  Wrench,
} from "@phosphor-icons/react";

const people = [
  "Developers",
  "Designers",
  "Researchers",
  "Product people",
  "Beginners",
  "No-code / low-code builders",
];

const principles = [
  { icon: Cube, title: "Make a real prototype.", text: "Go from an idea to something working over one focused weekend." },
  { icon: UsersThree, title: "Collaborate across disciplines.", text: "Build with people from different courses, skills and perspectives." },
  { icon: PresentationChart, title: "Demo what works.", text: "Share your project, get useful feedback and learn from other teams." },
];

const toolGroups = [
  { icon: Sparkle, label: "AI assistants", items: ["ChatGPT", "Claude", "Gemini", "Perplexity"] },
  { icon: Code, label: "Coding & build", items: ["Cursor", "GitHub Copilot", "Replit", "VS Code"] },
  { icon: PencilSimple, label: "No-code & creative", items: ["Lovable", "v0", "Figma", "Canva"] },
  { icon: Database, label: "Models & APIs", items: ["OpenAI API", "Anthropic API", "Google AI Studio", "Hugging Face", "local / open-source"] },
  { icon: Key, label: "Subscription / access", items: ["Free tiers", "student offers", "paid subscriptions", "API credits", "university access"] },
];

const sponsorPaths = [
  { icon: Wrench, title: "Tools & access", text: "Help students build with useful technology and practical resources." },
  { icon: UsersThree, title: "Expertise & mentoring", text: "Share knowledge, open doors and connect with student builders." },
  { icon: AsteriskSimple, title: "Enable participation", text: "Help make a serious national event accessible to more students." },
];

function EventMark() {
  return (
    <a className="event-mark" href="#top" aria-label="Surrey AI Hack 2027 home">
      <img src="/images/surrey-ai-hack-logo.png" alt="Surrey AI Hack 2027" />
    </a>
  );
}

export function App() {
  const [email, setEmail] = useState("");
  const [intent, setIntent] = useState("participant");
  const [status, setStatus] = useState("idle");

  const moveToWaitlist = (nextIntent = "participant") => {
    setIntent(nextIntent);
    setStatus("idle");
    document.querySelector("#waitlist")?.scrollIntoView({ behavior: "smooth" });
    window.setTimeout(() => document.querySelector("#email")?.focus(), 500);
  };

  const submitInterest = (event) => {
    event.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setStatus("error");
      return;
    }
    setStatus("success");
  };

  return (
    <main id="top">
      <header className="site-header shell">
        <EventMark />
        <nav aria-label="Main navigation">
          <a href="#about">The hack</a>
          <a href="#tools">Tools</a>
          <a href="#sponsors">Sponsors</a>
          <button className="nav-cta" type="button" onClick={() => moveToWaitlist()}>Waitlist</button>
        </nav>
      </header>

      <section className="hero shell" aria-labelledby="hero-title">
        <div className="hero__copy">
          <h1 id="hero-title">Build something<br />worth showing<span className="full-stop">.</span></h1>
          <p>Surrey AI Hack is a national weekend for UK university students to build and demo AI projects.</p>
          <p className="hero__meta">2026/27 academic year <span>·</span> Details to be announced</p>
          <div className="hero__actions">
            <button className="button button--primary" type="button" onClick={() => moveToWaitlist()}>Join the waitlist</button>
            <a className="button button--secondary" href="#about">Explore the hack</a>
          </div>
        </div>
        <div className="hero__image image-wash">
          <img src="/images/hero-build-space.webp" alt="Students building projects together in a busy studio" />
        </div>
      </section>

      <section className="manifesto" id="about" aria-labelledby="manifesto-title">
        <div className="shell manifesto__inner">
          <h2 id="manifesto-title">AI-native.<br />Human-made.<br />Built to show<span className="full-stop">.</span></h2>
          <div className="principles">
            {principles.map(({ icon: Icon, title, text }) => (
              <article className="principle" key={title}>
                <Icon size={38} weight="regular" aria-hidden="true" />
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="people shell" id="people" aria-labelledby="people-title">
        <div className="people__copy">
          <p className="eyebrow">Who it’s for</p>
          <h2 id="people-title" className="sr-only">Builders of every kind</h2>
          <ul>{people.map((person) => <li key={person}>{person}</li>)}</ul>
        </div>
        <div className="people__image image-wash">
          <img src="/images/builder-portrait.webp" alt="A student mapping out a prototype with a team" />
        </div>
      </section>

      <section className="tools shell" id="tools" aria-labelledby="tools-title">
        <div className="tools__intro">
          <p className="eyebrow">Tools</p>
          <h2 id="tools-title">Use what<br />helps you build<span className="full-stop">.</span></h2>
          <p>There’s no required stack and no vendor lock-in. Use whatever AI tools help you design, build and ship your idea.</p>
          <p>Examples only—nothing is required or supplied. Bring the tools and access you already have.</p>
        </div>
        <div className="tool-matrix" aria-label="Example tools and access types">
          {toolGroups.map(({ icon: Icon, label, items }) => (
            <div className="tool-row" key={label}>
              <span className="tool-row__icon"><Icon size={23} weight="regular" aria-hidden="true" /></span>
              <strong>{label}</strong>
              <span className="tool-row__items">{items.map((item) => <span key={item}>{item}</span>)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="national" aria-labelledby="national-title">
        <div className="shell national__inner">
          <div className="national__heading">
            <p className="eyebrow">National in scope</p>
            <h2 id="national-title">One weekend.<br />Ideas from<br />across the UK<span className="full-stop">.</span></h2>
          </div>
          <div className="national__copy">
            <p>Students from universities across the UK come together for a serious weekend of building.</p>
            <p>Different universities. Different disciplines. One mission: build, learn and demo something real.</p>
            <p>Share your work, get feedback that helps, and join a community that keeps building.</p>
          </div>
          <div className="national__image image-wash">
            <img src="/images/demo-room.webp" alt="Student builders presenting a prototype to an audience" />
          </div>
        </div>
      </section>

      <section className="sponsors shell" id="sponsors" aria-labelledby="sponsors-title">
        <div className="sponsors__heading">
          <p className="eyebrow">Sponsors</p>
          <h2 id="sponsors-title">Back the next<br />generation of<br />AI builders<span className="full-stop">.</span></h2>
        </div>
        <div className="sponsors__body">
          <p className="sponsors__lede">Help students turn ideas into working prototypes and shape what comes next.</p>
          <div className="sponsor-paths">
            {sponsorPaths.map(({ icon: Icon, title, text }) => (
              <article key={title}>
                <span className="sponsor-paths__icon"><Icon size={24} weight="bold" aria-hidden="true" /></span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
        <button className="button button--sponsor" type="button" onClick={() => moveToWaitlist("partner")}>Discuss sponsorship</button>
      </section>

      <section className="waitlist" id="waitlist" aria-labelledby="waitlist-title">
        <div className="shell waitlist__inner">
          <div className="waitlist__heading">
            <h2 id="waitlist-title">{intent === "partner" ? "Let’s build it together." : "Be the first to know."}</h2>
            <p>{intent === "partner" ? "Register your interest in supporting the next generation of AI builders." : "Join for announcements, early access and ways to get involved."}</p>
          </div>
          {status === "success" ? (
            <div className="success" role="status">
              <strong>You’re on the list.</strong>
              <span>We’ll keep you posted as Surrey AI Hack takes shape.</span>
              <button type="button" onClick={() => { setStatus("idle"); setEmail(""); }}>Add another email</button>
            </div>
          ) : (
            <form onSubmit={submitInterest} noValidate>
              <div className="form-row">
                <label className="sr-only" htmlFor="email">Your email</label>
                <input id="email" type="email" inputMode="email" autoComplete="email" placeholder={intent === "partner" ? "Your work email" : "Your university email"} value={email} onChange={(event) => { setEmail(event.target.value); setStatus("idle"); }} aria-invalid={status === "error"} aria-describedby={status === "error" ? "email-error" : "email-note"} />
                <button type="submit">Join the waitlist</button>
              </div>
              <div className="intent-switch" aria-label="Interest type">
                <span>I’m interested as</span>
                <button aria-pressed={intent === "participant"} className={intent === "participant" ? "is-active" : ""} type="button" onClick={() => { setIntent("participant"); setStatus("idle"); }}>Participant</button>
                <button aria-pressed={intent === "partner"} className={intent === "partner" ? "is-active" : ""} type="button" onClick={() => { setIntent("partner"); setStatus("idle"); }}>Sponsor / partner</button>
              </div>
              {status === "error" ? <p id="email-error" className="form-note form-note--error">Enter a valid email address.</p> : <p id="email-note" className="form-note">Updates only. No noise.</p>}
            </form>
          )}
        </div>
      </section>

      <footer className="site-footer shell">
        <EventMark />
        <nav aria-label="Footer navigation">
          <a href="#about">The hack</a>
          <a href="#tools">Tools</a>
          <a href="#sponsors">Sponsors</a>
          <a href="#waitlist">Waitlist</a>
        </nav>
      </footer>
    </main>
  );
}
