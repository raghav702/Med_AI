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
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${doctor.id}`} />
                <AvatarFallback>
                  {doctor.name?.[0] || 'D'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-lg">
                  {doctor.name}
                </h3>
                <p className="text-sm text-gray-600">{doctor.specialty}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {(canSelect || isSelected) && (
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) => onDoctorSelect(doctor, checked as boolean)}
                  disabled={!canSelect && !isSelected}
                />
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Rating and Reviews */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {doctor.aggregate_rating !== null && doctor.aggregate_rating !== undefined && (
                <>
                  <div className="flex items-center">
                    {renderStars(doctor.aggregate_rating)}
                  </div>
                  <span className="text-sm font-medium">{doctor.aggregate_rating.toFixed(1)}</span>
                </>
              )}
              <span className="text-sm text-gray-500">({doctor.review_count} reviews)</span>
            </div>
            {doctor.experience !== null && doctor.experience !== undefined && (
              <div className="flex items-center text-sm text-gray-600">
                <Clock className="h-4 w-4 mr-1" />
                {doctor.experience} years
              </div>
            )}
          </div>

          {/* Location and Fee */}
          <div className="space-y-2">
            {doctor.address && (
              <div className="flex items-center text-sm text-gray-600">
                <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="truncate">{doctor.address}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              {doctor.price_range !== null && doctor.price_range !== undefined && (
                <div className="flex items-center text-sm text-gray-600">
                  <IndianRupee className="h-4 w-4 mr-1" />
                  <span>₹{doctor.price_range.toFixed(0)}</span>
                </div>
              )}
              <div className="flex items-center text-sm text-gray-600">
                <Users className="h-4 w-4 mr-1" />
                <span>{doctor.review_count} reviews</span>
              </div>
            </div>
          </div>

          {/* Qualifications Preview */}
          {doctor.qualifications && (
            <p className="text-sm text-gray-600 line-clamp-2">
              {doctor.qualifications}
            </p>
          )}

          {/* Actions */}
          <div className="flex space-x-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleViewProfile(doctor.id)}
              className="flex-1"
            >
              View Profile
            </Button>
            <Button
              size="sm"
              className="flex-1"
              onClick={() => handleBookAppointment(doctor.id)}
            >
              <Calendar className="h-4 w-4 mr-1" />
              Book Appointment
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
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-1">
              <div className="flex items-center space-x-2">
                {(canSelect || isSelected) && (
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => onDoctorSelect(doctor, checked as boolean)}
                    disabled={!canSelect && !isSelected}
                  />
                )}
                <Avatar className="h-16 w-16">
                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${doctor.id}`} />
                  <AvatarFallback>
                    {doctor.name?.[0] || 'D'}
                  </AvatarFallback>
                </Avatar>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="font-semibold text-lg">
                    {doctor.name}
                  </h3>
                </div>
                
                <p className="text-gray-600 mb-2">{doctor.specialty}</p>
                
                <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                  {doctor.aggregate_rating !== null && doctor.aggregate_rating !== undefined && (
                    <div className="flex items-center">
                      {renderStars(doctor.aggregate_rating)}
                      <span className="ml-1 font-medium">{doctor.aggregate_rating.toFixed(1)}</span>
                      <span className="ml-1">({doctor.review_count})</span>
                    </div>
                  )}
                  {doctor.experience !== null && doctor.experience !== undefined && (
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {doctor.experience} years
                    </div>
                  )}
                  {doctor.price_range !== null && doctor.price_range !== undefined && (
                    <div className="flex items-center">
                      <IndianRupee className="h-4 w-4 mr-1" />
                      ₹{doctor.price_range.toFixed(0)}
                    </div>
                  )}
                </div>
                
                {doctor.address && (
                  <div className="flex items-center text-sm text-gray-600 mb-2">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span className="truncate">{doctor.address}</span>
                  </div>
                )}
                
                {doctor.qualifications && (
                  <p className="text-sm text-gray-600 line-clamp-1">
                    {doctor.qualifications}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex flex-col space-y-2 ml-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleViewProfile(doctor.id)}
              >
                View Profile
              </Button>
              <Button
                size="sm"
                onClick={() => handleBookAppointment(doctor.id)}
              >
                <Calendar className="h-4 w-4 mr-1" />
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
    <div className="space-y-6">
      {/* Results */}
      <div className={
        viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
          : 'space-y-4'
      }>
        {doctors.map((doctor) => (
          viewMode === 'grid' 
            ? <DoctorCard key={doctor.id} doctor={doctor} />
            : <DoctorListItem key={doctor.id} doctor={doctor} />
        ))}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination>
            <PaginationContent>
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