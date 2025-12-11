import { Bot, Users, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export const HeroSection = () => {
  return (
    <section className="relative overflow-hidden rounded-2xl md:rounded-3xl ai-gradient p-6 sm:p-8 md:p-12 lg:p-16">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-white blur-3xl" />
        <div className="absolute bottom-10 right-10 w-48 h-48 rounded-full bg-white blur-3xl" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 rounded-full bg-white blur-3xl -translate-x-1/2 -translate-y-1/2" />
      </div>

      <div className="relative z-10 flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
        {/* Text content */}
        <div className="flex-1 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm text-white/90 text-sm font-medium mb-6 animate-fade-in">
            <Sparkles className="w-4 h-4" />
            AI-Powered Healthcare
          </div>
          
          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-3 sm:mb-4 leading-tight animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            Your Personal AI{" "}
            <span className="block">Health Assistant</span>
          </h1>
          
          <p className="text-white/80 text-base sm:text-lg md:text-xl max-w-xl mb-6 sm:mb-8 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            Get instant medical advice, symptom analysis, and doctor recommendations powered by advanced AI
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start animate-fade-in-up w-full sm:w-auto" style={{ animationDelay: "0.3s" }}>
            <Link to="/ai-assistant" className="w-full sm:w-auto">
              <Button size="xl" className="w-full sm:w-auto bg-white text-accent hover:bg-white/90 shadow-xl pulse-glow font-semibold">
                <Bot className="w-5 h-5" />
                Start AI Consultation
              </Button>
            </Link>
            <Link to="/doctor-discovery" className="w-full sm:w-auto">
              <Button size="xl" variant="heroSecondary" className="w-full sm:w-auto bg-white/10 border-white/30 text-white hover:bg-white/20">
                <Users className="w-5 h-5" />
                Browse Doctors
              </Button>
            </Link>
          </div>
        </div>

        {/* AI Bot illustration - Hidden on mobile for better UX */}
        <div className="hidden lg:flex flex-shrink-0 animate-fade-in" style={{ animationDelay: "0.4s" }}>
          <div className="relative">
            <div className="w-72 h-72 xl:w-80 xl:h-80 rounded-3xl bg-white/10 backdrop-blur-sm border border-white/20 p-6 float">
              <div className="w-full h-full rounded-2xl bg-white/95 flex flex-col items-center justify-center gap-4 shadow-2xl">
                <div className="w-20 h-20 rounded-full ai-gradient flex items-center justify-center pulse-glow">
                  <Bot className="w-10 h-10 text-white" />
                </div>
                <div className="text-center px-4">
                  <p className="font-display font-semibold text-foreground mb-1">AI Health Assistant</p>
                  <p className="text-sm text-muted-foreground">Ready to help 24/7</p>
                </div>
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  <span className="w-2 h-2 rounded-full bg-success animate-pulse" style={{ animationDelay: "0.2s" }} />
                  <span className="w-2 h-2 rounded-full bg-success animate-pulse" style={{ animationDelay: "0.4s" }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
