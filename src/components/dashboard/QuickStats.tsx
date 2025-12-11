import { Bot, Calendar, Lightbulb, Stethoscope, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

// This will be replaced with real data from your backend later
const stats = [
  {
    icon: Bot,
    label: "AI Consultations",
    value: "0",
    change: "Get started",
    color: "ai-gradient",
  },
  {
    icon: Calendar,
    label: "Appointments",
    value: "0",
    change: "Book your first",
    color: "bg-primary",
  },
  {
    icon: Lightbulb,
    label: "Health Tips",
    value: "0",
    change: "Coming soon",
    color: "bg-primary/80",
  },
  {
    icon: Stethoscope,
    label: "Doctors Saved",
    value: "0",
    change: "Find specialists",
    color: "bg-primary/90",
  },
];

export const QuickStats = () => {
  return (
    <section className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="p-1.5 sm:p-2 rounded-lg bg-secondary">
          <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-foreground" />
        </div>
        <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">Your Health Journey</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((stat, index) => (
          <Card 
            key={stat.label} 
            className="card-glass hover:shadow-md transition-all duration-300 animate-scale-in"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between mb-2 sm:mb-3">
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
              </div>
              
              <div className="space-y-0.5 sm:space-y-1">
                <p className="font-display text-xl sm:text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs sm:text-sm font-medium text-foreground line-clamp-2">{stat.label}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">{stat.change}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};
