"use client";

import React, { useState } from "react";
import Link from "next/link";
import { RegisterModal } from "../registration/RegisterModal";
import { ArrowRight, Sparkles, Flame } from "lucide-react";

export function FinalCTA() {
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      {/* Radiant Background Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-r from-[#FF5500]/25 via-[#FF3366]/20 to-[#8B5CF6]/20 blur-[130px] rounded-full pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10 text-center max-w-4xl space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-white text-xs font-bold uppercase tracking-wider shadow-lg">
          <Flame className="w-4 h-4 text-[#FF5500]" />
          <span>Priority Access Open</span>
        </div>

        <h2 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white uppercase leading-tight">
          Ready To Build<br />
          <span className="bg-gradient-to-r from-[#FF5500] via-[#FF3366] to-[#FFAA00] bg-clip-text text-transparent">
            Something Real?
          </span>
        </h2>

        <p className="text-zinc-300 text-base sm:text-xl max-w-2xl mx-auto font-normal leading-relaxed">
          Join hundreds of UK student developers, designers, and innovators for an electric weekend of AI creation in Guildford. Pre-launch priority registration is open now.
        </p>

        <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={() => setIsRegisterOpen(true)}
            className="group relative inline-flex items-center gap-2.5 px-9 py-4 bg-gradient-to-r from-[#FF5500] via-[#FF3366] to-[#FF5500] text-white font-bold rounded-2xl text-base sm:text-lg transition-all duration-300 shadow-2xl shadow-[#FF5500]/40 hover:scale-105 active:scale-95"
          >
            <Sparkles className="w-5 h-5" />
            <span>Register Pre-Launch Interest</span>
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </button>

          <Link
            href="/partners"
            className="inline-flex items-center gap-2 px-7 py-4 bg-white/10 hover:bg-white/15 text-white font-semibold text-base rounded-2xl border border-white/10 transition-colors"
          >
            <span>Partner With Us →</span>
          </Link>
        </div>

        <div className="pt-8 text-zinc-500 text-xs font-medium">
          Surrey AI Hack 2027 • Founded by Surrey Artificial Intelligence Society • 100% Free Entry
        </div>
      </div>

      <RegisterModal isOpen={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} />
    </section>
  );
}
