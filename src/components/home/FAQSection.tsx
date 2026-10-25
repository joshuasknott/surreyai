"use client";

import React, { useState } from "react";
import { HelpCircle, ChevronDown, MessageSquare } from "lucide-react";
import Link from "next/link";

const FAQS = [
  {
    q: "Who can attend the hackathon?",
    a: "Any student currently enrolled at a UK university or higher-education institution! This includes undergraduates, master's students, and PhD researchers across any degree or field.",
  },
  {
    q: "Do I need to be a software developer to participate?",
    a: "Not at all. The best hackathon teams combine designers, product thinkers, domain experts, and engineers. Plus, modern AI tools make it easy for beginners to turn ideas into functional prototypes. We also provide workshops and mentors throughout the weekend.",
  },
  {
    q: "Is it really 100% free?",
    a: "Yes! Admission is completely free for all admitted hackers. Food, snacks, drinks, and workspace access are all provided thanks to our partners.",
  },
  {
    q: "Can I come on my own without a team?",
    a: "Yes, many hackers arrive solo! We host a fun team-formation mixer on Saturday morning right after the opening ceremony so you can team up with fellow builders.",
  },
  {
    q: "Where and when will it take place?",
    a: "The event is scheduled for later in the 2026/27 academic year in Guildford (preferred location: University of Surrey campus), just 34 minutes by train from London Waterloo. Specific weekend dates will be announced once venue locks are completed.",
  },
];

export function FAQSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section id="faq" className="py-20 md:py-28 relative">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-3xl mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#FF5500]/20 to-[#FF3366]/20 border border-[#FF5500]/30 text-[#FF5500] text-xs font-bold uppercase tracking-wider">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Got Questions?</span>
          </div>

          <h2 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-white uppercase leading-tight">
            Frequently Asked Questions
          </h2>

          <p className="text-base sm:text-xl text-zinc-300 font-light leading-relaxed">
            Everything you need to know about joining us for the weekend.
          </p>
        </div>

        {/* Streamlined Accordion List */}
        <div className="max-w-3xl space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={faq.q}
                className="rounded-2xl border border-white/10 bg-white/[0.03] hover:border-white/20 transition-all overflow-hidden"
              >
                <button
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full p-6 text-left flex items-center justify-between gap-4 focus:outline-none"
                >
                  <span className="text-base sm:text-lg font-bold text-white">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-zinc-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-[#FF5500]" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-6 pb-6 text-sm sm:text-base text-zinc-300 leading-relaxed border-t border-white/5 pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-10 max-w-3xl p-6 rounded-2xl bg-gradient-to-r from-white/[0.04] to-transparent border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-sm text-zinc-300 font-medium">
            <MessageSquare className="w-5 h-5 text-[#FF5500]" />
            <span>Have a specific sponsor or attendee question?</span>
          </div>
          <Link
            href="/partners"
            className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm transition-colors text-center shrink-0"
          >
            Partner Enquiries →
          </Link>
        </div>
      </div>
    </section>
  );
}
