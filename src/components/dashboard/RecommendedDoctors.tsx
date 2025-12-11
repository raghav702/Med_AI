import { Star, Sparkles, Calendar, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

// This will be replaced with real data from your Supabase database later
const doctors = [
  // Empty for now - will be populated from actual doctor recommendations
];

export const RecommendedDoctors = () => {
  const hasDoctors = doctors.length > 0;

  return (
    <section className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 rounded-lg ai-gradient">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <h2 className="font-display text-lg sm:text-2xl font-bold text-foreground">AI-Recommended Doctors</h2>
            <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Based on your health profile and preferences</p>
          </div>
        </div>
        <Link to="/doctor-discovery">
          <Button variant="ghost" className="text-muted-foreground hover:text-foreground hidden md:flex">
            View All Doctors
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </div>

      {hasDoctors ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {doctors.map((doctor: any, index) => (
            <Card 
              key={doctor.id} 
              className="card-glass hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group overflow-hidden animate-fade-in-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardContent className="p-5">
                {/* AI Match Badge */}
                <div className="flex justify-end mb-2">
                  <Badge className="ai-gradient text-white border-0 text-xs font-medium">
                    <Sparkles className="w-3 h-3 mr-1" />
                    AI Match: {doctor.aiMatch}%
                  </Badge>
                </div>

                <div className="flex items-start gap-4">
                  <img
                    src={doctor.image}
                    alt={doctor.name}
                    className="w-16 h-16 rounded-xl object-cover ring-2 ring-border group-hover:ring-accent transition-all duration-300"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-semibold text-foreground truncate">{doctor.name}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{doctor.specialty}</p>
                    
                    <div className="flex items-center gap-1 mb-2">
                      <Star className="w-4 h-4 text-warning fill-warning" />
                      <span className="text-sm font-medium text-foreground">{doctor.rating}</span>
                      <span className="text-xs text-muted-foreground">({doctor.reviews} reviews)</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Next: {doctor.available}</span>
                  </div>
                  <Button size="sm" variant="default">
                    Book Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="card-glass">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 rounded-full ai-gradient mx-auto mb-4 flex items-center justify-center opacity-50">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-display font-semibold text-foreground mb-2">No recommendations yet</h3>
            <p className="text-muted-foreground mb-6">Start an AI consultation to get personalized doctor recommendations</p>
            <Link to="/doctor-discovery">
              <Button variant="ai">
                <Sparkles className="w-4 h-4" />
                Browse All Doctors
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </section>
  );
};
