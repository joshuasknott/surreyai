import React from "react";
import { Trophy, Award, Gift, Zap, Sparkles, ShieldCheck } from "lucide-react";

const PRIZE_CATEGORIES = [
  {
    id: "grand",
    title: "Overall Grand Champion",
    tag: "Flagship Award",
    gradient: "from-amber-500/20 via-orange-500/15 to-transparent",
    border: "border-amber-500/40",
    badge: "from-amber-500 to-orange-500",
    icon: Trophy,
    perks: [
      "Cash Prize & Official 2027 Champion Trophy",
      "Direct fast-track interviews with venture accelerators",
      "Substantial cloud compute & frontier model API credits",
      "Feature across national student AI publications",
    ],
  },
  {
    id: "technical",
    title: "Highest Technical Ambition",
    tag: "Engineering Depth",
    gradient: "from-purple-500/20 via-indigo-500/15 to-transparent",
    border: "border-purple-500/40",
    badge: "from-purple-500 to-indigo-500",
    icon: Zap,
    perks: [
      "Dedicated high-tier GPU compute credits",
      "Specialized hardware or developer kits",
      "1-on-1 mentorship with frontier AI research scientists",
    ],
  },
  {
    id: "beginner",
    title: "Best First-Time Hacker Project",
    tag: "Fresh Talent",
    gradient: "from-emerald-500/20 via-teal-500/15 to-transparent",
    border: "border-emerald-500/40",
    badge: "from-emerald-500 to-teal-500",
    icon: Sparkles,
    perks: [
      "Awarded to the strongest project built by first-time hackathon attendees",
      "Developer swag pack & hardware gadgets",
      "Mentorship follow-up to take your prototype to launch",
    ],
  },
  {
    id: "partner",
    title: "Partner & Sponsor Challenges",
    tag: "Sponsored Tracks",
    gradient: "from-rose-500/20 via-pink-500/15 to-transparent",
    border: "border-rose-500/40",
    badge: "from-rose-500 to-pink-500",
    icon: Gift,
    perks: [
      "Custom prizes set directly by our industry partners",
      "API bounties, specialized subscriptions & exclusive merch",
      "Direct recruiting intros to sponsoring engineering teams",
    ],
  },
];

export function PrizeShowcase() {
  return (
    <section id="prizes" className="py-20 md:py-28 relative">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-3xl mb-14 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-[#FF5500]/20 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <Trophy className="w-3.5 h-3.5" />
            <span>Prizes & Recognition</span>
          </div>

          <h2 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-white uppercase leading-tight">
            Win Meaningful Rewards
          </h2>

          <p className="text-base sm:text-xl text-zinc-300 font-light leading-relaxed">
            We partner with industry leaders to provide genuine value: cash, model compute credits, accelerator interviews, and career opportunities—presented with transparency.
          </p>
        </div>

        {/* Dynamic Prize Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {PRIZE_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <div
                key={cat.id}
                className={`p-8 rounded-3xl bg-gradient-to-br ${cat.gradient} border ${cat.border} flex flex-col justify-between space-y-6 shadow-xl hover:-translate-y-1 transition-all duration-300`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white shadow-md">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${cat.badge}`}>
                      {cat.tag}
                    </span>
                  </div>

                  <h3 className="text-2xl font-bold text-white">
                    {cat.title}
                  </h3>

                  <ul className="space-y-2.5 pt-2">
                    {cat.perks.map((perk, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-zinc-200">
                        <span className="text-[#FF5500] font-bold">✦</span>
                        <span>{perk}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-4 border-t border-white/10 text-xs text-zinc-400">
                  Open to all registered student teams
                </div>
              </div>
            );
          })}
        </div>

        {/* Transparency note */}
        <div className="p-5 rounded-2xl bg-black/40 border border-white/10 flex items-center gap-3 text-xs text-zinc-400">
          <ShieldCheck className="w-5 h-5 text-[#FF5500] shrink-0" />
          <span>
            <strong>Transparency Notice:</strong> Specific sponsor logos and confirmed prize purse values will be announced as partnerships finalize ahead of ticket launch. We never fabricate prize numbers.
          </span>
        </div>
      </div>
    </section>
  );
}
