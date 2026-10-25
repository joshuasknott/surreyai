"use client";

import React, { useState } from "react";
import Link from "next/link";
import { BrandLogo } from "../brand/BrandLogo";
import { RegisterModal } from "../registration/RegisterModal";
import { Menu, X, ArrowUpRight, Sparkles } from "lucide-react";

export function Navigation() {
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#09090D]/90 backdrop-blur-xl transition-all">
        {/* Colorful top announcement ribbon */}
        <div className="w-full bg-gradient-to-r from-[#FF5500]/15 via-[#FF3366]/15 to-[#8B5CF6]/15 border-b border-white/10 px-4 py-1.5 text-xs text-zinc-300">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF5500] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF5500]"></span>
              </span>
              <span className="font-bold text-white">Pre-Launch:</span>
              <span className="text-zinc-300">
                The UK National Student AI Hackathon • 2026/27 Academic Year
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-[#FF7733]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Priority Registration Open</span>
            </div>
          </div>
        </div>

        {/* Main Navbar */}
        <div className="container mx-auto px-4 sm:px-6 h-18 flex items-center justify-between gap-4">
          <BrandLogo variant="event-lockup" size="md" />

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold text-zinc-300">
            <Link href="/#visual-showcase" className="hover:text-white transition-colors">
              Showcase
            </Link>
            <Link href="/#experience" className="hover:text-white transition-colors">
              The Weekend
            </Link>
            <Link href="/#prizes" className="hover:text-white transition-colors">
              Prizes
            </Link>
            <Link href="/#faq" className="hover:text-white transition-colors">
              FAQ
            </Link>
            <Link
              href="/partners"
              className="text-zinc-200 hover:text-[#FF5500] transition-colors flex items-center gap-1"
            >
              <span>For Sponsors</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#FF5500]" />
            </Link>
            <Link
              href="/institution"
              className="text-zinc-400 hover:text-white transition-colors"
            >
              Institution Briefing
            </Link>
          </nav>

          {/* Action CTA */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={() => setIsRegisterOpen(true)}
              className="relative inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-[#FF5500] to-[#FF3366] hover:from-[#FF6611] hover:to-[#FF4477] rounded-xl transition-all duration-200 shadow-lg shadow-[#FF5500]/25 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Sparkles className="w-4 h-4" />
              <span>Register Interest</span>
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-white/10 bg-[#0E0E14] px-5 py-6 space-y-4 text-sm font-medium">
            <div className="flex flex-col space-y-3 text-zinc-200">
              <Link
                href="/#visual-showcase"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-white"
              >
                Project Showcase
              </Link>
              <Link
                href="/#experience"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-white"
              >
                The Weekend Experience
              </Link>
              <Link
                href="/#prizes"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-white"
              >
                Prizes & Awards
              </Link>
              <Link
                href="/#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-white"
              >
                Frequently Asked Questions
              </Link>
              <Link
                href="/partners"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 text-[#FF5500] flex items-center justify-between"
              >
                <span>Sponsor & Partner Portal</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
              <Link
                href="/institution"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 text-zinc-400"
              >
                University & Funder Briefing
              </Link>
            </div>

            <div className="pt-4 border-t border-white/10">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setIsRegisterOpen(true);
                }}
                className="w-full py-3 bg-gradient-to-r from-[#FF5500] to-[#FF3366] text-white font-bold rounded-xl text-center shadow-lg shadow-[#FF5500]/25"
              >
                Register Pre-Launch Interest
              </button>
            </div>
          </div>
        )}
      </header>

      <RegisterModal isOpen={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} />
    </>
  );
}
