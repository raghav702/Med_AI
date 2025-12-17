import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { doctorService } from '@/services/doctor';
import { NavigationLayout } from '@/components/layout/NavigationLayout';
import { DoctorSearchFilters } from '@/components/doctor/DoctorSearchFilters';
import { DoctorList } from '@/components/doctor/DoctorList';
import { DoctorComparison } from '@/components/doctor/DoctorComparison';
import { AppointmentBooking } from '@/components/appointments';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { LoadingStateManager } from '@/components/ui/loading-state-manager';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDeviceType } from '@/hooks/use-mobile';
import { Search, Filter, GitCompare, Grid, List, MapPin, Star, Clock, Users, Bot } from 'lucide-react';
import type { DoctorSearchFilters as SearchFilters, DoctorWithProfile } from '@/types/database';

export default function DoctorDiscovery() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<SearchFilters>({});
  const [selectedDoctors, setSelectedDoctors] = useState<DoctorWithProfile[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showComparison, setShowComparison] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [bookingDoctorId, setBookingDoctorId] = useState<string | null>(null);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const deviceType = useDeviceType();
  const { isMobile, isTablet } = deviceType || { isMobile: false, isTablet: false };
  const pageSize = isMobile ? 8 : 12;

  // Initialize filters from URL params
  useEffect(() => {
    const initialFilters: SearchFilters = {};
    
    if (searchParams.get('specialty')) {
      initialFilters.specialty = searchParams.get('specialty')!;
    }
    if (searchParams.get('location')) {
      initialFilters.location = searchParams.get('location')!;
    }
    if (searchParams.get('min_rating')) {
      initialFilters.min_rating = parseFloat(searchParams.get('min_rating')!);
    }
    if (searchParams.get('max_price')) {
      initialFilters.max_price = parseFloat(searchParams.get('max_price')!);
    }
    
    setFilters(initialFilters);
  }, [searchParams]);

  // Handle doctorId from URL params (for booking from AI chat)
  useEffect(() => {
    const doctorIdParam = searchParams.get('doctorId');
    if (doctorIdParam) {
      setBookingDoctorId(doctorIdParam);
      setShowBookingDialog(true);
      
      // Remove doctorId from URL after opening dialog
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('doctorId');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Fetch doctors based on filters
  const {
    data: doctorsResponse,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['doctors', 'search', filters, currentPage],
    queryFn: () => doctorService.searchDoctors(filters, { page: currentPage, limit: pageSize }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleFiltersChange = (newFilters: SearchFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
    
    // Update URL params
    const params = new URLSearchParams();
    if (newFilters.specialty) params.set('specialty', newFilters.specialty);
    if (newFilters.location) params.set('location', newFilters.location);
    if (newFilters.min_rating) params.set('min_rating', newFilters.min_rating.toString());
    if (newFilters.max_price) params.set('max_price', newFilters.max_price.toString());
    
    setSearchParams(params);
  };

  const handleDoctorSelect = (doctor: DoctorWithProfile, selected: boolean) => {
    if (selected) {
      if (selectedDoctors.length < 3) {
        setSelectedDoctors([...selectedDoctors, doctor]);
      }
    } else {
      setSelectedDoctors(selectedDoctors.filter(d => d.id !== doctor.id));
    }
  };

  const clearComparison = () => {
    setSelectedDoctors([]);
    setShowComparison(false);
  };

  const activeFiltersCount = Object.values(filters).filter(value => 
    value !== undefined && value !== null && 
    (Array.isArray(value) ? value.length > 0 : true)
  ).length;

  return (
    <NavigationLayout>
      <div className="space-y-3 sm:space-y-4 lg:space-y-6 px-2 sm:px-0">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="text-center sm:text-left">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Find Doctors</h1>
            <p className="text-gray-600 mt-1 text-xs sm:text-sm lg:text-base">
              Discover and book appointments with qualified healthcare professionals
            </p>
          </div>
          
          {/* Action buttons row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-4">
            {/* AI Assistant Button */}
            <Button
              onClick={() => navigate('/ai-assistant')}
              className="flex items-center justify-center gap-2 touch-manipulation w-full sm:w-auto order-2 sm:order-1"
              variant="default"
              size="sm"
            >
              <Bot className="h-4 w-4" />
              <span className="sm:inline">AI Medical Assistant</span>
            </Button>
            
            {/* View controls - desktop only */}
            {!isMobile && (
              <div className="flex items-center gap-2 order-1 sm:order-2">
                {selectedDoctors.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => setShowComparison(!showComparison)}
                    className="flex items-center gap-2 touch-manipulation"
                    size="sm"
                  >
                    <GitCompare className="h-4 w-4" />
                    Compare ({selectedDoctors.length})
                  </Button>
                )}
                
                <div className="flex items-center border rounded-lg">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="rounded-r-none touch-manipulation"
                    aria-pressed={viewMode === 'grid'}
                    aria-label="Grid view"
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="rounded-l-none touch-manipulation"
                    aria-pressed={viewMode === 'list'}
                    aria-label="List view"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Search and Filters - Mobile-optimized */}
        {isMobile ? (
          <DoctorSearchFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
          />
        ) : (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" aria-hidden="true" />
                Search & Filters
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {activeFiltersCount} active
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DoctorSearchFilters
                filters={filters}
                onFiltersChange={handleFiltersChange}
              />
            </CardContent>
          </Card>
        )}

        {/* Mobile Action Bar */}
        {isMobile && (
          <div className="flex items-center justify-between gap-2 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-gray-500" />
              <span className="text-xs text-gray-600">
                {doctorsResponse?.count || 0} found
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {selectedDoctors.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowComparison(!showComparison)}
                  className="touch-manipulation h-8 px-2"
                >
                  <GitCompare className="h-3.5 w-3.5 mr-1" />
                  {selectedDoctors.length}
                </Button>
              )}
              
              <div className="flex items-center border rounded-md">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-r-none p-1.5 h-8 w-8 touch-manipulation"
                  aria-pressed={viewMode === 'grid'}
                  aria-label="Grid view"
                >
                  <Grid className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-l-none p-1.5 h-8 w-8 touch-manipulation"
                  aria-pressed={viewMode === 'list'}
                  aria-label="List view"
                >
                  <List className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        <LoadingStateManager
          loading={isLoading}
          error={error?.message}
          onRetry={() => refetch()}
          loadingText="Finding doctors..."
          className="min-h-[400px]"
        >
          <Tabs value={showComparison ? 'comparison' : 'results'} className="w-full">
            {!isMobile && (
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger 
                  value="results" 
                  onClick={() => setShowComparison(false)}
                  className="flex items-center gap-2 touch-manipulation"
                >
                  <Search className="h-4 w-4" />
                  <span className="hidden sm:inline">Results</span> ({doctorsResponse?.count || 0})
                </TabsTrigger>
                <TabsTrigger 
                  value="comparison" 
                  disabled={selectedDoctors.length === 0}
                  onClick={() => setShowComparison(true)}
                  className="flex items-center gap-2 touch-manipulation"
                >
                  <GitCompare className="h-4 w-4" />
                  <span className="hidden sm:inline">Compare</span> ({selectedDoctors.length})
                </TabsTrigger>
              </TabsList>
            )}
            
            <TabsContent value="results" className={isMobile ? '' : 'mt-6'}>
              {showComparison && isMobile && (
                <div className="mb-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowComparison(false)}
                    className="w-full touch-manipulation"
                  >
                    ← Back to Results
                  </Button>
                </div>
              )}
              <DoctorList
                doctors={doctorsResponse?.data || []}
                viewMode={isMobile ? 'list' : viewMode}
                selectedDoctors={selectedDoctors}
                onDoctorSelect={handleDoctorSelect}
                pagination={{
                  currentPage,
                  totalPages: doctorsResponse?.total_pages || 1,
                  hasNext: doctorsResponse?.has_next || false,
                  hasPrevious: doctorsResponse?.has_previous || false,
                  onPageChange: setCurrentPage
                }}
              />
            </TabsContent>
            
            <TabsContent value="comparison" className={isMobile ? '' : 'mt-6'}>
              {!showComparison && isMobile && selectedDoctors.length > 0 && (
                <div className="mb-4">
                  <Button
                    onClick={() => setShowComparison(true)}
                    className="w-full touch-manipulation"
                  >
                    <GitCompare className="h-4 w-4 mr-2" />
                    Compare Selected Doctors ({selectedDoctors.length})
                  </Button>
                </div>
              )}
              {showComparison && (
                <>
                  {isMobile && (
                    <div className="mb-4">
                      <Button
                        variant="outline"
                        onClick={() => setShowComparison(false)}
                        className="w-full touch-manipulation"
                      >
                        ← Back to Results
                      </Button>
                    </div>
                  )}
                  <DoctorComparison
                    doctors={selectedDoctors}
                    onRemoveDoctor={(doctorId) => {
                      setSelectedDoctors(selectedDoctors.filter(d => d.id !== doctorId));
                    }}
                    onClearAll={clearComparison}
                  />
                </>
              )}
            </TabsContent>
          </Tabs>
        </LoadingStateManager>
      </div>

      {/* Appointment Booking Dialog */}
      {bookingDoctorId && (
        <AppointmentBooking
          doctorId={bookingDoctorId}
          open={showBookingDialog}
          onOpenChange={(open) => {
            setShowBookingDialog(open);
            if (!open) {
              setBookingDoctorId(null);
            }
          }}
        />
      )}
    </NavigationLayout>
  );
}