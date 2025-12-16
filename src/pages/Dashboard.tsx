import { Navigate } from 'react-router-dom';
import { SessionExpiryNotification } from '@/components/session/SessionExpiryNotification';
import { useUserType } from '@/hooks/useUserType';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { NavigationLayout } from '@/components/layout/NavigationLayout';
import { HeroSection } from '@/components/dashboard/HeroSection';
import { AIFeaturesGrid } from '@/components/dashboard/AIFeaturesGrid';
import { RecentConversations } from '@/components/dashboard/RecentConversations';
import { AboutApp } from '@/components/dashboard/AboutApp';
import { FloatingAIButton } from '@/components/dashboard/FloatingAIButton';
import { Footer } from '@/components/dashboard/Footer';

/**
 * Dashboard page component
 * 
 * This is the main protected page that users see after authentication.
 * Routes to appropriate dashboard based on user type.
 */
const Dashboard = () => {
  const { loading, isDoctor } = useUserType();

  // Show loading while determining user type
  if (loading) {
    return (
      <NavigationLayout>
        <div className="container mx-auto px-4 md:px-6 py-8 space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </NavigationLayout>
    );
  }

  // Route to doctor dashboard if user is a doctor
  if (isDoctor) {
    return <Navigate to="/doctor/dashboard" replace />;
  }

  // Default patient dashboard with new AI-focused design
  return (
    <NavigationLayout>
      <div className="container mx-auto px-4 md:px-6 py-6 sm:py-8 space-y-8 sm:space-y-10">
        {/* Session Expiry Notification */}
        <SessionExpiryNotification />
        
        <HeroSection />
        <AIFeaturesGrid />
        <AboutApp />
      </div>

      <FloatingAIButton />
      <Footer />
    </NavigationLayout>
  );
};

export default Dashboard;