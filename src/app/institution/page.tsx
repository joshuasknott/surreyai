import React from "react";
import { Building2, ShieldCheck, GraduationCap, Award, HeartHandshake, CheckCircle2, FileText, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function InstitutionPage() {
  return (
    <div className="relative z-10 py-16 sm:py-24">
      <div className="container mx-auto px-4 sm:px-6 max-w-5xl space-y-16">
        {/* Header */}
        <div className="space-y-4 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF5500]/10 border border-[#FF5500]/25 text-[#FF5500] font-mono text-xs font-semibold uppercase tracking-wider">
            <Building2 className="w-3.5 h-3.5" />
            <span>Institutional & Governance Dossier</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white uppercase leading-tight">
            Institutional Briefing: Surrey AI Hack
          </h1>

          <p className="text-lg sm:text-xl text-zinc-300 font-light max-w-3xl leading-relaxed">
            A comprehensive strategic summary prepared for University of Surrey leadership, the Surrey Institute for People-Centred AI, the Surrey Innovation & Enterprise Hub, Surrey Students' Union, and potential grant panels.
          </p>

          <div className="p-4 rounded-xl bg-black/60 border border-white/10 font-mono text-xs text-zinc-400 flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-[#FF5500] shrink-0" />
            <span>
              STATUS: Concept & Planning Stage (Academic Year 2026/27). All prospective internal and external partnerships subject to formal institutional confirmation.
            </span>
          </div>
        </div>

        {/* 4 Pillars of Institutional Value */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-[#FF5500]/10 border border-[#FF5500]/20 flex items-center justify-center text-[#FF5500]">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-bold text-white uppercase">
              01 // National Reputation & Leadership
            </h3>
            <p className="text-xs sm:text-sm text-zinc-300 font-sans leading-relaxed">
              Establishes the University of Surrey as the premier destination for national student AI innovation. Drawing participants from Oxford, Cambridge, Imperial, UCL, Edinburgh, and across Britain firmly positions Surrey as an active epicenter of next-generation technical talent.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-[#FF5500]/10 border border-[#FF5500]/20 flex items-center justify-center text-[#FF5500]">
              <GraduationCap className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-bold text-white uppercase">
              02 // Cross-Faculty Experiential Learning
            </h3>
            <p className="text-xs sm:text-sm text-zinc-300 font-sans leading-relaxed">
              Hackathons are intense, high-impact experiential learning incubators. Students practice product formulation, rapid software deployment, multidisciplinary teamwork, and live presentation—skills directly requested by frontier employers.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-[#FF5500]/10 border border-[#FF5500]/20 flex items-center justify-center text-[#FF5500]">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-bold text-white uppercase">
              03 // People-Centred AI Alignment
            </h3>
            <p className="text-xs sm:text-sm text-zinc-300 font-sans leading-relaxed">
              Projects are steered toward solving real human problems—healthcare, accessibility, sustainability, and productivity. This reinforces the core ethos of the Surrey Institute for People-Centred AI, demonstrating ethical, human-centric innovation in action.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-[#FF5500]/10 border border-[#FF5500]/20 flex items-center justify-center text-[#FF5500]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-bold text-white uppercase">
              04 // Operational Safety & Compliance
            </h3>
            <p className="text-xs sm:text-sm text-zinc-300 font-sans leading-relaxed">
              Built in strict adherence with Surrey Students' Union event governance, risk assessment frameworks, and safeguarding standards. Features dedicated quiet rest rooms, continuous first-aid and marshal presence, and clear codes of conduct.
            </p>
          </div>
        </div>

        {/* Stakeholder Alignment Map */}
        <div className="p-8 sm:p-10 rounded-3xl bg-black/60 border border-white/10 space-y-8">
          <div className="space-y-2">
            <div className="font-mono text-xs text-[#FF5500] font-semibold uppercase tracking-wider">
              Strategic Ecosystem
            </div>
            <h2 className="text-2xl font-bold text-white uppercase">
              Institutional Ecosystem Integration
            </h2>
          </div>

          <div className="space-y-4">
            <div className="p-5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
              <div className="flex items-center justify-between font-mono text-xs">
                <strong className="text-white">University of Surrey (Host Facility)</strong>
                <span className="text-[#FF5500]">Preferred Venue Host</span>
              </div>
              <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                Hosting on the Stag Hill campus utilizes existing modern lecture theatres, breakout rooms, and high-speed campus infrastructure to deliver a safe, world-class experience without commercial venue overheads.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
              <div className="flex items-center justify-between font-mono text-xs">
                <strong className="text-white">Surrey Institute for People-Centred AI</strong>
                <span className="text-zinc-400">Academic & Research Alignment</span>
              </div>
              <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                Opportunity for Surrey faculty and PhD researchers to set academic challenge themes, mentor student teams, and judge finalist presentations on scientific merit and societal impact.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
              <div className="flex items-center justify-between font-mono text-xs">
                <strong className="text-white">Surrey Innovation & Enterprise Hub</strong>
                <span className="text-zinc-400">Industry & Incubation Pipeline</span>
              </div>
              <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                High-potential student prototypes developed during the weekend can feed directly into University incubation programs, pre-accelerators, and commercial venture development pathways.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
              <div className="flex items-center justify-between font-mono text-xs">
                <strong className="text-white">Forever Surrey Fund & Society Backing</strong>
                <span className="text-zinc-400">Seed Funding & Longevity</span>
              </div>
              <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                Potential internal grant applications (e.g. up to £5,000) will act as foundational seed capital to unlock matched external technology sponsorships, creating an annual self-sustaining platform.
              </p>
            </div>
          </div>
        </div>

        {/* Governance & Long-Term Continuity */}
        <div className="p-8 sm:p-10 rounded-3xl bg-[#0F0F13] border border-white/10 space-y-6">
          <div className="space-y-2">
            <div className="font-mono text-xs text-[#FF5500] font-semibold uppercase tracking-wider">
              Institutional Memory
            </div>
            <h2 className="text-2xl font-bold text-white uppercase">
              Designed For Multi-Year Continuity
            </h2>
            <p className="text-xs sm:text-sm text-zinc-300 font-sans leading-relaxed">
              This platform was deliberately architected to survive annual society leadership handovers. All documentation, project archives, partner relationships, and operational playbooks are preserved centrally so subsequent student committees can seamlessly inherit and scale the event.
            </p>
          </div>

          <div className="pt-4 border-t border-white/10 flex flex-wrap gap-4 font-mono text-xs">
            <Link
              href="/partners"
              className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white flex items-center gap-2 transition-colors"
            >
              <span>View Commercial Framework</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/"
              className="px-5 py-3 rounded-xl text-zinc-400 hover:text-white flex items-center gap-2 transition-colors"
            >
              <span>Return to Master Homepage</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
