import { Activity, UserSearch, MessageCircle, Pill, ArrowRight, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";

const features = [
  {
    icon: Activity,
    title: "Symptom Analysis",
    description: "Describe your symptoms and get instant AI-powered health insights and recommendations",
    color: "from-primary to-primary/80",
    link: "/ai-assistant",
  },
  {
    icon: UserSearch,
    title: "Smart Doctor Matching",
    description: "AI finds the perfect specialist based on your symptoms, location, and preferences",
    color: "from-primary/90 to-primary/70",
    link: "/doctor-discovery",
  },
  {
    icon: MessageCircle,
    title: "24/7 Health Q&A",
    description: "Ask any health question anytime - our AI never sleeps and is always ready to help",
    color: "from-primary/80 to-primary/60",
    link: "/ai-assistant",
  },
  {
    icon: Pill,
    title: "Medication Information",
    description: "Learn about your prescriptions, interactions, side effects, and proper dosages",
    color: "from-primary/70 to-primary/50",
    link: "/ai-assistant",
  },
];

export const AIFeaturesGrid = () => {
  return (
    <section className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="p-1.5 sm:p-2 rounded-lg ai-gradient">
          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
        <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">AI-Powered Features</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {features.map((feature, index) => (
          <Link key={feature.title} to={feature.link}>
            <Card 
              className="group card-glass hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden animate-fade-in-up h-full"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardContent className="p-5 sm:p-6">
                <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                
                <h3 className="font-display font-semibold text-base sm:text-lg text-foreground mb-2">{feature.title}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 leading-relaxed">{feature.description}</p>
                
                <button className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-accent hover:gap-3 transition-all duration-200">
                  Try Now
                  <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
};
