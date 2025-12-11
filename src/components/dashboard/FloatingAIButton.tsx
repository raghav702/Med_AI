import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Link } from "react-router-dom";

export const FloatingAIButton = () => {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Tooltip>
        <TooltipTrigger asChild>
          <Link to="/ai-assistant">
            <Button 
              size="icon" 
              className="w-16 h-16 rounded-full ai-gradient shadow-2xl pulse-glow hover:scale-110 transition-transform duration-300"
            >
              <Bot className="w-7 h-7 text-white" />
            </Button>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="left" className="font-medium">
          Ask AI
        </TooltipContent>
      </Tooltip>
    </div>
  );
};
