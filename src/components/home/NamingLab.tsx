"use client";

import React, { useState } from "react";
import { Layers, Check, Sparkles, Tag, Shield, Cpu } from "lucide-react";
import { BrandLogo } from "../brand/BrandLogo";

const BRAND_APPLICATIONS = [
  { id: "badge", label: "Event Lanyard Badge" },
  { id: "stage", label: "Stage Screen Backdrop" },
  { id: "swag", label: "Apparel & Merch" },
];

export function NamingLab() {
  const [activeApp, setActiveApp] = useState("badge");

  return (
    <section className="py-20 md:py-28 border-b border-white/[0.08] relative">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-3xl mb-14 space-y-3">
          <div className="flex items-center gap-2 text-[#FF5500] font-mono text-xs font-semibold tracking-widest uppercase">
            <Layers className="w-3.5 h-3.5" />
            <span>06 // Sub-Brand & Design System Evolution</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white uppercase">
            Built as an enduring annual institution.
          </h2>
          <p className="text-zinc-300 text-base sm:text-lg leading-relaxed font-light">
            How the Surrey AI Society parent identity expands into an iconic national hackathon brand designed to outlive any single organizing committee.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 mb-8 font-mono text-xs">
          {BRAND_APPLICATIONS.map((app) => (
            <button
              key={app.id}
              onClick={() => setActiveApp(app.id)}
              className={`px-4 py-2 rounded-xl transition-all ${
                activeApp === app.id
                  ? "bg-[#FF5500] text-zinc-950 font-bold shadow-lg shadow-[#FF5500]/20"
                  : "bg-white/5 text-zinc-400 hover:text-white border border-white/5"
              }`}
            >
              {app.label}
            </button>
          ))}
        </div>

        {/* Dynamic Mockup Viewport */}
        <div className="p-8 sm:p-12 rounded-3xl bg-[#09090C] border border-white/10 relative overflow-hidden flex items-center justify-center min-h-[380px]">
          {/* Lanyard Badge View */}
          {activeApp === "badge" && (
            <div className="w-72 p-6 rounded-2xl bg-[#121217] border border-white/20 shadow-2xl space-y-6 text-zinc-100 font-mono relative">
              {/* Badge top punch hole */}
              <div className="w-10 h-2 rounded-full bg-zinc-800 mx-auto" />

              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <BrandLogo variant="mark-only" size="sm" />
                <span className="text-[10px] text-[#FF5500] font-bold uppercase tracking-widest">
                  PARTICIPANT // 2027
                </span>
              </div>

              <div className="space-y-1">
                <div className="text-[9px] text-zinc-500 uppercase tracking-widest">
                  ACCESS LEVEL
                </div>
                <div className="text-xl font-bold text-white tracking-tight">
                  BUILDER
                </div>
                <div className="text-xs text-[#FF5500]">
                  ALL ACCESS • FLOOR PASS
                </div>
              </div>

              <div className="p-3 bg-black/60 rounded-lg border border-white/5 text-[10px] space-y-1 text-zinc-400">
                <div>NAME: [ATTENDEE_NAME]</div>
                <div>AFFILIATION: UK_UNIVERSITY</div>
                <div>ID: SAIH-27-0482</div>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[9px] text-zinc-500">
                <span>SURREY AI HACK</span>
                <span>48HR HACKATHON</span>
              </div>
            </div>
          )}

          {/* Stage Backdrop View */}
          {activeApp === "stage" && (
            <div className="w-full max-w-2xl p-10 rounded-2xl bg-gradient-to-br from-black via-[#0D0D11] to-[#14141A] border border-white/20 shadow-2xl text-center space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF5500]/15 text-[#FF5500] font-mono text-xs border border-[#FF5500]/30 font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>GRAND FINALS // AUDITORIUM STAGE</span>
              </div>

              <div className="space-y-2">
                <h3 className="text-3xl sm:text-5xl font-extrabold tracking-tighter text-white uppercase">
                  SURREY AI HACK
                </h3>
                <p className="font-mono text-xs sm:text-sm text-zinc-400 tracking-widest uppercase">
                  THE UK NATIONAL STUDENT AI HACKATHON • 2026/27
                </p>
              </div>

              <div className="pt-4 flex items-center justify-center gap-6 font-mono text-xs text-zinc-500">
                <span>// 5 FINALIST TEAMS</span>
                <span>•</span>
                <span>// LIVE DEMOS</span>
                <span>•</span>
                <span>// AUDITORIUM MAIN STAGE</span>
              </div>
            </div>
          )}

          {/* Merch & Swag View */}
          {activeApp === "swag" && (
            <div className="w-80 p-8 rounded-2xl bg-[#111115] border border-white/15 text-center space-y-6 shadow-2xl">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-black border border-white/10 flex items-center justify-center">
                <BrandLogo variant="mark-only" size="lg" />
              </div>
              <div className="space-y-1">
                <div className="font-mono text-xs font-bold text-white tracking-widest uppercase">
                  SURREY AI HACK
                </div>
                <div className="font-mono text-[10px] text-zinc-400 uppercase">
                  Heavyweight 400GSM Builder Hoodie
                </div>
              </div>
              <div className="p-3 bg-black/40 rounded-lg text-[10px] font-mono text-zinc-500 border border-white/5">
                SLEEVE PRINT: // USE WHATEVER HELPS YOU SHIP<br />
                CHEST PRINT: MINIMAL AI MONOGRAM<br />
                BACK PRINT: INAUGURAL COHORT 2027
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
