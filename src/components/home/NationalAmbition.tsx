import React from "react";
import { Compass, Train, Award, Users, CheckCircle } from "lucide-react";

const REGIONAL_HUBS = [
  { region: "London & South East", universities: ["Surrey (Host)", "Imperial", "UCL", "King's", "Queen Mary"] },
  { region: "Oxbridge Corridor", universities: ["Cambridge", "Oxford"] },
  { region: "Midlands & West", universities: ["Warwick", "Birmingham", "Nottingham", "Bristol", "Bath"] },
  { region: "North & Scotland", universities: ["Manchester", "Edinburgh", "Leeds", "Glasgow", "Sheffield", "Durham"] },
  { region: "Wales & Northern Ireland", universities: ["Cardiff", "Swansea", "Queen's Belfast"] },
];

export function NationalAmbition() {
  return (
    <section id="overview" className="py-20 md:py-28 border-b border-white/[0.08] relative">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-3xl mb-14 space-y-3">
          <div className="flex items-center gap-2 text-[#FF5500] font-mono text-xs font-semibold tracking-widest uppercase">
            <Compass className="w-3.5 h-3.5" />
            <span>01 // Geographic & Institutional Scope</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white uppercase">
            Not a local society meetup. A national stage.
          </h2>
          <p className="text-zinc-300 text-base sm:text-lg leading-relaxed font-light">
            Founded through Surrey AI Society, but architected from day one as a flagship British AI hackathon. We are assembling 300–500+ builders from across the UK higher-education network.
          </p>
        </div>

        {/* Contrast Grid: What this is vs what this isn't */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className="p-6 sm:p-8 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
            <div className="font-mono text-xs text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-zinc-600" />
              <span>What We Are Not</span>
            </div>
            <ul className="space-y-3 font-sans text-sm text-zinc-400">
              <li className="flex items-start gap-3">
                <span className="text-zinc-600 font-mono text-xs mt-0.5">✕</span>
                <span>A 50-person classroom club hackathon restricted to Surrey undergraduates.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-zinc-600 font-mono text-xs mt-0.5">✕</span>
                <span>An essay competition, abstract policy debate, or pitch-deck workshop.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-zinc-600 font-mono text-xs mt-0.5">✕</span>
                <span>A single-sponsor recruitment day disguised as a student hackathon.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-zinc-600 font-mono text-xs mt-0.5">✕</span>
                <span>A one-off disposable landing page that disappears after the current academic year.</span>
              </li>
            </ul>
          </div>

          <div className="p-6 sm:p-8 rounded-2xl bg-[#FF5500]/[0.03] border border-[#FF5500]/20 space-y-4">
            <div className="font-mono text-xs text-[#FF5500] uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#FF5500]" />
              <span>What We Are Building</span>
            </div>
            <ul className="space-y-3 font-sans text-sm text-zinc-200">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-[#FF5500] shrink-0 mt-0.5" />
                <span><strong className="text-white">National UK Scale:</strong> Welcoming student developers, designers, and researchers from across Britain.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-[#FF5500] shrink-0 mt-0.5" />
                <span><strong className="text-white">Relentless Shipping Culture:</strong> 100% focused on demonstrable, functional AI software and hardware.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-[#FF5500] shrink-0 mt-0.5" />
                <span><strong className="text-white">Meaningful Partner Challenges:</strong> High-tier compute, real frontier APIs, and direct engineering mentorship.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-[#FF5500] shrink-0 mt-0.5" />
                <span><strong className="text-white">A Standalone Institution:</strong> An enduring annual brand, open-source project archive, and national benchmark.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* UK University Network Mapping */}
        <div className="p-6 sm:p-8 rounded-2xl bg-black/60 border border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/10">
            <div>
              <div className="font-mono text-xs text-[#FF5500] uppercase tracking-wider font-semibold">
                Targeted Outreach Grid
              </div>
              <h3 className="text-lg font-bold text-white uppercase mt-1">
                UK Higher-Education Representation
              </h3>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs text-zinc-400 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
              <Train className="w-3.5 h-3.5 text-[#FF5500]" />
              <span>Guildford Station: 34 mins from London Waterloo</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {REGIONAL_HUBS.map((hub) => (
              <div key={hub.region} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                <div className="font-mono text-[11px] text-zinc-400 font-bold uppercase tracking-wider">
                  {hub.region}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {hub.universities.map((uni) => (
                    <span
                      key={uni}
                      className={`text-[11px] px-2 py-1 rounded font-mono ${
                        uni.includes("Host")
                          ? "bg-[#FF5500]/20 text-[#FF5500] font-bold border border-[#FF5500]/30"
                          : "bg-white/5 text-zinc-300 border border-white/5"
                      }`}
                    >
                      {uni}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500 font-mono">
            <span>// OPEN TO ENROLLED UNDERGRADUATES, MASTERS & PHD RESEARCHERS NATIONWIDE</span>
            <span>// FREE ATTENDANCE FOR ALL CONFIRMED PARTICIPANTS</span>
          </div>
        </div>
      </div>
    </section>
  );
}
