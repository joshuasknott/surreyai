import React from "react";
import { Clock, Users, Code, Pizza, Presentation, Trophy, Sparkles } from "lucide-react";

const STEPS = [
  {
    step: "01",
    time: "Saturday 09:30",
    title: "Arrival & Team Formation",
    accent: "from-orange-500 to-amber-500",
    icon: Users,
    description: "Grab breakfast, pick up your custom badge, and meet other builders. Coming solo? We run quick, fun team matching circles right after the kickoff.",
  },
  {
    step: "02",
    time: "Saturday 11:30",
    title: "Hackathon Begins & Workshops",
    accent: "from-amber-500 to-yellow-500",
    icon: Code,
    description: "The build kicks off! Partner model credits and challenge tracks are revealed. Drop into quick hands-on tutorials on building agents, APIs, and voice interfaces.",
  },
  {
    step: "03",
    time: "Saturday 23:00",
    title: "Midnight Pizza & Deep Sprint",
    accent: "from-purple-500 to-indigo-500",
    icon: Pizza,
    description: "Hot pizza, fresh snacks, and continuous coffee. Roaming mentors circulate to help you debug errors, while quiet sleeping zones are available all night.",
  },
  {
    step: "04",
    time: "Sunday 12:30",
    title: "Science-Fair Demo Floor",
    accent: "from-teal-500 to-emerald-500",
    icon: Presentation,
    description: "Code freeze. Everyone sets up at their table. Judges, sponsors, and fellow students walk the floor trying out working demos firsthand.",
  },
  {
    step: "05",
    time: "Sunday 15:30",
    title: "Main Stage Grand Finals",
    accent: "from-rose-500 to-pink-500",
    icon: Trophy,
    description: "The top 5 finalist teams take the main auditorium stage to pitch live, followed by cash, cloud credit, and category prize announcements!",
  },
];

export function WeekendExperience() {
  return (
    <section id="experience" className="py-20 md:py-28 relative">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-3xl mb-14 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#FF5500]/20 to-[#8B5CF6]/20 border border-[#FF5500]/30 text-[#FF5500] text-xs font-bold uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5" />
            <span>The 48-Hour Journey</span>
          </div>

          <h2 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-white uppercase leading-tight">
            How The Weekend Unfolds
          </h2>

          <p className="text-base sm:text-xl text-zinc-300 font-light leading-relaxed">
            Designed for non-stop energy, genuine support, and maximum fun. Whether it’s your first hackathon or your fifth, you’ll leave with a live product.
          </p>
        </div>

        {/* Dynamic Colorful Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {STEPS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="group relative p-7 rounded-3xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/10 hover:border-white/20 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between space-y-6"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className={`w-10 h-10 rounded-2xl bg-gradient-to-r ${item.accent} flex items-center justify-center text-white font-bold text-sm shadow-md`}>
                      {item.step}
                    </span>
                    <span className="text-xs font-bold text-zinc-400 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                      {item.time}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white group-hover:text-[#FF7733] transition-colors">
                    {item.title}
                  </h3>

                  <p className="text-sm text-zinc-300 leading-relaxed font-normal">
                    {item.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-white/10 flex items-center gap-2 text-xs text-zinc-400 font-medium">
                  <Icon className="w-4 h-4 text-[#FF5500]" />
                  <span>Free food, drinks & overnight facilities included</span>
                </div>
              </div>
            );
          })}

          {/* Festival Culture Box */}
          <div className="p-7 rounded-3xl bg-gradient-to-br from-[#FF5500]/20 via-[#FF3366]/20 to-[#8B5CF6]/20 border border-[#FF5500]/40 flex flex-col justify-between space-y-6 shadow-2xl">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white">
                <Sparkles className="w-5 h-5 text-[#FF5500]" />
              </div>
              <h3 className="text-xl font-bold text-white">
                More Than Just Code
              </h3>
              <p className="text-sm text-zinc-200 leading-relaxed">
                Surrey AI Hack is a celebration of student creativity. Expect great food, late-night karaoke or gaming breaks, meeting future co-founders, and an electric demo floor.
              </p>
            </div>
            <div className="text-xs font-bold text-[#FFAA00] tracking-wide uppercase">
              ✦ 100% Free For Accepted Students
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
