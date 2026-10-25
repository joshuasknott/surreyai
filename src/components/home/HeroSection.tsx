"use client";

import React, { useState } from "react";
import { RegisterModal } from "../registration/RegisterModal";
import { HeroMonument } from "../brand/HeroMonument";

export function HeroSection() {
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  return (
    <section className="relative pt-6 pb-16 md:pt-14 md:pb-24 overflow-hidden border-b border-white/[0.08]">
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <HeroMonument onRegisterClick={() => setIsRegisterOpen(true)} />
      </div>

      <RegisterModal isOpen={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} />
    </section>
  );
}
