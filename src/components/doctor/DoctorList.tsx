import { useState, Fragment } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { DoctorProfileDialog } from './DoctorProfileDialog';
import { AppointmentBooking } from '@/components/appointments';
import { Star, MapPin, IndianRupee, Clock, Users, CheckCircle, Calendar } from 'lucide-react';
import type { DoctorWithProfile } from '@/types/database';

interface DoctorListProps {
  doctors: DoctorWithProfile[];
  viewMode: 'grid' | 'list';
  selectedDoctors: DoctorWithProfile[];
  onDoctorSelect: (doctor: DoctorWithProfile, selected: boolean) => void;
  pagination: {
    currentPage: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
    onPageChange: (page: number) => void;
  };
}

export function DoctorList({ 
  doctors, 
  viewMode, 
  selectedDoctors, 
  onDoctorSelect, 
  pagination 
}: DoctorListProps) {
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [bookingDoctorId, setBookingDoctorId] = useState<string | null>(null);

  const isDoctorSelected = (doctorId: string) => 
    selectedDoctors.some(d => d.id === doctorId);

  const handleViewProfile = (doctorId: string) => {
    setSelectedDoctorId(doctorId);
  };

  const handleBookAppointment = (doctorId: string) => {
    setBookingDoctorId(doctorId);
  };

  const handleBookingComplete = (appointmentId: string) => {
    console.log('Appointment booked:', appointmentId);
    setBookingDoctorId(null);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating) 
            ? 'fill-yellow-400 text-yellow-400' 
            : i < rating 
            ? 'fill-yellow-200 text-yellow-400' 
            : 'text-gray-300'
        }`}
      />
    ));
  };

  const DoctorCard = ({ doctor }: { doctor: DoctorWithProfile }) => {
    const isSelected = isDoctorSelected(doctor.id);
    const canSelect = !isSelected && selectedDoctors.length < 3;

    return (
      <Card className={`transition-all duration-200 hover:shadow-md ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
        <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
              <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${doctor.id}`} />
                <AvatarFallback>
                  {doctor.name?.[0] || 'D'}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm sm:text-lg leading-tight truncate">
                  {doctor.name}
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 truncate">{doctor.specialty}</p>
              </div>
            </div>
            <div className="flex items-center flex-shrink-0">
              {(canSelect || isSelected) && (
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) => onDoctorSelect(doctor, checked as boolean)}
                  disabled={!canSelect && !isSelected}
                  className="touch-manipulation"
                />
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6 pt-0 sm:pt-0">
          {/* Rating and Reviews */}
          <div className="flex flex-wrap items-center justify-between gap-1">
            <div className="flex items-center space-x-1 sm:space-x-2">
              {doctor.aggregate_rating !== null && doctor.aggregate_rating !== undefined && (
                <>
                  <div className="flex items-center">
                    <Star className="h-3 w-3 sm:h-4 sm:w-4 fill-yellow-400 text-yellow-400" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium">{doctor.aggregate_rating.toFixed(1)}</span>
                </>
              )}
              <span className="text-xs sm:text-sm text-gray-500">({doctor.review_count})</span>
            </div>
            {doctor.experience !== null && doctor.experience !== undefined && (
              <div className="flex items-center text-xs sm:text-sm text-gray-600">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                {doctor.experience}y exp
              </div>
            )}
          </div>

          {/* Location and Fee */}
          <div className="space-y-1 sm:space-y-2">
            {doctor.address && (
              <div className="flex items-start text-xs sm:text-sm text-gray-600">
                <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0 mt-0.5" />
                <span className="line-clamp-2">{doctor.address}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              {doctor.price_range !== null && doctor.price_range !== undefined && (
                <div className="flex items-center text-xs sm:text-sm text-gray-600">
                  <IndianRupee className="h-3 w-3 sm:h-4 sm:w-4 mr-0.5" />
                  <span>₹{doctor.price_range.toFixed(0)}</span>
                </div>
              )}
              <div className="flex items-center text-xs sm:text-sm text-gray-600">
                <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                <span>{doctor.review_count} reviews</span>
              </div>
            </div>
          </div>

          {/* Qualifications Preview - Hidden on very small screens */}
          {doctor.qualifications && (
            <p className="text-xs sm:text-sm text-gray-600 line-clamp-1 sm:line-clamp-2 hidden xs:block">
              {doctor.qualifications}
            </p>
          )}

          {/* Actions */}
          <div className="flex space-x-2 pt-1 sm:pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleViewProfile(doctor.id)}
              className="flex-1 text-xs sm:text-sm h-8 sm:h-9 touch-manipulation"
            >
              View
            </Button>
            <Button
              size="sm"
              className="flex-1 text-xs sm:text-sm h-8 sm:h-9 touch-manipulation"
              onClick={() => handleBookAppointment(doctor.id)}
            >
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              Book
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const DoctorListItem = ({ doctor }: { doctor: DoctorWithProfile }) => {
    const isSelected = isDoctorSelected(doctor.id);
    const canSelect = !isSelected && selectedDoctors.length < 3;

    return (
      <Card className={`transition-all duration-200 hover:shadow-md ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Doctor Info Section */}
            <div className="flex items-start sm:items-center space-x-3 sm:space-x-4 flex-1">
              <div className="flex items-center space-x-2 flex-shrink-0">
                {(canSelect || isSelected) && (
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => onDoctorSelect(doctor, checked as boolean)}
                    disabled={!canSelect && !isSelected}
                    className="touch-manipulation"
                  />
                )}
                <Avatar className="h-12 w-12 sm:h-16 sm:w-16">
                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${doctor.id}`} />
                  <AvatarFallback>
                    {doctor.name?.[0] || 'D'}
                  </AvatarFallback>
                </Avatar>
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base sm:text-lg leading-tight">
                  {doctor.name}
                </h3>
                
                <p className="text-gray-600 text-sm sm:text-base">{doctor.specialty}</p>
                
                {/* Rating - Mobile optimized */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 mt-1">
                  {doctor.aggregate_rating !== null && doctor.aggregate_rating !== undefined && (
                    <div className="flex items-center">
                      <Star className="h-3 w-3 sm:h-4 sm:w-4 fill-yellow-400 text-yellow-400 mr-1" />
                      <span className="font-medium">{doctor.aggregate_rating.toFixed(1)}</span>
                      <span className="ml-1 text-gray-500">({doctor.review_count})</span>
                    </div>
                  )}
                  {doctor.experience !== null && doctor.experience !== undefined && (
                    <div className="flex items-center">
                      <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                      {doctor.experience}y
                    </div>
                  )}
                  {doctor.price_range !== null && doctor.price_range !== undefined && (
                    <div className="flex items-center">
                      <IndianRupee className="h-3 w-3 sm:h-4 sm:w-4 mr-0.5" />
                      {doctor.price_range.toFixed(0)}
                    </div>
                  )}
                </div>
                
                {doctor.address && (
                  <div className="flex items-start text-xs sm:text-sm text-gray-600 mt-1">
                    <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0 mt-0.5" />
                    <span className="line-clamp-2 sm:line-clamp-1">{doctor.address}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Action Buttons - Full width on mobile */}
            <div className="flex sm:flex-col gap-2 sm:ml-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleViewProfile(doctor.id)}
                className="flex-1 sm:flex-initial text-xs sm:text-sm touch-manipulation"
              >
                View Profile
              </Button>
              <Button
                size="sm"
                onClick={() => handleBookAppointment(doctor.id)}
                className="flex-1 sm:flex-initial text-xs sm:text-sm touch-manipulation"
              >
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                Book
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (doctors.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 mb-4">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium">No doctors found</h3>
          <p className="text-sm">Try adjusting your search filters to find more doctors.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Results */}
      <div className={
        viewMode === 'grid' 
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6'
          : 'space-y-3 sm:space-y-4'
      }>
        {doctors.map((doctor) => (
          viewMode === 'grid' 
            ? <DoctorCard key={doctor.id} doctor={doctor} />
            : <DoctorListItem key={doctor.id} doctor={doctor} />
        ))}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center px-2">
          <Pagination>
            <PaginationContent className="flex-wrap gap-1">
              {pagination.hasPrevious && (
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
                  />
                </PaginationItem>
              )}
              
              {(() => {
                const { currentPage, totalPages } = pagination;
                const pages: number[] = [];
                
                // Always show first page
                if (currentPage > 2) {
                  pages.push(1);
                }
                
                // Show pages around current page
                const start = Math.max(1, currentPage - 1);
                const end = Math.min(totalPages, currentPage + 1);
                
                for (let i = start; i <= end; i++) {
                  pages.push(i);
                }
                
                // Always show last page
                if (currentPage < totalPages - 1) {
                  pages.push(totalPages);
                }
                
                // Remove duplicates and sort
                const uniquePages = Array.from(new Set(pages)).sort((a, b) => a - b);
                
                return uniquePages.map((page, index) => {
                  // Add ellipsis if there's a gap
                  const showEllipsisBefore = index > 0 && page - uniquePages[index - 1] > 1;
                  
                  return (
                    <Fragment key={page}>
                      {showEllipsisBefore && (
                        <PaginationItem>
                          <span className="px-4 py-2">...</span>
                        </PaginationItem>
                      )}
                      <PaginationItem>
                        <PaginationLink
                          onClick={() => pagination.onPageChange(page)}
                          isActive={page === currentPage}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    </Fragment>
                  );
                });
              })()}
              
              {pagination.hasNext && (
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
                  />
                </PaginationItem>
              )}
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Doctor Profile Dialog */}
      {selectedDoctorId && (
        <DoctorProfileDialog
          doctorId={selectedDoctorId}
          open={!!selectedDoctorId}
          onOpenChange={(open) => !open && setSelectedDoctorId(null)}
        />
      )}

      {/* Appointment Booking Dialog */}
      {bookingDoctorId && (
        <AppointmentBooking
          doctorId={bookingDoctorId}
          open={!!bookingDoctorId}
          onOpenChange={(open) => !open && setBookingDoctorId(null)}
          onBookingComplete={handleBookingComplete}
        />
      )}
    </div>
  );
}