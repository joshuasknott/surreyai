"use client";

import React, { useState } from "react";
import { Users, CheckCircle2, Heart, Sparkles, Flame, Shield } from "lucide-react";

export function CommunityWelcome() {
  const [selectedFeeling, setSelectedFeeling] = useState<number>(0);

  const FEELINGS = [
    {
      emoji: "🌱",
      title: "This is my first hackathon",
      response: "You are totally welcome! Modern AI and visual tools mean you don't need years of coding experience. We host beginner-friendly workshops, provide roaming mentors, and match you with a team.",
    },
    {
      emoji: "🤝",
      title: "I'm coming alone without a team",
      response: "Over half of our attendees sign up solo! We run a dedicated, friendly team-matching mixer right after the opening ceremony so you can team up with people who complement your skills.",
    },
    {
      emoji: "🚀",
      title: "I want serious technical competition",
      response: "You'll be in great company. Builders from Oxford, Cambridge, Imperial, Edinburgh, and across Britain are bringing their sharpest ideas to compete for the main stage grand finals.",
    },
  ];

  return (
    <section className="py-16 md:py-24 relative">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-[#121218] via-[#161622] to-[#121218] border border-white/15 shadow-2xl relative overflow-hidden">
          {/* Top glow */}
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-gradient-to-r from-[#FF5500]/20 to-[#8B5CF6]/20 blur-3xl rounded-full pointer-events-none" />

          <div className="relative z-10 max-w-3xl mx-auto text-center space-y-4 mb-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 text-white text-xs font-semibold">
              <Heart className="w-3.5 h-3.5 text-[#FF3366] fill-[#FF3366]" />
              <span>Everyone Builds Here</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-white uppercase tracking-tight">
              All UK Students & Disciplines Welcome
            </h2>

            <p className="text-sm sm:text-base text-zinc-300 font-normal leading-relaxed">
              Whether you study Computer Science, Graphic Design, Economics, Philosophy, or Medicine—great AI products need multidisciplinary teams.
            </p>
          </div>

          {/* Interactive Feeling Chips */}
          <div className="relative z-10 max-w-3xl mx-auto space-y-4">
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              {FEELINGS.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedFeeling(idx)}
                  className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                    selectedFeeling === idx
                      ? "bg-white text-zinc-950 shadow-lg scale-105"
                      : "bg-white/5 text-zinc-300 hover:bg-white/10 border border-white/10"
                  }`}
                >
                  <span>{item.emoji}</span>
                  <span>{item.title}</span>
                </button>
              ))}
            </div>

            <div className="p-6 rounded-2xl bg-black/50 border border-white/10 text-center max-w-2xl mx-auto space-y-2">
              <p className="text-sm sm:text-base text-zinc-200 font-medium leading-relaxed">
                "{FEELINGS[selectedFeeling].response}"
              </p>
            </div>
          </div>

          {/* Quick bullet points */}
          <div className="relative z-10 mt-8 pt-6 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center text-xs text-zinc-400 font-medium">
            <div>✓ Enrolled at any UK University</div>
            <div>✓ Teams of 1 to 4 People</div>
            <div>✓ 100% Free Entry & Meals</div>
          </div>
        </div>
      </div>
    </section>
  );
}
