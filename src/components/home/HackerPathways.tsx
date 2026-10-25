import React from "react";
import { Users, HeartHandshake, Zap, Trophy, ShieldAlert, Sparkles, BookOpen, Flame, Award } from "lucide-react";

export function HackerPathways() {
  return (
    <section id="pathways" className="py-20 md:py-28 border-b border-white/[0.08] relative">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-3xl mb-14 space-y-3">
          <div className="flex items-center gap-2 text-[#FF5500] font-mono text-xs font-semibold tracking-widest uppercase">
            <Users className="w-3.5 h-3.5" />
            <span>03 // Dual Attendee Architecture</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white uppercase">
            Designed for two very different builders.
          </h2>
          <p className="text-zinc-300 text-base sm:text-lg leading-relaxed font-light">
            A great national hackathon does not force a choice between elite technical competition and genuine beginner accessibility. We engineered dedicated pathways for both.
          </p>
        </div>

        {/* Dual Pathways Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Pathway A: The First-Time Hacker */}
          <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/10 relative overflow-hidden flex flex-col justify-between space-y-8">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 font-mono text-xs font-bold text-[#FF5500] uppercase tracking-wider bg-[#FF5500]/10 px-3 py-1 rounded-full border border-[#FF5500]/20">
                  <HeartHandshake className="w-3.5 h-3.5" />
                  <span>Pathway 01 // First-Time Hackers</span>
                </span>
                <span className="font-mono text-xs text-zinc-500">Any UK Discipline</span>
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-white">
                  "I've never been to a hackathon. Can I actually contribute?"
                </h3>
                <p className="text-sm text-zinc-300 font-sans leading-relaxed">
                  Yes. Modern AI tools mean you do not need 5 years of software engineering to ship an exceptional, useful product. Ideas, user empathy, and fast experimentation matter more than ever.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div className="font-mono text-xs text-zinc-400 uppercase tracking-wider">
                  How we support you:
                </div>
                <div className="space-y-2.5 font-sans text-xs text-zinc-300">
                  <div className="flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-[#FF5500] shrink-0 mt-0.5" />
                    <span><strong className="text-white">Structured Team Matching:</strong> Arrive solo? We run an active team-formation session right after the opening ceremony to connect you with complimentary skills.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <BookOpen className="w-4 h-4 text-[#FF5500] shrink-0 mt-0.5" />
                    <span><strong className="text-white">Beginner-Friendly AI Workshops:</strong> Live tutorials on building with AI agents, orchestrating model APIs, and deploying full-stack apps in minutes.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Users className="w-4 h-4 text-[#FF5500] shrink-0 mt-0.5" />
                    <span><strong className="text-white">Roaming Mentors:</strong> Industry engineers and Surrey AI researchers walk the floor 24/7 to unstick your code and debug deployment roadblocks.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-white/5 font-mono text-xs text-zinc-400">
              // NO ESSAY FORM • FIRST-COME-FIRST-SERVED REGISTRATION
            </div>
          </div>

          {/* Pathway B: Seasoned & Hardcore Competitors */}
          <div className="p-8 rounded-2xl bg-black/60 border border-white/15 relative overflow-hidden flex flex-col justify-between space-y-8">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 font-mono text-xs font-bold text-white uppercase tracking-wider bg-white/10 px-3 py-1 rounded-full border border-white/20">
                  <Flame className="w-3.5 h-3.5 text-[#FF5500]" />
                  <span>Pathway 02 // Seasoned Competitors</span>
                </span>
                <span className="font-mono text-xs text-zinc-500">High Stakes & Scale</span>
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-white">
                  "I want serious technical competition and ambitious projects."
                </h3>
                <p className="text-sm text-zinc-300 font-sans leading-relaxed">
                  We built this event to be worthy of travelling across the country for. You will compete alongside the sharpest student builders from Imperial, Cambridge, Oxford, Edinburgh, and across Britain.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div className="font-mono text-xs text-zinc-400 uppercase tracking-wider">
                  What you will find here:
                </div>
                <div className="space-y-2.5 font-sans text-xs text-zinc-300">
                  <div className="flex items-start gap-2.5">
                    <Trophy className="w-4 h-4 text-[#FF5500] shrink-0 mt-0.5" />
                    <span><strong className="text-white">Main-Stage Finalist Demos:</strong> The top projects present live to our panel of researchers, founders, and industry leaders with professional stage production.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Zap className="w-4 h-4 text-[#FF5500] shrink-0 mt-0.5" />
                    <span><strong className="text-white">Hard Partner Challenges:</strong> Direct access to frontier model credits, specialized robotics hardware, and proprietary benchmark datasets.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Award className="w-4 h-4 text-[#FF5500] shrink-0 mt-0.5" />
                    <span><strong className="text-white">Legitimate Recognition:</strong> Winning projects receive direct accelerator interviews, high-tier compute credits, and national community recognition.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-white/5 font-mono text-xs text-zinc-400">
              // HIGH PRODUCTION VALUE • EXPO FLOOR RIGOR
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
