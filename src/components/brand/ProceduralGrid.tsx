"use client";

import React, { useEffect, useRef } from "react";

export function ProceduralGrid() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    // Subtle floating glowing color orbs
    const orbs = [
      { x: width * 0.2, y: height * 0.25, vx: 0.3, vy: 0.2, r: 280, color: "rgba(255, 85, 0, 0.12)" },
      { x: width * 0.8, y: height * 0.3, vx: -0.25, vy: 0.35, r: 320, color: "rgba(255, 51, 102, 0.09)" },
      { x: width * 0.5, y: height * 0.7, vx: 0.2, vy: -0.2, r: 360, color: "rgba(139, 92, 246, 0.08)" },
      { x: width * 0.3, y: height * 0.85, vx: -0.2, vy: -0.15, r: 300, color: "rgba(255, 170, 0, 0.07)" },
    ];

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Render glowing ambient radial orbs
      orbs.forEach((orb) => {
        orb.x += orb.vx;
        orb.y += orb.vy;

        if (orb.x < -orb.r) orb.x = width + orb.r;
        if (orb.x > width + orb.r) orb.x = -orb.r;
        if (orb.y < -orb.r) orb.y = height + orb.r;
        if (orb.y > height + orb.r) orb.y = -orb.r;

        const grad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r);
        grad.addColorStop(0, orb.color);
        grad.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      {/* Top radiant colorful glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-gradient-to-b from-[#FF5500]/15 via-[#FF3366]/10 to-transparent blur-3xl pointer-events-none" />
      {/* Subtle colorful side lighting */}
      <div className="absolute top-1/3 -left-48 w-96 h-96 bg-[#8B5CF6]/15 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute top-1/2 -right-48 w-96 h-96 bg-[#FF5500]/15 blur-3xl rounded-full pointer-events-none" />
    </div>
  );
}
