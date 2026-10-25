"use client";

import React, { useState } from "react";
import { Sparkles, Terminal, CheckCircle2, ArrowRight, ShieldCheck, Mail, Building, Cpu, Users, Award } from "lucide-react";
import { savePartnerInquiry } from "@/lib/store";

const ENGAGEMENT_MODELS = [
  {
    icon: Cpu,
    title: "Challenge Ownership",
    tag: "Highest Student Engagement",
    description: "Define a specialized challenge track around your API, open model, dataset, or problem statement. Hackers compete directly on your technology stack.",
  },
  {
    icon: Terminal,
    title: "Compute & API Partnerships",
    tag: "Developer Enablement",
    description: "Equip 300–500+ builders with model credits, serverless compute, or hardware access. Ensure your tools are the ones they reach for when building products.",
  },
  {
    icon: Users,
    title: "Floor Mentorship & Workshops",
    tag: "Deep Technical Signal",
    description: "Send your senior research scientists and staff engineers to run technical deep-dive workshops and mentor teams through midnight build sprints.",
  },
  {
    icon: Award,
    title: "Talent & Early Career Access",
    tag: "Vetted Builders",
    description: "Direct interaction with the most proactive student AI developers in Britain. See how candidates think, ship, and communicate under real pressure.",
  },
];

