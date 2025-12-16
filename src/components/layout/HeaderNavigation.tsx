import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserType } from '@/hooks/useUserType';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Home,
  User,
  Users,
  Calendar,
  LogOut,
  Settings,
  Search,
  Stethoscope,
  Sparkles,
  Menu,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavigationItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const HeaderNavigation: React.FC = () => {
  const { user, signOut } = useAuth();
  const { userType, isDoctor } = useUserType();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const getUserInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Define navigation items based on user type
  const getNavigationItems = (): NavigationItem[] => {
    if (isDoctor) {
      return [
        {
          title: 'Dashboard',
          href: '/doctor/dashboard',
          icon: Home,
        },
        {
          title: 'My Patients',
          href: '/doctor/patients',
          icon: Users,
        },
        {
          title: 'Appointments',
          href: '/doctor/appointments',
          icon: Calendar,
        },
        {
          title: 'My Profile',
          href: '/doctor/profile',
          icon: User,
        },
      ];
    }

    // Default patient navigation
    return [
      {
        title: 'Dashboard',
        href: '/dashboard',
        icon: Home,
      },
      {
        title: 'AI Assistant',
        href: '/ai-assistant',
        icon: Sparkles,
      },
      {
        title: 'Browse Doctors',
        href: '/doctor-discovery',
        icon: Search,
      },
      {
        title: 'Appointments',
        href: '/appointments',
        icon: Calendar,
      },
      {
        title: 'Profile',
        href: '/profile',
        icon: User,
      },
    ];
  };

  const navigationItems = getNavigationItems();

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent, href: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      window.location.href = href;
    }
  };

  // Mobile navigation component
  const MobileNavigation = () => (
    <div className="flex flex-col space-y-2 p-4">
      {navigationItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.href;
        
        return (
          <Link
            key={item.href}
            to={item.href}
            onClick={() => setIsMobileMenuOpen(false)}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
              "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              isActive
                ? isDoctor 
                  ? "bg-blue-600 text-white hover:bg-blue-700" 
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
                : "text-muted-foreground hover:text-foreground"
            )}
            onKeyDown={(e) => handleKeyDown(e, item.href)}
            tabIndex={0}
            role="menuitem"
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon className="h-5 w-5" />
            <span>{item.title}</span>
          </Link>
        );
      })}
      
      {/* Mobile User Section */}
      <div className="border-t pt-4 mt-4">
        <div className="flex items-center gap-3 px-4 py-2 mb-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className={cn(
              "text-sm",
              isDoctor ? "bg-blue-600 text-white" : "bg-primary text-primary-foreground"
            )}>
              {user?.email ? getUserInitials(user.email) : (isDoctor ? 'DR' : 'U')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {isDoctor ? `Dr. ${user?.email?.split('@')[0]}` : user?.email?.split('@')[0]}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.email}
            </p>
          </div>
        </div>
        
        <div className="space-y-1">
          <Link
            to={isDoctor ? "/doctor/profile" : "/profile"}
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            tabIndex={0}
            role="menuitem"
          >
            <User className="h-4 w-4" />
            {isDoctor ? 'My Profile' : 'Profile'}
          </Link>
          
          <button
            onClick={() => {
              setIsMobileMenuOpen(false);
              handleSignOut();
            }}
            className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors text-red-600 hover:bg-red-50 hover:text-red-700 focus:bg-red-50 focus:text-red-700 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 w-full text-left"
            tabIndex={0}
            role="menuitem"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <header 
      className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border"
      role="banner"
    >
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link 
            to={isDoctor ? "/doctor/dashboard" : "/dashboard"} 
            className="flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-lg"
            aria-label={`Go to ${isDoctor ? 'Doctor Dashboard' : 'Dashboard'}`}
          >
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-200 hover:scale-105",
              isDoctor ? "bg-blue-600 hover:bg-blue-700" : "ai-gradient"
            )}>
              {isDoctor ? (
                <Stethoscope className="w-5 h-5 text-white" />
              ) : (
                <Sparkles className="w-5 h-5 text-white" />
              )}
            </div>
            <div className="hidden sm:block">
              <h1 className="font-display font-bold text-lg text-foreground">
                {isDoctor ? 'Doctor Portal' : 'MedAI'}
              </h1>
              <p className="text-xs text-muted-foreground">
                {isDoctor ? 'Medical Practice' : 'Health Dashboard'}
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Items */}
          <nav 
            className="hidden md:flex items-center space-x-1" 
            role="navigation"
            aria-label="Main navigation"
          >
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    "hover:bg-accent hover:text-accent-foreground hover:scale-105",
                    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                    "active:scale-95",
                    isActive
                      ? isDoctor 
                        ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md" 
                        : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onKeyDown={(e) => handleKeyDown(e, item.href)}
                  tabIndex={0}
                  role="menuitem"
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={`Navigate to ${item.title}`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden lg:inline">{item.title}</span>
                </Link>
              );
            })}
          </nav>

          {/* Mobile Menu and User Menu */}
          <div className="flex items-center gap-2">
            {/* Mobile Menu Trigger */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="md:hidden hover:bg-accent transition-colors duration-200"
                  aria-label="Open navigation menu"
                >
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent 
                side="left" 
                className="w-80 p-0"
                aria-label="Navigation menu"
              >
                <SheetHeader className="p-6 pb-4 border-b">
                  <SheetTitle className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      isDoctor ? "bg-blue-600" : "ai-gradient"
                    )}>
                      {isDoctor ? (
                        <Stethoscope className="w-4 h-4 text-white" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <span className="font-display font-bold">
                      {isDoctor ? 'Doctor Portal' : 'MedAI'}
                    </span>
                  </SheetTitle>
                </SheetHeader>
                <nav role="navigation" aria-label="Mobile navigation">
                  <MobileNavigation />
                </nav>
              </SheetContent>
            </Sheet>

            {/* Desktop User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="relative hover:bg-accent transition-colors duration-200 focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  aria-label="Open user menu"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className={cn(
                      "text-sm transition-colors duration-200",
                      isDoctor ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-primary text-primary-foreground hover:bg-primary/90"
                    )}>
                      {user?.email ? getUserInitials(user.email) : (isDoctor ? 'DR' : 'U')}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="w-56"
                role="menu"
                aria-label="User menu"
              >
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">
                      {isDoctor ? `Dr. ${user?.email?.split('@')[0]}` : user?.email?.split('@')[0]}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user?.email}
                    </p>
                    {isDoctor && (
                      <p className="text-xs text-muted-foreground">Doctor</p>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link 
                    to={isDoctor ? "/doctor/profile" : "/profile"} 
                    className="flex items-center gap-2 focus:bg-accent focus:text-accent-foreground"
                    role="menuitem"
                  >
                    <User className="h-4 w-4" />
                    {isDoctor ? 'My Profile' : 'Profile'}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem disabled>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleSignOut} 
                  className="text-red-600 focus:bg-red-50 focus:text-red-700"
                  role="menuitem"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
};