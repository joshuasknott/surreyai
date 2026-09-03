import { useState } from "react";

const people = [
  "Developers",
  "Designers",
  "Researchers",
  "Product people",
  "Beginners",
  "No-code / low-code builders",
];

function EventMark() {
  return (
    <a className="event-mark" href="#top" aria-label="Surrey AI Hack 2027 home">
      <span className="event-mark__square" aria-hidden="true" />
      <span className="event-mark__type">
        <span>Surrey</span>
        <span>AI Hack</span>
        <span>/2027</span>
      </span>
    </a>
  );
}

function SocietyMark({ footer = false }) {
  return (
    <div className={`society-mark${footer ? " society-mark--footer" : ""}`}>
      <span>{footer ? "Created by" : "Organised by"}</span>
      <span className="society-mark__crop">
        <img src="/images/surrey-ai-society.png" alt="Surrey Artificial Intelligence Society" />
      </span>
    </div>
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
          <a href="#about">About</a>
          <a href="#people">Who it’s for</a>
          <a href="#tools">What to expect</a>
          <button type="button" onClick={() => moveToWaitlist("partner")}>Partner with us</button>
          <a href="#faq">FAQ</a>
        </nav>
        <SocietyMark />
      </header>

      <section className="hero shell" aria-labelledby="hero-title">
        <div className="hero__copy">
          <h1 id="hero-title">Ideas<br />become<br />prototypes<br />here<span className="full-stop">.</span></h1>
          <p>Surrey AI Hack is a national weekend for UK university students to build and demo AI projects. Open to every discipline and experience level.</p>
          <p className="hero__meta">2026/27 academic year <span>·</span> Details to be announced</p>
        </div>
        <div className="hero__image image-wash">
          <img src="/images/hero-build-space.webp" alt="Students building projects together in a busy studio" />
        </div>
        <div className="hero__actions">
          <button className="button button--primary" type="button" onClick={() => moveToWaitlist()}>Join the waitlist</button>
          <a className="button button--secondary" href="#about">Explore the idea</a>
        </div>
      </section>

      <section className="manifesto" id="about" aria-labelledby="manifesto-title">
        <div className="shell manifesto__inner">
          <div>
            <h2 id="manifesto-title">AI-native.<br />Human-made.<br />Built to show<span className="full-stop">.</span></h2>
            <p>Surrey AI Hack is about practical building and real conversations. Form a team, shape an idea, build something that works, and show it to a room that gets it.</p>
            <p>Collaborate across disciplines, learn from each other, and leave with a prototype you’re proud to demo.</p>
          </div>
          <div className="manifesto__signal" aria-hidden="true">
            <span className="signal-square" />
            <span className="signal-line" />
          </div>
        </div>
      </section>

      <section className="people" id="people" aria-labelledby="people-title">
        <div className="people__image image-wash">
          <img src="/images/builder-portrait.webp" alt="A student explaining a prototype to her team" />
        </div>
        <div className="people__copy">
          <p className="eyebrow">Who it’s for</p>
          <h2 id="people-title" className="sr-only">Builders of every kind</h2>
          <ul>{people.map((person) => <li key={person}>{person}</li>)}</ul>
          <p>Whether you code daily or this is your first build, you’ll find your people here.</p>
        </div>
      </section>

      <section className="tools" id="tools" aria-labelledby="tools-title">
        <div className="tools__copy">
          <p className="eyebrow">Tools</p>
          <h2 id="tools-title">No required stack<span className="full-stop">.</span></h2>
          <p>Use whatever AI tools help you build. No vendor lock-in. No prescribed stack.</p>
          <p>Bring your favourite model, API, framework, or notebook. If it helps your idea, it belongs here.</p>
        </div>
        <div className="tools__image image-wash">
          <img src="/images/notebook-prototype.webp" alt="A notebook of interface ideas beside a laptop" />
        </div>
      </section>

      <section className="national" aria-labelledby="national-title">
        <div className="national__copy">
          <p className="eyebrow">National</p>
          <h2 id="national-title">One room, ideas<br />from across the UK<span className="full-stop">.</span></h2>
          <p>Different universities. Different disciplines. One weekend to build, learn, and ship something real.</p>
          <p>Share your work, get feedback that helps, and be part of a community that keeps building.</p>
        </div>
        <div className="national__image image-wash">
          <img src="/images/demo-room.webp" alt="Student builders presenting a prototype to an audience" />
        </div>
      </section>

      <section className="partners shell" id="partners" aria-labelledby="partners-title">
        <div>
          <h2 id="partners-title">Build the future with us<span className="full-stop">.</span></h2>
          <p>We’re inviting future partners who want to empower students, champion experimentation, and help shape what comes next.</p>
        </div>
        <button className="button button--wide" type="button" onClick={() => moveToWaitlist("partner")}>Partner with us</button>
      </section>

      <section className="waitlist" id="waitlist" aria-labelledby="waitlist-title">
        <div className="shell waitlist__inner">
          <div>
            <h2 id="waitlist-title">{intent === "partner" ? "Shape what comes next." : "Be the first to know."}</h2>
            <p>{intent === "partner" ? "Register your interest in supporting the next generation of AI builders." : "Join the waitlist for announcements, early access, and ways to get involved."}</p>
            <div className="intent-switch" aria-label="Interest type">
              <button className={intent === "participant" ? "is-active" : ""} type="button" onClick={() => { setIntent("participant"); setStatus("idle"); }}>Participant</button>
              <button className={intent === "partner" ? "is-active" : ""} type="button" onClick={() => { setIntent("partner"); setStatus("idle"); }}>Partner</button>
            </div>
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
                <button type="submit">Register interest</button>
              </div>
              {status === "error" ? <p id="email-error" className="form-note form-note--error">Enter a valid email address.</p> : <p id="email-note" className="form-note">Updates only. No noise.</p>}
            </form>
          )}
        </div>
      </section>

      <section className="faq shell" id="faq" aria-labelledby="faq-title">
        <p className="eyebrow">FAQ</p>
        <h2 id="faq-title">Still taking shape<span className="full-stop">.</span></h2>
        <p>Dates, venue and further event details will be shared when confirmed. Join the waitlist to hear first.</p>
      </section>

      <footer className="site-footer shell">
        <SocietyMark footer />
        <p>Created by Surrey Artificial Intelligence Society.<br />Surrey AI Hack is an independent student-led event.</p>
      </footer>
    </main>
  );
}
