"use client";

import React, { useState } from "react";
import { Sparkles, Bot, Mic, Cpu, Music, Navigation2, Code2, ArrowUpRight } from "lucide-react";

const PROJECTS = [
  {
    id: "agent",
    category: "agents",
    title: "Autonomous Literature Synthesizer",
    tag: "Agentic AI",
    badgeColor: "from-orange-500 to-rose-500",
    icon: Bot,
    description: "A self-directed multi-agent loop that parses arXiv papers, runs verification tests against source code, and drafts reproducible executive summaries.",
    tech: ["Claude 3.7", "Python", "LangGraph", "FastAPI"],
    impact: "Saves biomedical researchers 15+ hours per literature review.",
  },
  {
    id: "voice",
    category: "voice",
    title: "Real-Time Emergency Voice Copilot",
    tag: "Voice & Multimodal",
    badgeColor: "from-amber-500 to-orange-500",
    icon: Mic,
    description: "Sub-300ms bidirectional speech interface designed for paramedics to log patient vital metrics and retrieve treatment protocols hands-free.",
    tech: ["Gemini 2.5 Flash", "WebRTC", "Next.js", "Tailwind"],
    impact: "Hands-free operations in urgent clinical settings.",
  },
  {
    id: "robotics",
    category: "hardware",
    title: "Edge Spatial Navigation Bot",
    tag: "Robotics & Hardware",
    badgeColor: "from-purple-500 to-indigo-500",
    icon: Cpu,
    description: "Autonomous micro-rover utilizing on-device computer vision and depth sensors for indoor search-and-rescue mapping without internet connectivity.",
    tech: ["Jetson Nano", "ROS2", "YOLOv11", "PyTorch"],
    impact: "Runs fully offline in disaster zones.",
  },
  {
    id: "creative",
    category: "creative",
    title: "Harmonic Neural Instrument",
    tag: "Creative Technology",
    badgeColor: "from-pink-500 to-rose-600",
    icon: Music,
    description: "Transforms vocal hums and hand gestures captured on camera into multi-layered ambient soundscapes in real-time.",
    tech: ["MediaPipe", "Web Audio API", "MusicLM", "Canvas"],
    impact: "Democratizes intuitive music creation for everyone.",
  },
  {
    id: "civic",
    category: "agents",
    title: "Civic Transit Accessibility Radar",
    tag: "Public Infrastructure",
    badgeColor: "from-emerald-500 to-teal-500",
    icon: Navigation2,
    description: "Aggregates live UK transport APIs with accessibility status to route wheelchair users around broken lifts and crowded stations dynamically.",
    tech: ["Open Transport API", "Mapbox", "TypeScript"],
    impact: "Reduces transit stress for thousands of daily travelers.",
  },
  {
    id: "nocode",
    category: "lowcode",
    title: "Full-Stack Ops Pipeline in 24 Hours",
    tag: "Low-Code & Automation",
    badgeColor: "from-blue-500 to-cyan-500",
    icon: Code2,
    description: "Built without hand-writing backend servers—orchestrating AI webhooks, vector databases, and responsive UI to automate student society budgets.",
    tech: ["v0", "Supabase Studio", "n8n", "OpenAI"],
    impact: "Proof that great product design beats code complexity.",
  },
];

const CATEGORIES = [
  { id: "all", label: "All Inspirations" },
  { id: "agents", label: "Autonomous Agents" },
  { id: "voice", label: "Voice & Multimodal" },
  { id: "hardware", label: "Robotics & Edge" },
  { id: "creative", label: "Creative & Design" },
  { id: "lowcode", label: "Low-Code / No-Code" },
];

export function ShowcaseGrid() {
  const [activeCategory, setActiveCategory] = useState("all");

  const filtered = activeCategory === "all"
    ? PROJECTS
    : PROJECTS.filter((p) => p.category === activeCategory);

  return (
    <section id="showcase" className="py-20 md:py-28 relative">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Section Heading */}
        <div className="max-w-3xl mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#FF5500]/20 to-[#FF3366]/20 border border-[#FF5500]/30 text-[#FF5500] text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Project Inspiration Gallery</span>
          </div>

          <h2 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-white uppercase leading-tight">
            What Will You Build?
          </h2>

          <p className="text-base sm:text-xl text-zinc-300 font-light leading-relaxed">
            No pitch-deck fluff. At Surrey AI Hack, we judge the working reality. Use AI agents, multimodal APIs, robotics hardware, or visual builders—use whatever helps you ship.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 mb-10">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                activeCategory === cat.id
                  ? "bg-gradient-to-r from-[#FF5500] to-[#FF3366] text-white shadow-lg shadow-[#FF5500]/25 scale-105"
                  : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 border border-white/5"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Dynamic Project Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="group relative p-7 rounded-3xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/10 hover:border-white/25 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl flex flex-col justify-between space-y-6"
              >
                {/* Subtle top card glow */}
                <div className={`absolute top-0 left-8 right-8 h-1 bg-gradient-to-r ${item.badgeColor} rounded-full opacity-60 group-hover:opacity-100 transition-opacity`} />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                      <Icon className="w-6 h-6 text-[#FF5500]" />
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${item.badgeColor} shadow-sm`}>
                      {item.tag}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white group-hover:text-[#FF7733] transition-colors leading-snug">
                    {item.title}
                  </h3>

                  <p className="text-sm text-zinc-300 leading-relaxed font-normal">
                    {item.description}
                  </p>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/10">
                  <div className="flex flex-wrap gap-1.5">
                    {item.tech.map((t) => (
                      <span
                        key={t}
                        className="px-2.5 py-1 rounded-lg bg-black/50 border border-white/10 text-zinc-300 text-xs font-medium"
                      >
                        {t}
                      </span>
                    ))}
                  </div>

                  <div className="text-xs text-zinc-400 italic">
                    ✦ {item.impact}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
