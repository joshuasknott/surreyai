import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring } from "motion/react";
import { SiCanva } from "react-icons/si";
import { VscVscode } from "react-icons/vsc";
import "@fontsource/barlow-condensed/latin-700.css";
import "@fontsource/barlow-condensed/latin-800.css";
import "@fontsource/barlow-condensed/latin-900.css";
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
  {
    icon: Sparkle,
    label: "AI assistants",
    items: [
      { label: "ChatGPT", logo: "/images/tools/chatgpt.svg" },
      { label: "Claude", logo: "/images/tools/claude.svg" },
      { label: "Gemini", logo: "/images/tools/gemini.svg" },
      { label: "Perplexity", logo: "/images/tools/perplexity.svg" },
    ],
  },
  {
    icon: Code,
    label: "Coding & build",
    items: [
      { label: "Cursor", logo: "/images/tools/cursor.svg" },
      { label: "GitHub Copilot", logo: "/images/tools/github-copilot.svg" },
      { label: "Replit", logo: "/images/tools/replit.svg" },
      { label: "VS Code", Icon: VscVscode, color: "#1682d4" },
    ],
  },
  {
    icon: PencilSimple,
    label: "No-code & creative",
    items: [
      { label: "Lovable", logo: "/images/tools/lovable.svg" },
      { label: "v0", logo: "/images/tools/v0.svg" },
      { label: "Figma", logo: "/images/tools/figma.svg" },
      { label: "Canva", Icon: SiCanva, color: "#00a9a5" },
    ],
  },
  {
    icon: Database,
    label: "Models & APIs",
    items: [
      { label: "OpenAI API", logo: "/images/tools/openai.svg" },
      { label: "Anthropic API", logo: "/images/tools/anthropic.svg" },
      { label: "Google AI Studio", logo: "/images/tools/google-ai.svg" },
      { label: "Hugging Face", logo: "/images/tools/hugging-face.svg" },
      { label: "Open source", logo: "/images/tools/open-source.svg" },
    ],
  },
  {
    icon: Key,
    label: "Access options",
    items: [
      { label: "Free tiers" },
      { label: "Student offers" },
      { label: "Paid subscriptions" },
      { label: "API credits" },
      { label: "University access" },
    ],
  },
];

const sponsorPaths = [
  { icon: Wrench, title: "Tools & access", text: "Help students build with useful technology and practical resources." },
  { icon: UsersThree, title: "Expertise & mentoring", text: "Share knowledge, open doors and connect with student builders." },
  { icon: AsteriskSimple, title: "Enable participation", text: "Help make a serious national event accessible to more students." },
];

const ease = [0.22, 1, 0.36, 1];
const emailPattern = /^\S+@\S+\.\S+$/;

function EventMark() {
  return (
    <a className="event-mark" href="#top" aria-label="Surrey AI Hack 2027 home">
      <img src="/images/surrey-ai-hack-logo.png" alt="Surrey AI Hack 2027" />
    </a>
  );
}

function ToolChip({ item, index, reducedMotion }) {
  const Logo = item.Icon;
  return (
    <motion.span
      className={`tool-chip${item.logo || Logo ? "" : " tool-chip--access"}`}
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.8 }}
      transition={{ duration: 0.45, delay: index * 0.055, ease }}
      whileHover={reducedMotion ? undefined : { y: -2 }}
    >
      {(item.logo || Logo) && (
        <span className="tool-chip__mark" aria-hidden="true">
          {item.logo ? <img src={item.logo} alt="" /> : <Logo style={{ color: item.color }} />}
        </span>
      )}
      <span>{item.label}</span>
    </motion.span>
  );
}

function Photo({ className, src, alt, position }) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.div
      className={`${className} image-wash`}
      initial={reducedMotion ? false : { opacity: 0, scale: 0.985 }}
      whileInView={reducedMotion ? undefined : { opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.24 }}
      transition={{ duration: 0.9, ease }}
      whileHover={reducedMotion ? undefined : "hover"}
    >
      <motion.img
        src={src}
        alt={alt}
        style={position ? { objectPosition: position } : undefined}
        variants={{ hover: { scale: 1.025 } }}
        transition={{ duration: 0.75, ease }}
      />
    </motion.div>
  );
}

