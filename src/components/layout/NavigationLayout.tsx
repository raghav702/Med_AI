import React from 'react';
import { HeaderNavigation } from './HeaderNavigation';

interface NavigationLayoutProps {
  children: React.ReactNode;
}

export const NavigationLayout: React.FC<NavigationLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header Navigation */}
      <HeaderNavigation />
      
      {/* Main Content Area */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
};