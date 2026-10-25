import React from "react";
import Link from "next/link";
import { BrandLogo } from "../brand/BrandLogo";
import { ShieldCheck, ArrowUpRight } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-white/[0.08] bg-[#07070A] text-zinc-400 text-xs">
      <div className="container mx-auto px-4 sm:px-6 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Col 1 & 2: Brand Lockup & Purpose */}
          <div className="lg:col-span-2 space-y-4">
            <BrandLogo variant="event-lockup" size="lg" />
            <p className="text-zinc-400 text-sm leading-relaxed max-w-sm mt-3">
              A national UK student AI hackathon hosted from Surrey. Bringing hundreds of ambitious builders together to ship demonstrable AI products.
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs text-zinc-500">
              <ShieldCheck className="w-4 h-4 text-[#FF5500]" />
              <span>Pre-Launch Edition • Academic Year 2026/27</span>
            </div>
          </div>

          {/* Col 3: Hackathon Tracks & Info */}
          <div className="space-y-3">
            <div className="text-white font-bold uppercase tracking-wider text-xs">
              Explore Event
            </div>
            <ul className="space-y-2 text-zinc-400 text-sm">
              <li>
                <Link href="/#visual-showcase" className="hover:text-white transition-colors">
                  Interactive Showcase
                </Link>
              </li>
              <li>
                <Link href="/#experience" className="hover:text-white transition-colors">
                  The Weekend Experience
                </Link>
              </li>
              <li>
                <Link href="/#prizes" className="hover:text-white transition-colors">
                  Prizes & Awards
                </Link>
              </li>
              <li>
                <Link href="/#faq" className="hover:text-white transition-colors">
                  Frequently Asked Questions
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Commercial & Governance */}
          <div className="space-y-3">
            <div className="text-white font-bold uppercase tracking-wider text-xs">
              Collaborate
            </div>
            <ul className="space-y-2 text-zinc-400 text-sm">
              <li>
                <Link
                  href="/partners"
                  className="hover:text-[#FF5500] transition-colors flex items-center gap-1"
                >
                  <span>Sponsors & Industry</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-[#FF5500]" />
                </Link>
              </li>
              <li>
                <Link
                  href="/institution"
                  className="hover:text-[#FF5500] transition-colors flex items-center gap-1"
                >
                  <span>University & Funders</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-[#FF5500]" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 5: Organisation & Transparency */}
          <div className="space-y-3">
            <div className="text-white font-bold uppercase tracking-wider text-xs">
              Governing Body
            </div>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Founded and organised through <strong className="text-white font-semibold">Surrey Artificial Intelligence Society</strong>.
            </p>
            <div className="pt-2 text-xs text-zinc-500 leading-tight">
              Guildford, Surrey, UK<br />
              Flagship Annual Platform<br />
              Zero Fabricated Sponsors
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-white/[0.06] flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <div>
            © {new Date().getFullYear()} SURREY AI HACK. Founded by Surrey Artificial Intelligence Society.
          </div>
          <div className="text-center md:text-right max-w-xl text-zinc-500">
            *Pre-Launch Transparency: No unconfirmed sponsors, dates, prizes, or institutional endorsements are presented as finalized.
          </div>
        </div>
      </div>
    </footer>
  );
}
