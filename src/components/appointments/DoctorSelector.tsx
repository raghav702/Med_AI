import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { doctorService } from '@/services/doctor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, 
  Star, 
  MapPin, 
  IndianRupee, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Filter
} from 'lucide-react';
import type { DoctorWithProfile, DoctorSearchFilters } from '@/types/database';

interface DoctorSelectorProps {
  selectedDoctorId: string | null;
  onDoctorSelect: (doctorId: string) => void;
}

const specializations = [
  'General Practice',
  'Internal Medicine',
  'Pediatrics',
  'Cardiology',
  'Dermatology',
  'Orthopedics',
  'Neurology',
  'Psychiatry',
  'Gynecology',
  'Ophthalmology',
  'ENT',
  'Radiology'
];

export function DoctorSelector({ selectedDoctorId, onDoctorSelect }: DoctorSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<DoctorSearchFilters>({
    accepting_patients: true
  });
  const [showFilters, setShowFilters] = useState(false);

  // Fetch doctors
  const { data: doctorsData, isLoading, error } = useQuery({
    queryKey: ['doctors-search', filters, searchQuery],
    queryFn: () => doctorService.searchDoctors(filters, { limit: 20 }),
  });

  const doctors = doctorsData?.data || [];

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

  const filteredDoctors = doctors.filter(doctor => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    const fullName = `${doctor.user_profile.first_name} ${doctor.user_profile.last_name}`.toLowerCase();
    const specialization = doctor.specialization.toLowerCase();
    
    return fullName.includes(query) || specialization.includes(query);
  });

  const DoctorCard = ({ doctor }: { doctor: DoctorWithProfile }) => {
    const isSelected = selectedDoctorId === doctor.id;
    
    return (
      <Card 
        className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
          isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
        }`}
        onClick={() => onDoctorSelect(doctor.id)}
      >
        <CardContent className="pt-4">
          <div className="flex items-start space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${doctor.id}`} />
              <AvatarFallback>
                {doctor.user_profile.first_name?.[0]}{doctor.user_profile.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-lg">
                  Dr. {doctor.user_profile.first_name} {doctor.user_profile.last_name}
                </h3>
                {isSelected && (
                  <Badge variant="default">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Selected
                  </Badge>
                )}
              </div>
              
              <p className="text-gray-600 mb-2">{doctor.specialization}</p>
              
              <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                <div className="flex items-center">
                  {renderStars(doctor.rating)}
                  <span className="ml-1 font-medium">{doctor.rating.toFixed(1)}</span>
                  <span className="ml-1">({doctor.total_reviews})</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  {doctor.years_of_experience || 0} years
                </div>
                <div className="flex items-center">
                  <IndianRupee className="h-4 w-4 mr-1" />
                  ₹{doctor.consultation_fee}
                </div>
              </div>
              
              {doctor.office_address && (
                <div className="flex items-center text-sm text-gray-600 mb-2">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span className="truncate">{doctor.office_address}</span>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {doctor.is_accepting_patients && (
                    <Badge variant="secondary" className="text-green-700 bg-green-100">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Accepting Patients
                    </Badge>
                  )}
                </div>
                
                {isSelected && (
                  <Button size="sm">
                    Continue with Dr. {doctor.user_profile.last_name}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Choose Your Doctor</h3>
        <p className="text-sm text-gray-600">
          Select a healthcare provider to book your appointment with
        </p>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by doctor name or specialization..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filter Toggle */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
              <span className="text-sm text-gray-600">
                {filteredDoctors.length} doctors found
              </span>
            </div>

            {/* Filters */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="text-sm font-medium mb-2 block">Specialization</label>
                  <Select
                    value={filters.specialization || ''}
                    onValueChange={(value) => 
                      setFilters(prev => ({ ...prev, specialization: value || undefined }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All specializations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All specializations</SelectItem>
                      {specializations.map((spec) => (
                        <SelectItem key={spec} value={spec}>
                          {spec}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Max Consultation Fee</label>
                  <Select
                    value={filters.max_consultation_fee?.toString() || ''}
                    onValueChange={(value) => 
                      setFilters(prev => ({ 
                        ...prev, 
                        max_consultation_fee: value ? parseInt(value) : undefined 
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any price" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any price</SelectItem>
                      <SelectItem value="100">Under $100</SelectItem>
                      <SelectItem value="200">Under $200</SelectItem>
                      <SelectItem value="300">Under $300</SelectItem>
                      <SelectItem value="500">Under $500</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Minimum Rating</label>
                  <Select
                    value={filters.min_rating?.toString() || ''}
                    onValueChange={(value) => 
                      setFilters(prev => ({ 
                        ...prev, 
                        min_rating: value ? parseFloat(value) : undefined 
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any rating" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any rating</SelectItem>
                      <SelectItem value="4.5">4.5+ stars</SelectItem>
                      <SelectItem value="4.0">4.0+ stars</SelectItem>
                      <SelectItem value="3.5">3.5+ stars</SelectItem>
                      <SelectItem value="3.0">3.0+ stars</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load doctors. Please try again.
          </AlertDescription>
        </Alert>
      ) : filteredDoctors.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Search className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">No Doctors Found</h3>
            <p className="text-gray-600">
              Try adjusting your search criteria or filters to find more doctors.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredDoctors.map((doctor) => (
            <DoctorCard key={doctor.id} doctor={doctor} />
          ))}
        </div>
      )}
    </div>
  );
}