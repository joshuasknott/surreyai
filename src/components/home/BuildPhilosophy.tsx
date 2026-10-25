import React from "react";
import { Cpu, Terminal, Sparkles, Bot, Layers, CheckCircle2 } from "lucide-react";
import { EVENT_CONFIG } from "@/config/event";

export function BuildPhilosophy() {
  const { buildPhilosophy } = EVENT_CONFIG;

  return (
    <section id="philosophy" className="py-20 md:py-28 border-b border-white/[0.08] relative">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-3xl mb-14 space-y-3">
          <div className="flex items-center gap-2 text-[#FF5500] font-mono text-xs font-semibold tracking-widest uppercase">
            <Cpu className="w-3.5 h-3.5" />
            <span>02 // Modern Tooling Philosophy</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white uppercase">
            {buildPhilosophy.title}.
          </h2>
          <p className="text-zinc-300 text-base sm:text-lg leading-relaxed font-light">
            {buildPhilosophy.description}
          </p>
        </div>

        {/* The 5 Pillars of 2027 AI-Native Development */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {buildPhilosophy.tools.map((tool, idx) => (
            <div
              key={tool.category}
              className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-[#FF5500]/40 transition-colors flex flex-col justify-between space-y-6 group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-[#FF5500] font-semibold">
                    0{idx + 1} //
                  </span>
                  <span className="font-mono text-[10px] uppercase text-zinc-500 bg-white/5 px-2 py-0.5 rounded">
                    Unrestricted
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white group-hover:text-[#FF5500] transition-colors">
                  {tool.category}
                </h3>
                <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                  {tool.note}
                </p>
              </div>

              <div className="pt-4 border-t border-white/5 space-y-2">
                <div className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider">
                  Allowed & Encouraged:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {tool.examples.map((ex) => (
                    <span
                      key={ex}
                      className="px-2 py-1 bg-black/60 border border-white/10 rounded font-mono text-[11px] text-zinc-300"
                    >
                      {ex}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {/* Special Banner Card: The Anti-Dogma Manifesto */}
          <div className="p-6 rounded-2xl bg-[#FF5500]/10 border border-[#FF5500]/30 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[#FF5500] font-mono text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>Zero Gatekeeping</span>
              </div>
              <h3 className="text-lg font-bold text-white">
                No Artificial Vendor Constraints
              </h3>
              <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                You will never be penalized for using visual builders, AI coding agents, or off-the-shelf APIs. If an idea can be prototyped in 6 hours using automated pipelines, build it. If it requires 36 hours of low-level CUDA kernels, build it.
              </p>
            </div>

            <div className="font-mono text-xs text-[#FF5500] pt-4 border-t border-[#FF5500]/20 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>We judge the shipped reality.</span>
            </div>
          </div>
        </div>

        {/* Project Scope Showcase */}
        <div className="p-6 sm:p-8 rounded-2xl bg-white/[0.02] border border-white/10 font-mono text-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
            <span className="text-zinc-200 font-bold uppercase tracking-wider">
              Breadth of Feasible Projects
            </span>
            <span className="text-zinc-500">
              Open Track + Optional Partner Challenges
            </span>
          </div>

          <div className="flex flex-wrap gap-2 text-zinc-400">
            {[
              "Autonomous Agent Fleets",
              "Local Reasoning Models",
              "Multimodal Healthcare AI",
              "Voice-First Interfaces",
              "Spatial & Computer Vision",
              "Robotics & Sensor Teleoperation",
              "Developer Tooling & Compilers",
              "Accessibility & Assistive Tech",
              "Scientific Research Copilots",
              "Civic & Public Data Infrastructure",
              "Creative & Generative Systems",
            ].map((tag) => (
              <span
                key={tag}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-zinc-300 text-xs"
              >
                + {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
