import { Header } from "@/components/dashboard/Header";
import { HeroSection } from "@/components/dashboard/HeroSection";
import { AIFeaturesGrid } from "@/components/dashboard/AIFeaturesGrid";
import { RecentConversations } from "@/components/dashboard/RecentConversations";
import { RecommendedDoctors } from "@/components/dashboard/RecommendedDoctors";
import { QuickStats } from "@/components/dashboard/QuickStats";
import { FloatingAIButton } from "@/components/dashboard/FloatingAIButton";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 md:px-6 py-8 space-y-10">
        <HeroSection />
        <AIFeaturesGrid />
        <RecentConversations />
        <RecommendedDoctors />
        <QuickStats />
      </main>

      <FloatingAIButton />
    </div>
  );
};

export default Index;
