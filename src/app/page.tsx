import { HeroSection } from "@/components/home/HeroSection";
import { RealVisualShowcase } from "@/components/home/RealVisualShowcase";
import { ShowcaseGrid } from "@/components/home/ShowcaseGrid";
import { WeekendExperience } from "@/components/home/WeekendExperience";
import { PrizeShowcase } from "@/components/home/PrizeShowcase";
import { CommunityWelcome } from "@/components/home/CommunityWelcome";
import { FAQSection } from "@/components/home/FAQSection";
import { FinalCTA } from "@/components/home/FinalCTA";

export default function HomePage() {
  return (
    <div className="relative z-10 flex flex-col w-full">
      <HeroSection />
      <RealVisualShowcase />
      <ShowcaseGrid />
      <WeekendExperience />
      <PrizeShowcase />
      <CommunityWelcome />
      <FAQSection />
      <FinalCTA />
    </div>
  );
}
