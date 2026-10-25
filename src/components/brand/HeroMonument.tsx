"use client";

import React, { useState, useRef } from "react";
import { Sparkles, ArrowRight, Flame } from "lucide-react";
import { Hero3DCanvas } from "./Hero3DCanvas";
import confetti from "canvas-confetti";

interface HeroMonumentProps {
  onRegisterClick: () => void;
}

export function HeroMonument({ onRegisterClick }: HeroMonumentProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50 });
  const [name, setName] = useState("Alex Morgan");
  const [uni, setUni] = useState("University of Surrey");

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rX = ((y - centerY) / centerY) * -14;
    const rY = ((x - centerX) / centerX) * 14;

    setRotateX(rX);
    setRotateY(rY);
    setGlarePos({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
    });
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setGlarePos({ x: 50, y: 50 });
  };

  const handleClaim = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#FF5500", "#FF3366", "#FFAA00", "#8B5CF6", "#FFFFFF"],
      });
    } catch {
      // confetti fallback
    }
    onRegisterClick();
  };

  return (
    <div className="relative w-full space-y-12 select-none">
      {/* Top Hero Banner & Statement */}
      <div className="text-center max-w-4xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-gradient-to-r from-[#FF5500]/25 via-[#FF3366]/20 to-[#8B5CF6]/25 border border-[#FF5500]/40 text-[#FF7733] text-xs sm:text-sm font-bold shadow-xl shadow-[#FF5500]/15">
          <Flame className="w-4 h-4 text-[#FF5500] animate-bounce" />
          <span>PRE-LAUNCH • THE UK NATIONAL STUDENT AI HACKATHON • 2026/27</span>
        </div>

        <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tight text-white uppercase leading-[0.92]">
          SURREY <span className="bg-gradient-to-r from-[#FF5500] via-[#FF3366] to-[#FFAA00] bg-clip-text text-transparent">AI</span> HACK
        </h1>

        <p className="text-xl sm:text-2xl md:text-3xl text-zinc-200 font-light max-w-3xl mx-auto leading-relaxed">
          One weekend. Hundreds of UK student builders. Turn ambitious AI concepts into live, demonstrable products.
        </p>

        {/* Big CTAs */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={handleClaim}
            className="group relative inline-flex items-center gap-3 px-9 py-4 bg-gradient-to-r from-[#FF5500] via-[#FF3366] to-[#FF5500] bg-[length:200%_auto] hover:bg-right text-white font-black rounded-2xl text-base sm:text-lg transition-all duration-300 shadow-2xl shadow-[#FF5500]/40 hover:scale-105 active:scale-95"
          >
            <Sparkles className="w-5 h-5 text-amber-200" />
            <span>Register Priority Interest</span>
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </button>

          <a
            href="#visual-showcase"
            className="px-7 py-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold text-base transition-colors"
          >
            Explore Live Sandboxes ↓
          </a>
        </div>
      </div>

      {/* Centerpiece: 3D WebGL Monolith + Interactive Holographic Ticket in 3D perspective */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-4">
        {/* Three.js Interactive 3D Canvas (Columns 1-7) */}
        <div className="lg:col-span-7 rounded-3xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/15 relative overflow-hidden shadow-2xl">
          <Hero3DCanvas />
        </div>

        {/* 3D Holographic Attendee Pass (Columns 8-12) */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center perspective-[1000px]">
          <div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
              transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
              transition: "transform 0.1s ease-out",
            }}
            className="relative w-full max-w-sm p-7 rounded-3xl bg-gradient-to-b from-[#1A1A24] via-[#101017] to-[#0A0A0F] border border-white/20 shadow-[0_30px_70px_-20px_rgba(255,85,0,0.3)] overflow-hidden cursor-pointer"
          >
            {/* Holographic foil sheen */}
            <div
              className="absolute inset-0 pointer-events-none opacity-45 mix-blend-color-dodge transition-opacity"
              style={{
                background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255,100,50,0.6), rgba(150,50,255,0.4) 40%, transparent 70%)`,
              }}
            />

            {/* Top Lanyard Slot */}
            <div className="w-12 h-2 rounded-full bg-zinc-800/80 border border-white/10 mx-auto mb-6" />

            {/* Pass Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <svg viewBox="0 0 120 100" className="h-7 w-auto" fill="none">
                  <path d="M38 10L6 86H25L32 68H49L42 50H39L43.5 37L54 68H72L49 10H38Z" fill="white" />
                  <rect x="82" y="10" width="18" height="76" rx="1" fill="#FF5500" />
                </svg>
                <div className="text-left">
                  <div className="text-xs font-black text-white tracking-widest uppercase">
                    SURREY AI HACK
                  </div>
                  <div className="text-[9px] text-zinc-400 uppercase tracking-wider">
                    UK NATIONAL EDITION
                  </div>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold text-[#FF5500] bg-[#FF5500]/15 border border-[#FF5500]/30 uppercase">
                2027 PASS
              </span>
            </div>

            {/* Pass Body */}
            <div className="py-6 space-y-4 text-left">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold">
                  OFFICIAL BUILDER PASS
                </div>
                <div className="text-2xl font-black text-white tracking-tight">
                  {name}
                </div>
                <div className="text-xs text-[#FF5500] font-semibold flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF5500]" />
                  <span>{uni}</span>
                </div>
              </div>

              {/* Interactive Name Customizer */}
              <div className="space-y-2 pt-1">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Type your name on the pass..."
                  className="w-full px-3.5 py-2 bg-black/60 border border-white/15 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF5500]"
                />
                <div className="text-[10px] text-zinc-400 text-center">
                  ✦ Move cursor to reflect holographic foil
                </div>
              </div>

              {/* Barcode & Tier details */}
              <div className="p-3.5 bg-black/70 rounded-xl border border-white/10 flex items-center justify-between">
                <div>
                  <div className="text-[8px] text-zinc-400 uppercase tracking-widest">ACCESS LEVEL</div>
                  <div className="text-xs font-bold text-white uppercase tracking-wider">FLOOR & EXPO PASS</div>
                </div>
                <div className="flex items-center gap-0.5 h-6">
                  {[3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 4, 1, 3].map((w, i) => (
                    <span
                      key={i}
                      style={{ width: `${w}px` }}
                      className={`h-full ${i % 2 === 0 ? "bg-white" : "bg-transparent"}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Pass Footer */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-between text-[10px] text-zinc-400 font-medium">
              <span>GUILDFORD • SURREY</span>
              <span className="text-[#FF5500] font-bold">100% FREE ADMISSION</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
