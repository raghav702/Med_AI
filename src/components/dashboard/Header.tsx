import { Bell, User, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

export const Header = () => {
  const { user } = useAuth();
  const displayName = user?.email?.split('@')[0] || 'User';

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl ai-gradient flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-display font-bold text-lg text-foreground">MedAI</h1>
              <p className="text-xs text-muted-foreground">Health Dashboard</p>
            </div>
          </Link>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center bg-primary text-primary-foreground text-[10px]">
                0
              </Badge>
            </Button>
            <Link to="/profile">
              <Button variant="secondary" size="sm" className="hidden sm:flex gap-2">
                <User className="w-4 h-4" />
                <span>{displayName}</span>
              </Button>
            </Link>
            <Link to="/profile">
              <Button variant="ghost" size="icon" className="sm:hidden">
                <User className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};
