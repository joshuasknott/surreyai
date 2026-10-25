import React from "react";
import { Scale, CheckCircle2, Trophy, Flame, Layers, Presentation } from "lucide-react";
import { EVENT_CONFIG } from "@/config/event";

export function JudgingCriteria() {
  return (
    <section className="py-20 md:py-28 border-b border-white/[0.08] relative">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-3xl mb-14 space-y-3">
          <div className="flex items-center gap-2 text-[#FF5500] font-mono text-xs font-semibold tracking-widest uppercase">
            <Scale className="w-3.5 h-3.5" />
            <span>05 // Evaluation Framework</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white uppercase">
            Transparent, demo-driven judging.
          </h2>
          <p className="text-zinc-300 text-base sm:text-lg leading-relaxed font-light">
            No black-box evaluation. We judge what was built, how thoughtfully it was engineered, and how well it performs in a live environment.
          </p>
        </div>

        {/* 4 Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {EVENT_CONFIG.judgingCriteria.map((item) => (
            <div
              key={item.category}
              className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col justify-between space-y-6"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="text-[#FF5500] font-bold">{item.weight}</span>
                  <span className="text-zinc-500 uppercase">Weighting</span>
                </div>
                <h3 className="text-lg font-bold text-white">
                  {item.category}
                </h3>
                <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="pt-3 border-t border-white/5 font-mono text-[10px] text-zinc-500 uppercase">
                // CRITERIA SCORE: 1-10
              </div>
            </div>
          ))}
        </div>

        {/* Two-Tier Judging Process Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 sm:p-8 rounded-2xl bg-black/60 border border-white/10 space-y-4">
            <div className="flex items-center gap-2 font-mono text-xs text-[#FF5500] uppercase tracking-wider font-semibold">
              <Layers className="w-4 h-4" />
              <span>Round 01 // Science-Fair Floor Expo</span>
            </div>
            <h3 className="text-xl font-bold text-white">
              Every Team Demonstrates Live
            </h3>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
              Judges walk the floor and visit each team's designated table. You have 3 minutes to demonstrate your working application, walk through your system prompt or repository, and answer technical questions. No slide decks required.
            </p>
          </div>

          <div className="p-6 sm:p-8 rounded-2xl bg-black/60 border border-white/10 space-y-4">
            <div className="flex items-center gap-2 font-mono text-xs text-[#FF5500] uppercase tracking-wider font-semibold">
              <Presentation className="w-4 h-4" />
              <span>Round 02 // Main Stage Finalist Demos</span>
            </div>
            <h3 className="text-xl font-bold text-white">
              The Top Ranked Projects Pitch Live
            </h3>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
              The highest-scoring teams advance to present on the main auditorium stage in front of the entire audience, industry sponsors, academic researchers, and venture judges for grand awards.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
