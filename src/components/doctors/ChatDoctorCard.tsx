import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, MapPin, DollarSign, Clock, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { DoctorWithProfile } from '@/types/database';

interface ChatDoctorCardProps {
  doctor: DoctorWithProfile | any; // Allow any for AI orchestrator data
  onBookAppointment?: (doctorId: string) => void;
}

export function ChatDoctorCard({ doctor, onBookAppointment }: ChatDoctorCardProps) {
  const navigate = useNavigate();

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-3 w-3 ${
          i < Math.floor(rating) 
            ? 'fill-yellow-400 text-yellow-400' 
            : i < rating 
            ? 'fill-yellow-200 text-yellow-400' 
            : 'text-gray-300'
        }`}
      />
    ));
  };

  const handleBookAppointment = () => {
    if (onBookAppointment) {
      onBookAppointment(doctor.id);
    } else {
      // Navigate to booking page with doctor info
      navigate(`/book-appointment/${doctor.id}`, {
        state: { doctor }
      });
    }
  };

  // Handle different data structures from AI orchestrator vs database
  const doctorName = doctor.user_profile 
    ? `${doctor.user_profile.first_name} ${doctor.user_profile.last_name}`
    : doctor.name || 'Dr. Unknown';
  
  const specialty = doctor.specialization || doctor.specialty || 'General Practice';
  const rating = doctor.rating || 4.5;
  const reviews = doctor.total_reviews || doctor.reviews || 0;
  const experience = doctor.years_of_experience || doctor.experience || 0;
  const fee = doctor.consultation_fee || doctor.fee || 0;
  const address = doctor.office_address || doctor.address || '';
  const accepting = doctor.is_accepting_patients !== false;

  return (
    <Card className="max-w-sm transition-all duration-200 hover:shadow-md border-l-4 border-l-blue-500">
      <CardContent className="p-3">
        <div className="flex items-start space-x-3">
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${doctor.id}`} />
            <AvatarFallback>
              {doctorName.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="mb-2">
              <h4 className="font-semibold text-sm leading-tight">
                {doctorName.startsWith('Dr.') ? doctorName : `Dr. ${doctorName}`}
              </h4>
              <p className="text-xs text-gray-600">{specialty}</p>
            </div>
            
            {/* Rating and Experience */}
            <div className="flex items-center space-x-3 text-xs text-gray-600 mb-2">
              <div className="flex items-center space-x-1">
                <div className="flex items-center">
                  {renderStars(rating)}
                </div>
                <span className="font-medium">{rating.toFixed(1)}</span>
                <span>({reviews})</span>
              </div>
              {experience > 0 && (
                <div className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  <span>{experience} yrs</span>
                </div>
              )}
            </div>
            
            {/* Fee and Location */}
            <div className="space-y-1 mb-3">
              {fee > 0 && (
                <div className="flex items-center text-xs text-gray-600">
                  <DollarSign className="h-3 w-3 mr-1" />
                  <span>${fee} consultation</span>
                </div>
              )}
              {address && (
                <div className="flex items-center text-xs text-gray-600">
                  <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                  <span className="truncate">{address}</span>
                </div>
              )}
            </div>
            
            {/* Availability Badge */}
            {accepting && (
              <Badge variant="secondary" className="text-green-700 bg-green-100 text-xs mb-2">
                Available
              </Badge>
            )}
            
            {/* Book Appointment Button */}
            <Button
              size="sm"
              className="w-full text-xs"
              disabled={!accepting}
              onClick={handleBookAppointment}
            >
              <Calendar className="h-3 w-3 mr-1" />
              Book Appointment
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}