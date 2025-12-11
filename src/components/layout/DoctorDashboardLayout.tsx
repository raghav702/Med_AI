import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  Home,
  User,
  Users,
  Calendar,
  Menu,
  LogOut,
  Settings,
} from 'lucide-react';
import { SessionStatusIndicator } from '@/components/session/SessionStatusIndicator';
import { BreadcrumbNavigation } from './BreadcrumbNavigation';
import { cn } from '@/lib/utils';

interface DoctorDashboardLayoutProps {
  children: React.ReactNode;
}

const doctorNavigationItems = [
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

export const DoctorDashboardLayout: React.FC<DoctorDashboardLayoutProps> = ({ children }) => {
  const { user, signOut } = useAuth();
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

  const NavigationContent = () => (
    <>
      <div className="flex items-center gap-2 px-4 py-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
          <Stethoscope className="h-4 w-4" />
        </div>
        <span className="font-semibold">Doctor Portal</span>
      </div>
      
      <nav className="flex-1 space-y-1 px-2">
        {doctorNavigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Icon className="h-4 w-4" />
              {item.title}
            </Link>
          );
        })}
      </nav>
    </>
  );

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        {/* Desktop Sidebar */}
        <Sidebar className="hidden md:flex">
          <SidebarHeader>
            <NavigationContent />
          </SidebarHeader>
          <SidebarContent />
          <SidebarFooter>
            <div className="p-4 border-t">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs bg-blue-600 text-white">
                        {user?.email ? getUserInitials(user.email) : 'DR'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start">
                      <span className="truncate text-sm font-medium">Dr. {user?.email?.split('@')[0]}</span>
                      <span className="text-xs text-muted-foreground">Doctor</span>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Doctor Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/doctor/profile" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      My Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled>
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </SidebarFooter>
        </Sidebar>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-14 items-center gap-4 px-4 lg:px-6">
              {/* Mobile Menu Trigger */}
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle navigation menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0">
                  <div className="flex h-full flex-col">
                    <div className="flex-1 py-4">
                      <NavigationContent />
                    </div>
                    <div className="border-t p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-sm bg-blue-600 text-white">
                            {user?.email ? getUserInitials(user.email) : 'DR'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">Dr. {user?.email?.split('@')[0]}</p>
                          <p className="text-xs text-muted-foreground">Doctor</p>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start"
                          asChild
                        >
                          <Link to="/doctor/profile" onClick={() => setIsMobileMenuOpen(false)}>
                            <User className="h-4 w-4 mr-2" />
                            My Profile
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-red-600"
                          onClick={handleSignOut}
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Sign Out
                        </Button>
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              {/* Desktop Sidebar Trigger */}
              <SidebarTrigger className="hidden md:flex" />

              {/* Breadcrumb Navigation */}
              <div className="flex-1">
                <BreadcrumbNavigation />
              </div>

              {/* Session Status and User Menu for Desktop */}
              <div className="hidden md:flex items-center gap-4">
                <SessionStatusIndicator />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-blue-600 text-white">
                          {user?.email ? getUserInitials(user.email) : 'DR'}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">Dr. {user?.email?.split('@')[0]}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user?.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/doctor/profile" className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        My Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled>
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 overflow-auto bg-gray-50/50">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};