export default function PartnersPage() {
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [workEmail, setWorkEmail] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([
    "API & Model Credits",
  ]);
  const [proposedChallenge, setProposedChallenge] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleInterest = (item: string) => {
    if (selectedInterests.includes(item)) {
      setSelectedInterests(selectedInterests.filter((i) => i !== item));
    } else {
      setSelectedInterests([...selectedInterests, item]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        companyName,
        contactName,
        workEmail,
        involvementInterests: selectedInterests,
        proposedChallengeIdea: proposedChallenge,
        message,
      };

      savePartnerInquiry(payload);

      try {
        await fetch("/api/partner", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch {
        // saved locally
      }

      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative z-10 py-16 sm:py-24">
      <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
        {/* Header */}
        <div className="space-y-4 mb-16 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF5500]/10 border border-[#FF5500]/25 text-[#FF5500] font-mono text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Sponsor & Industry Collaboration</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white uppercase leading-tight">
            Partner With The UK’s Next-Gen AI Builders.
          </h1>

          <p className="text-lg sm:text-xl text-zinc-300 font-light max-w-3xl leading-relaxed">
            SURREY AI HACK gathers 300–500+ ambitious student engineers, researchers, and creators for an intensive 48-hour build weekend. Partner with us to put your tools in their hands.
          </p>

          <div className="pt-2 flex items-center gap-2 text-xs font-mono text-zinc-400">
            <ShieldCheck className="w-4 h-4 text-[#FF5500]" />
            <span>Transparent Partnership Policy • No Fake Logos • Direct Collaboration</span>
          </div>
        </div>

        {/* Why Partner Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-16">
          {ENGAGEMENT_MODELS.map((model) => {
            const Icon = model.icon;
            return (
              <div
                key={model.title}
                className="p-8 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-[#FF5500]/40 transition-colors flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-[#FF5500]/10 border border-[#FF5500]/20 flex items-center justify-center text-[#FF5500]">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="font-mono text-[10px] text-zinc-400 uppercase tracking-wider bg-white/5 px-2.5 py-1 rounded">
                      {model.tag}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white">
                    {model.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-zinc-300 font-sans leading-relaxed">
                    {model.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-white/5 font-mono text-[10px] text-zinc-500 uppercase">
                  // BESPOKE PACKAGES AVAILABLE
                </div>
              </div>
            );
          })}
        </div>

        {/* Transparent Partnership Process */}
        <div className="p-8 sm:p-10 rounded-3xl bg-black/60 border border-white/10 mb-16 space-y-6">
          <div className="space-y-2">
            <div className="font-mono text-xs text-[#FF5500] font-semibold uppercase tracking-wider">
              Governance & Commercial Integrity
            </div>
            <h2 className="text-2xl font-bold text-white uppercase">
              Our Partnership Standard
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans text-xs sm:text-sm text-zinc-300">
            <div className="space-y-2">
              <div className="font-mono text-xs text-white font-bold uppercase">
                01 // Substance Over Badges
              </div>
              <p className="leading-relaxed text-zinc-400">
                We believe logo placement is secondary to genuine developer adoption. We prioritize challenges, API integrations, and hands-on mentor engagement that leave lasting impressions.
              </p>
            </div>
            <div className="space-y-2">
              <div className="font-mono text-xs text-white font-bold uppercase">
                02 // Institutional Compliance
              </div>
              <p className="leading-relaxed text-zinc-400">
                All sponsorship agreements are coordinated through Surrey Artificial Intelligence Society with transparent terms aligned with University and Union frameworks.
              </p>
            </div>
            <div className="space-y-2">
              <div className="font-mono text-xs text-white font-bold uppercase">
                03 // Fair Tiering
              </div>
              <p className="leading-relaxed text-zinc-400">
                Rather than publishing generic public price sheets, we design custom engagement frameworks suited for startups, cloud providers, and enterprise technology firms.
              </p>
            </div>
          </div>
        </div>

        {/* Partner Inquiry Form */}
        <div className="p-8 sm:p-12 rounded-3xl bg-[#0E0E13] border border-white/10 shadow-2xl">
          {!submitted ? (
            <div className="space-y-8">
              <div className="space-y-2">
                <div className="font-mono text-xs text-[#FF5500] font-semibold uppercase tracking-wider">
                  Direct Inquiries
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white uppercase">
                  Start A Partnership Conversation
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400 font-sans leading-relaxed">
                  Fill out this brief inquiry form to receive our full sponsorship brief and connect with the organizing team.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono text-xs text-zinc-300 uppercase tracking-wider mb-2">
                      Company / Organization *
                    </label>
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Anthropic, Google Cloud, Synthesia"
                      className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF5500]"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-xs text-zinc-300 uppercase tracking-wider mb-2">
                      Contact Name & Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="e.g. Sarah Jenkins (Developer Relations)"
                      className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF5500]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-xs text-zinc-300 uppercase tracking-wider mb-2">
                    Work Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={workEmail}
                    onChange={(e) => setWorkEmail(e.target.value)}
                    placeholder="e.g. sarah@company.com"
                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF5500]"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs text-zinc-300 uppercase tracking-wider mb-2">
                    Areas of Interest
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Setting a Partner Challenge Track",
                      "API & Model Credits Sponsorship",
                      "Sending Engineering Mentors",
                      "Hosting a Technical Workshop",
                      "Early Career & Graduate Recruiting",
                      "Hardware / Physical Compute Loan",
                    ].map((interest) => {
                      const isSelected = selectedInterests.includes(interest);
                      return (
                        <button
                          type="button"
                          key={interest}
                          onClick={() => toggleInterest(interest)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                            isSelected
                              ? "bg-[#FF5500] text-zinc-950 font-bold"
                              : "bg-white/5 text-zinc-300 border border-white/5 hover:border-white/20"
                          }`}
                        >
                          {isSelected ? "✓ " : "+ "}
                          {interest}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-xs text-zinc-300 uppercase tracking-wider mb-2">
                    Proposed Challenge or Ideas (optional)
                  </label>
                  <input
                    type="text"
                    value={proposedChallenge}
                    onChange={(e) => setProposedChallenge(e.target.value)}
                    placeholder="e.g. Best application using multimodal audio reasoning"
                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF5500]"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs text-zinc-300 uppercase tracking-wider mb-2">
                    Additional Notes or Message
                  </label>
                  <textarea
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Share any specific goals, timelines, or requirements..."
                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF5500]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-[#FF5500] hover:bg-[#FF6611] text-zinc-950 font-bold rounded-xl text-base transition-all shadow-xl shadow-[#FF5500]/25 disabled:opacity-50"
                >
                  <span>{isSubmitting ? "Submitting Inquiry..." : "Submit Partner Inquiry"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          ) : (
            <div className="py-12 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-[#FF5500]/10 border border-[#FF5500]/30 flex items-center justify-center mx-auto text-[#FF5500]">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-white uppercase">
                Inquiry Received
              </h3>
              <p className="text-sm text-zinc-300 max-w-md mx-auto leading-relaxed">
                Thank you, <span className="text-[#FF5500] font-semibold">{contactName}</span>. Our partnership team will follow up directly at <span className="text-white font-mono">{workEmail}</span> with the complete event partnership brief.
              </p>
              <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-xs text-zinc-400 font-mono text-left max-w-md mx-auto space-y-1">
                <div>// COMPANY: {companyName}</div>
                <div>// STATUS: DIRECT INTAKE RECORDED</div>
                <div>// PRIORITY: LEVEL 1 COMMERCIAL REVIEW</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
