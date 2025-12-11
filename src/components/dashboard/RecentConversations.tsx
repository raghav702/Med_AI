import { Bot, ArrowRight, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

// This will be replaced with real data from your backend later
const conversations = [
  // Empty for now - will be populated from user's actual AI conversations
];

export const RecentConversations = () => {
  const hasConversations = conversations.length > 0;

  return (
    <section className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 rounded-lg bg-secondary">
            <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-foreground" />
          </div>
          <h2 className="font-display text-lg sm:text-2xl font-bold text-foreground">Recent AI Conversations</h2>
        </div>
        {hasConversations && (
          <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
            View All
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>

      {hasConversations ? (
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2 snap-x snap-mandatory scrollbar-hide">
          {conversations.map((conv: any, index) => (
            <Card 
              key={conv.id} 
              className="card-glass min-w-[320px] max-w-[320px] hover:shadow-lg transition-all duration-300 snap-start animate-slide-in-right"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full ai-gradient flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground line-clamp-2 leading-relaxed">{conv.snippet}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{conv.timestamp}</span>
                  <Button size="sm" variant="aiOutline" className="h-8 text-xs">
                    Continue
                    <ArrowRight className="w-3 h-3 ml-1" />
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
              <Bot className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-display font-semibold text-foreground mb-2">No conversations yet</h3>
            <p className="text-muted-foreground mb-6">Start your first AI consultation to get personalized health insights</p>
            <Link to="/ai-assistant">
              <Button variant="ai">
                <Bot className="w-4 h-4" />
                Start AI Consultation
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </section>
  );
};
