import { Bot, Stethoscope, Calendar, FileText, Sparkles, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface Feature {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  gradient?: boolean;
}

const features: Feature[] = [
  {
    id: 'ai-consultation',
    icon: Bot,
    title: 'AI Medical Assistant',
    description: 'Get instant health insights and symptom analysis powered by advanced AI',
    gradient: true
  },
  {
    id: 'doctor-discovery',
    icon: Stethoscope,
    title: 'Find Specialists',
    description: 'Discover and connect with qualified doctors based on your needs'
  },
  {
    id: 'appointments',
    icon: Calendar,
    title: 'Manage Appointments',
    description: 'Book, track, and manage your medical appointments in one place'
  },
  {
    id: 'records',
    icon: FileText,
    title: 'Medical Records',
    description: 'Access and organize your health records securely'
  }
];

export const AboutApp = () => {
  return (
    <section className="space-y-4 sm:space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="p-1.5 sm:p-2 rounded-lg bg-secondary">
          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-foreground" />
        </div>
        <h2 className="font-display text-lg sm:text-2xl font-bold text-foreground">
          Welcome to MedAI
        </h2>
      </div>

      {/* Features Grid - Four Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <Card 
              key={feature.id}
              className="card-glass hover:shadow-lg transition-all duration-300 animate-slide-in-right"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardContent className="p-5">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${
                  feature.gradient ? 'ai-gradient' : 'bg-secondary'
                }`}>
                  <Icon className={`w-6 h-6 ${feature.gradient ? 'text-white' : 'text-foreground'}`} />
                </div>
                <h3 className="font-display font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Description Card - Hero Style */}
      <Card className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/10 border-2 border-primary/20 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/20 transition-all duration-500 group">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <CardContent className="relative p-8 sm:p-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-xl ai-gradient flex items-center justify-center group-hover:ai-glow transition-all duration-500 shadow-lg">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h3 className="font-display text-2xl font-bold text-foreground group-hover:text-primary transition-colors duration-300">
              Your Complete Healthcare Companion
            </h3>
          </div>
          <p className="text-lg text-foreground/90 leading-relaxed">
            MedAI combines cutting-edge artificial intelligence with comprehensive healthcare management 
            to provide you with instant medical insights, personalized doctor recommendations, and seamless 
            appointment scheduling—all in one intuitive platform.
          </p>
        </CardContent>
      </Card>

      {/* Feature Details Cards - Different Backgrounds */}
      <div className="grid sm:grid-cols-2 gap-6">
        {/* AI Assistant Card - Blue Theme */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10 border-2 border-blue-200/50 dark:border-blue-800/30 hover:border-blue-400/60 hover:shadow-xl hover:shadow-blue-500/20 transition-all duration-500 group">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <CardContent className="relative p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-blue-500/30 transition-all duration-300">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <h4 className="font-display text-xl font-bold text-foreground group-hover:text-blue-600 transition-colors duration-300">
                24/7 AI Health Assistant
              </h4>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Get instant answers to health questions, symptom analysis, and medication information 
              anytime, anywhere. Our AI is trained on vast medical knowledge to provide reliable guidance.
            </p>
          </CardContent>
        </Card>

        {/* Doctor Matching Card - Green Theme */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/20 dark:to-emerald-900/10 border-2 border-emerald-200/50 dark:border-emerald-800/30 hover:border-emerald-400/60 hover:shadow-xl hover:shadow-emerald-500/20 transition-all duration-500 group">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <CardContent className="relative p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-emerald-500/30 transition-all duration-300">
                <Stethoscope className="w-6 h-6 text-white" />
              </div>
              <h4 className="font-display text-xl font-bold text-foreground group-hover:text-emerald-600 transition-colors duration-300">
                Smart Doctor Matching
              </h4>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Find the perfect specialist based on your symptoms, location, and preferences. 
              Browse verified doctors with ratings, experience, and availability.
            </p>
          </CardContent>
        </Card>

        {/* Appointments Card - Purple Theme */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/20 dark:to-purple-900/10 border-2 border-purple-200/50 dark:border-purple-800/30 hover:border-purple-400/60 hover:shadow-xl hover:shadow-purple-500/20 transition-all duration-500 group">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <CardContent className="relative p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-purple-500/30 transition-all duration-300">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <h4 className="font-display text-xl font-bold text-foreground group-hover:text-purple-600 transition-colors duration-300">
                Effortless Appointments
              </h4>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Book, reschedule, or cancel appointments with ease. Track your upcoming visits 
              and receive reminders so you never miss an appointment.
            </p>
          </CardContent>
        </Card>

        {/* Health Records Card - Orange Theme */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/20 dark:to-orange-900/10 border-2 border-orange-200/50 dark:border-orange-800/30 hover:border-orange-400/60 hover:shadow-xl hover:shadow-orange-500/20 transition-all duration-500 group">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <CardContent className="relative p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-orange-500/30 transition-all duration-300">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <h4 className="font-display text-xl font-bold text-foreground group-hover:text-orange-600 transition-colors duration-300">
                Secure Health Records
              </h4>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Access your complete medical history, prescriptions, and test results in one secure place. 
              Share records with doctors instantly when needed.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pro Tip Card - Special Highlight */}
      <Card className="relative overflow-hidden bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 dark:from-amber-950/20 dark:via-yellow-950/20 dark:to-amber-950/20 border-2 border-amber-200 dark:border-amber-800/50 hover:border-amber-400 hover:shadow-xl hover:shadow-amber-500/20 transition-all duration-500 group">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <CardContent className="relative p-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-amber-500/30 transition-all duration-300 mt-1">
              <span className="text-white font-bold text-xl">💡</span>
            </div>
            <div className="flex-1">
              <h4 className="font-display text-xl font-bold text-foreground mb-3 group-hover:text-amber-600 transition-colors duration-300">
                Pro Tip
              </h4>
              <p className="text-muted-foreground leading-relaxed text-lg">
                Start with our AI assistant to analyze your symptoms, 
                then seamlessly book an appointment with a recommended specialist—all without leaving the platform.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Call-to-Action Section */}
      <Card className="card-glass">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <h3 className="font-display font-semibold text-foreground mb-2">
                Ready to get started?
              </h3>
              <p className="text-sm text-muted-foreground">
                Chat with our AI assistant or find a specialist
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Link to="/ai-assistant" className="w-full sm:w-auto">
                <Button variant="ai" className="w-full sm:w-auto">
                  <Bot className="w-4 h-4" />
                  Start AI Consultation
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
              <Link to="/doctors" className="w-full sm:w-auto">
                <Button variant="aiOutline" className="w-full sm:w-auto">
                  <Stethoscope className="w-4 h-4" />
                  Find Doctors
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
};
