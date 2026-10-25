import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/ui/Navigation";
import { Footer } from "@/components/ui/Footer";
import { ProceduralGrid } from "@/components/brand/ProceduralGrid";
import { EVENT_CONFIG } from "@/config/event";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: `${EVENT_CONFIG.name} — ${EVENT_CONFIG.tagline}`,
  description: `${EVENT_CONFIG.subTagline} An initiative founded by ${EVENT_CONFIG.organizer.name} for academic year ${EVENT_CONFIG.academicYear}.`,
  keywords: [
    "AI Hackathon",
    "Surrey AI Hack",
    "Surrey Artificial Intelligence Society",
    "UK Student AI Hackathon",
    "Guildford AI",
    "Machine Learning Hackathon",
    "Student Developers UK",
  ],
  authors: [{ name: EVENT_CONFIG.organizer.name }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-screen flex flex-col bg-[#0B0B0D] text-zinc-100 selection:bg-[#FF5500] selection:text-black">
        <ProceduralGrid />
        <Navigation />
        <main className="flex-1 flex flex-col">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