export function App() {
  const [email, setEmail] = useState("");
  const [intent, setIntent] = useState("participant");
  const [status, setStatus] = useState("idle");
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 110, damping: 26, mass: 0.25 });

  const reveal = reducedMotion ? {} : {
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.24 },
    transition: { duration: 0.72, ease },
  };

  const moveToWaitlist = (nextIntent = "participant") => {
    setIntent(nextIntent);
    setStatus("idle");
    document.querySelector("#waitlist")?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
    window.setTimeout(() => document.querySelector("#email")?.focus(), reducedMotion ? 0 : 650);
  };

  const submitInterest = (event) => {
    event.preventDefault();
    if (!emailPattern.test(email.trim())) {
      setStatus("error");
      return;
    }
    setStatus("success");
  };

  return (
    <main id="top">
      <motion.div className="scroll-progress" style={{ scaleX: progress }} aria-hidden="true" />

      <motion.header
        className="site-header shell"
        initial={reducedMotion ? false : { opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.75, ease }}
      >
        <EventMark />
        <nav aria-label="Main navigation">
          <a href="#about">The hack</a>
          <a href="#tools">Tools</a>
          <a href="#sponsors">Sponsors</a>
          <motion.button whileHover={reducedMotion ? undefined : { y: -2 }} whileTap={reducedMotion ? undefined : { scale: 0.98 }} className="nav-cta" type="button" onClick={() => moveToWaitlist()}>Waitlist</motion.button>
        </nav>
      </motion.header>

      <section className="hero shell" aria-labelledby="hero-title">
        <div className="hero__copy">
          <h1 id="hero-title">
            <span className="hero__line"><motion.span initial={reducedMotion ? false : { y: "115%" }} animate={{ y: 0 }} transition={{ duration: 0.82, delay: 0.08, ease }}>Build something</motion.span></span>
            <span className="hero__line"><motion.span initial={reducedMotion ? false : { y: "115%" }} animate={{ y: 0 }} transition={{ duration: 0.82, delay: 0.17, ease }}>worth showing<span className="full-stop">.</span></motion.span></span>
          </h1>
          <motion.p initial={reducedMotion ? false : { opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.44, ease }}>Surrey AI Hack is a national weekend for UK university students to build and demo AI projects.</motion.p>
          <motion.p className="hero__meta" initial={reducedMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.58 }}>2026/27 academic year <span>·</span> Details to be announced</motion.p>
          <motion.div className="hero__actions" initial={reducedMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.68, ease }}>
            <motion.button whileHover={reducedMotion ? undefined : { y: -3 }} whileTap={reducedMotion ? undefined : { scale: 0.98 }} className="button button--primary" type="button" onClick={() => moveToWaitlist()}>Join the waitlist</motion.button>
            <motion.a whileHover={reducedMotion ? undefined : { y: -3 }} whileTap={reducedMotion ? undefined : { scale: 0.98 }} className="button button--secondary" href="#about">Explore the hack</motion.a>
          </motion.div>
        </div>
        <Photo className="hero__image" src="/images/hero-build-space.webp" alt="Students building projects together in a busy studio" position="50% center" />
      </section>

      <section className="manifesto" id="about" aria-labelledby="manifesto-title">
        <div className="shell manifesto__inner">
          <motion.h2 id="manifesto-title" {...reveal}>AI-native.<br />Human-made.<br />Built to show<span className="full-stop">.</span></motion.h2>
          <div className="principles">
            {principles.map(({ icon: Icon, title, text }, index) => (
              <motion.article className="principle" key={title} initial={reducedMotion ? false : { opacity: 0, y: 22 }} whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.5 }} transition={{ duration: 0.62, delay: index * 0.12, ease }}>
                <Icon size={38} weight="regular" aria-hidden="true" />
                <h3>{title}</h3>
                <p>{text}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="people shell" id="people" aria-labelledby="people-title">
        <motion.div className="people__copy" {...reveal}>
          <p className="eyebrow">Who it’s for</p>
          <h2 id="people-title" className="sr-only">Builders of every kind</h2>
          <ul>{people.map((person, index) => <motion.li key={person} initial={reducedMotion ? false : { opacity: 0, x: -12 }} whileInView={reducedMotion ? undefined : { opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.45, delay: index * 0.055, ease }}>{person}</motion.li>)}</ul>
        </motion.div>
        <Photo className="people__image" src="/images/builder-portrait.webp" alt="A student mapping out a prototype with a team" position="center 38%" />
      </section>

      <section className="tools shell" id="tools" aria-labelledby="tools-title">
        <motion.div className="tools__intro" {...reveal}>
          <p className="eyebrow">Tools</p>
          <h2 id="tools-title">Use what<br />helps you build<span className="full-stop">.</span></h2>
          <p>There’s no required stack and no vendor lock-in. Use whatever AI tools help you design, build and ship your idea.</p>
          <p>Examples only—nothing is required or supplied. Bring the tools and access you already have.</p>
        </motion.div>
        <div className="tool-matrix" aria-label="Example tools and access types">
          {toolGroups.map(({ icon: Icon, label, items }, rowIndex) => (
            <motion.div className="tool-row" key={label} initial={reducedMotion ? false : { opacity: 0, y: 16 }} whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.45 }} transition={{ duration: 0.58, delay: rowIndex * 0.07, ease }}>
              <span className="tool-row__icon"><Icon size={22} weight="regular" aria-hidden="true" /></span>
              <strong>{label}</strong>
              <span className="tool-row__items">{items.map((item, index) => <ToolChip key={item.label} item={item} index={index} reducedMotion={reducedMotion} />)}</span>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="national" aria-labelledby="national-title">
        <div className="shell national__inner">
          <motion.div className="national__heading" {...reveal}>
            <p className="eyebrow">National in scope</p>
            <h2 id="national-title">One weekend.<br />Ideas from<br />across the UK<span className="full-stop">.</span></h2>
          </motion.div>
          <motion.div className="national__copy" {...reveal} transition={reducedMotion ? undefined : { duration: 0.72, delay: 0.1, ease }}>
            <p>Students from universities across the UK come together for a serious weekend of building.</p>
            <p>Different universities. Different disciplines. One mission: build, learn and demo something real.</p>
            <p>Share your work, get feedback that helps, and join a community that keeps building.</p>
          </motion.div>
          <Photo className="national__image" src="/images/demo-room.webp" alt="Student builders presenting a prototype to an audience" position="center 45%" />
        </div>
      </section>

      <section className="sponsors shell" id="sponsors" aria-labelledby="sponsors-title">
        <motion.div className="sponsors__heading" {...reveal}>
          <p className="eyebrow">Sponsors</p>
          <h2 id="sponsors-title">Back the next<br />generation of<br />AI builders<span className="full-stop">.</span></h2>
        </motion.div>
        <div className="sponsors__body">
          <motion.p className="sponsors__lede" {...reveal}>Help students turn ideas into working prototypes and shape what comes next.</motion.p>
          <div className="sponsor-paths">
            {sponsorPaths.map(({ icon: Icon, title, text }, index) => (
              <motion.article key={title} initial={reducedMotion ? false : { opacity: 0, y: 18 }} whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.55 }} transition={{ duration: 0.55, delay: index * 0.1, ease }}>
                <span className="sponsor-paths__icon"><Icon size={23} weight="bold" aria-hidden="true" /></span>
                <h3>{title}</h3>
                <p>{text}</p>
              </motion.article>
            ))}
          </div>
        </div>
        <motion.button whileHover={reducedMotion ? undefined : { y: -3 }} whileTap={reducedMotion ? undefined : { scale: 0.98 }} className="button button--sponsor" type="button" onClick={() => moveToWaitlist("partner")}>Discuss sponsorship</motion.button>
      </section>

      <section className="waitlist" id="waitlist" aria-labelledby="waitlist-title">
        <div className="shell waitlist__inner">
          <motion.div className="waitlist__heading" {...reveal}>
            <h2 id="waitlist-title">{intent === "partner" ? "Let’s build it together." : "Be the first to know."}</h2>
            <p>{intent === "partner" ? "Register your interest in supporting the next generation of AI builders." : "Join for announcements, early access and ways to get involved."}</p>
          </motion.div>
          <AnimatePresence mode="wait" initial={false}>
            {status === "success" ? (
              <motion.div key="success" className="success" role="status" initial={reducedMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={reducedMotion ? undefined : { opacity: 0, y: -8 }} transition={{ duration: 0.42, ease }}>
                <strong>You’re on the list.</strong>
                <span>We’ll keep you posted as Surrey AI Hack takes shape.</span>
                <button type="button" onClick={() => { setStatus("idle"); setEmail(""); }}>Add another email</button>
              </motion.div>
            ) : (
              <motion.form key="form" onSubmit={submitInterest} noValidate initial={reducedMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={reducedMotion ? undefined : { opacity: 0, y: -8 }} transition={{ duration: 0.42, ease }}>
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
              </motion.form>
            )}
          </AnimatePresence>
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
