"use client";

import React, { useState } from "react";
import { X, CheckCircle2, Sparkles, Shield, ArrowRight } from "lucide-react";
import { saveRegistration } from "@/lib/store";
import { ExperienceLevel, TeamStatus } from "@/lib/types";

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UK_UNIVERSITIES = [
  "University of Surrey",
  "Imperial College London",
  "University of Cambridge",
  "University of Oxford",
  "University College London (UCL)",
  "University of Edinburgh",
  "University of Manchester",
  "University of Southampton",
  "University of Bristol",
  "University of Warwick",
  "King's College London",
  "Other UK University",
];

export function RegisterModal({ isOpen, onClose }: RegisterModalProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [university, setUniversity] = useState(UK_UNIVERSITIES[0]);
  const [customUni, setCustomUni] = useState("");
  const [fieldOfStudy, setFieldOfStudy] = useState("Computer Science / AI");
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>("first_timer");
  const [teamStatus, setTeamStatus] = useState<TeamStatus>("individual_looking");
  const [primaryTooling, setPrimaryTooling] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const chosenUni = university === "Other UK University" && customUni ? customUni : university;

    try {
      const payload = {
        fullName,
        email,
        university: chosenUni,
        fieldOfStudy,
        studyLevel: "undergraduate" as const,
        experienceLevel,
        teamStatus,
        primaryTooling: primaryTooling || "Open to suggestions / learning",
        wantsUpdates: true,
      };

      saveRegistration(payload);

      // Attempt background API post if route is active
      try {
        await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch {
        // local persistence already completed
      }

      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setFullName("");
    setEmail("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-[#0F0F13] border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-zinc-100"
        role="dialog"
        aria-modal="true"
      >
        {/* Header accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-[#FF5500] via-[#FF7733] to-[#FF5500]" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8">
          {!submitted ? (
            <>
              <div className="flex items-center gap-2 text-[#FF5500] font-mono text-xs uppercase tracking-widest mb-2 font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Pre-Launch Interest Intake</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-2">
                Register for Priority Access
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 mb-6 leading-relaxed">
                Be the first to know when the 2026/27 weekend date, venue host, and free ticket applications go live. No spam, no corporate questionnaires.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block font-mono text-xs text-zinc-300 uppercase tracking-wider mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Maya Chen"
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF5500] transition-colors"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs text-zinc-300 uppercase tracking-wider mb-1.5">
                    University Email (.ac.uk preferred) *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. m.chen@surrey.ac.uk"
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF5500] transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-mono text-xs text-zinc-300 uppercase tracking-wider mb-1.5">
                      UK University *
                    </label>
                    <select
                      value={university}
                      onChange={(e) => setUniversity(e.target.value)}
                      className="w-full px-3 py-2.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-[#FF5500]"
                    >
                      {UK_UNIVERSITIES.map((u) => (
                        <option key={u} value={u} className="bg-[#121216] text-white">
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-mono text-xs text-zinc-300 uppercase tracking-wider mb-1.5">
                      Broad Discipline
                    </label>
                    <input
                      type="text"
                      value={fieldOfStudy}
                      onChange={(e) => setFieldOfStudy(e.target.value)}
                      placeholder="e.g. AI, Design, Business"
                      className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF5500]"
                    />
                  </div>
                </div>

                {university === "Other UK University" && (
                  <div>
                    <input
                      type="text"
                      required
                      value={customUni}
                      onChange={(e) => setCustomUni(e.target.value)}
                      placeholder="Please specify your university name"
                      className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF5500]"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-mono text-xs text-zinc-300 uppercase tracking-wider mb-1.5">
                      Experience Level
                    </label>
                    <select
                      value={experienceLevel}
                      onChange={(e) => setExperienceLevel(e.target.value as ExperienceLevel)}
                      className="w-full px-3 py-2.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-[#FF5500]"
                    >
                      <option value="first_timer" className="bg-[#121216]">First-Time Hacker</option>
                      <option value="intermediate" className="bg-[#121216]">Intermediate Builder</option>
                      <option value="experienced_builder" className="bg-[#121216]">Seasoned Hackathon Competitor</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-mono text-xs text-zinc-300 uppercase tracking-wider mb-1.5">
                      Team Status
                    </label>
                    <select
                      value={teamStatus}
                      onChange={(e) => setTeamStatus(e.target.value as TeamStatus)}
                      className="w-full px-3 py-2.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-[#FF5500]"
                    >
                      <option value="individual_looking" className="bg-[#121216]">Individual (Form team there)</option>
                      <option value="have_team" className="bg-[#121216]">Have an existing team</option>
                      <option value="solo_hacker" className="bg-[#121216]">Solo Hacker</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-xs text-zinc-300 uppercase tracking-wider mb-1.5">
                    Tools you like using (optional)
                  </label>
                  <input
                    type="text"
                    value={primaryTooling}
                    onChange={(e) => setPrimaryTooling(e.target.value)}
                    placeholder="e.g. Cursor, Python, Next.js, v0, PyTorch, Figma"
                    className="w-full px-3.5 py-2 bg-black/40 border border-white/10 rounded-lg text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF5500]"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2 text-[11px] text-zinc-400">
                  <Shield className="w-3.5 h-3.5 text-[#FF5500] shrink-0" />
                  <span>Privacy promise: We only contact you regarding this event. No promotional third-party spam.</span>
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-[#FF5500] hover:bg-[#FF6611] text-zinc-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-[#FF5500]/20 disabled:opacity-50"
                  >
                    <span>{isSubmitting ? "Registering..." : "Submit Pre-Launch Registration"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="py-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-[#FF5500]/10 border border-[#FF5500]/30 flex items-center justify-center mx-auto text-[#FF5500]">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Interest Registered</h3>
              <p className="text-sm text-zinc-300 max-w-sm mx-auto leading-relaxed">
                Thank you, <span className="text-[#FF5500] font-semibold">{fullName}</span>. You are on the priority register for <strong className="text-white">SURREY AI HACK 2027</strong>.
              </p>
              <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-xs text-zinc-400 font-mono text-left space-y-1">
                <div>// STATUS: PRIORITY INTAKE CONFIRMED</div>
                <div>// INSTITUTION: {university}</div>
                <div>// NOTIFICATION CHANNEL: {email}</div>
              </div>
              <button
                onClick={handleReset}
                className="w-full py-2.5 bg-white/10 hover:bg-white/15 text-white font-medium rounded-xl text-sm transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
