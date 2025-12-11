import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { doctorService } from '@/services/doctor';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppointmentBooking } from '@/components/appointments';
import { 
  Star, 
  MapPin, 
  IndianRupee, 
  Clock, 
  Phone, 
  Mail, 
  Calendar, 
  Award, 
  GraduationCap, 
  Languages,
  CheckCircle,
  MessageSquare,
  Globe,
  Building,
  Link as LinkIcon
} from 'lucide-react';

interface DoctorProfileDialogProps {
  doctorId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DoctorProfileDialog({ doctorId, open, onOpenChange }: DoctorProfileDialogProps) {
  const [showBooking, setShowBooking] = useState(false);
  
  const { data: doctor, isLoading, error } = useQuery({
    queryKey: ['doctor', doctorId],
    queryFn: () => doctorService.getDoctorWithProfile(doctorId),
    enabled: open && !!doctorId,
  });

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

  const mockReviews = [
    {
      id: '1',
      patientName: 'Sarah M.',
      rating: 5,
      date: '2024-01-15',
      comment: 'Dr. Smith was very thorough and explained everything clearly. Highly recommend!'
    },
    {
      id: '2',
      patientName: 'John D.',
      rating: 4,
      date: '2024-01-10',
      comment: 'Great experience overall. The doctor was professional and knowledgeable.'
    },
    {
      id: '3',
      patientName: 'Emily R.',
      rating: 5,
      date: '2024-01-05',
      comment: 'Excellent care and very compassionate. Made me feel comfortable throughout the visit.'
    }
  ];

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error || !doctor) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load doctor profile. Please try again.
            </AlertDescription>
          </Alert>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">Doctor Profile</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${doctor.id}`} />
              <AvatarFallback className="text-lg">
                {doctor.name?.[0] || 'D'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-2xl font-bold">
                  {doctor.name}
                </h1>
              </div>
              
              <p className="text-lg text-gray-600 mb-2">{doctor.specialty}</p>
              
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                {doctor.aggregate_rating !== null && doctor.aggregate_rating !== undefined && (
                  <div className="flex items-center">
                    {renderStars(doctor.aggregate_rating)}
                    <span className="ml-2 font-medium">{doctor.aggregate_rating.toFixed(1)}</span>
                    <span className="ml-1">({doctor.review_count} reviews)</span>
                  </div>
                )}
                {doctor.experience !== null && doctor.experience !== undefined && (
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {doctor.experience} years experience
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Main Content */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="experience">Experience</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
              <TabsTrigger value="availability">Availability</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Contact & Location
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {doctor.address && (
                      <div className="flex items-start space-x-2">
                        <MapPin className="h-4 w-4 mt-0.5 text-gray-500" />
                        <span className="text-sm">{doctor.address}</span>
                      </div>
                    )}
                    {(doctor.lat !== null && doctor.lat !== undefined && doctor.lng !== null && doctor.lng !== undefined) && (
                      <div className="flex items-center space-x-2">
                        <Globe className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">
                          Coordinates: {doctor.lat.toFixed(4)}, {doctor.lng.toFixed(4)}
                        </span>
                      </div>
                    )}
                    {doctor.works_for && (
                      <div className="flex items-center space-x-2">
                        <Building className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{doctor.works_for}</span>
                      </div>
                    )}
                    {doctor.url && (
                      <div className="flex items-center space-x-2">
                        <LinkIcon className="h-4 w-4 text-gray-500" />
                        <a 
                          href={doctor.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          Visit Website
                        </a>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Consultation Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Consultation Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {doctor.price_range !== null && doctor.price_range !== undefined && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Price Range</span>
                        <span className="font-medium">₹{doctor.price_range.toFixed(2)}</span>
                      </div>
                    )}
                    {doctor.experience !== null && doctor.experience !== undefined && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Experience</span>
                        <span className="font-medium">{doctor.experience} years</span>
                      </div>
                    )}
                    {doctor.aggregate_rating !== null && doctor.aggregate_rating !== undefined && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Rating</span>
                        <span className="font-medium">{doctor.aggregate_rating.toFixed(2)} / 5.0</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Reviews</span>
                      <span className="font-medium">{doctor.review_count}</span>
                    </div>
                    {doctor.available_service && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Services</span>
                        <span className="font-medium text-sm">{doctor.available_service}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Opening Hours */}
              {doctor.opening_hours && doctor.opening_hours.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Opening Hours
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {doctor.opening_hours.map((hours, index) => (
                        <div key={index} className="flex items-center space-x-2 text-sm">
                          <Badge variant="outline" className="w-8 justify-center">
                            {hours.substring(0, 2)}
                          </Badge>
                          <span className="text-gray-700">{hours.substring(3)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Qualifications */}
              {doctor.qualifications && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      Qualifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 leading-relaxed">{doctor.qualifications}</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="experience" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Professional Experience
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {doctor.experience !== null && doctor.experience !== undefined && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Years of Experience</p>
                      <p className="text-lg font-medium">{doctor.experience} years</p>
                    </div>
                  )}
                  {doctor.qualifications && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Qualifications</p>
                      <p className="text-gray-700">{doctor.qualifications}</p>
                    </div>
                  )}
                  {doctor.works_for && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Works For</p>
                      <p className="text-gray-700">{doctor.works_for}</p>
                    </div>
                  )}
                  {doctor.available_service && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Available Services</p>
                      <p className="text-gray-700">{doctor.available_service}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="reviews" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Patient Reviews</h3>
                  {doctor.aggregate_rating !== null && doctor.aggregate_rating !== undefined && (
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="flex items-center">
                        {renderStars(doctor.aggregate_rating)}
                      </div>
                      <span className="font-medium">{doctor.aggregate_rating.toFixed(1)}</span>
                      <span className="text-gray-500">({doctor.review_count} reviews)</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-4">
                {mockReviews.map((review) => (
                  <Card key={review.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-sm">{review.patientName}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <div className="flex items-center">
                              {renderStars(review.rating)}
                            </div>
                            <span className="text-xs text-gray-500">{review.date}</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700">{review.comment}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="availability">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Availability
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {doctor.opening_hours && doctor.opening_hours.length > 0 ? (
                    <div>
                      <p className="text-sm text-gray-600 mb-3">Opening Hours:</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {doctor.opening_hours.map((hours, index) => (
                          <div key={index} className="flex items-center space-x-2 text-sm">
                            <Badge variant="outline" className="w-8 justify-center">
                              {hours.substring(0, 2)}
                            </Badge>
                            <span className="text-gray-700">{hours.substring(3)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-600">
                      Click "Book Appointment" to view available time slots and schedule your consultation.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4 border-t">
            <Button 
              className="flex-1"
              disabled={!doctor.is_accepting_patients}
              onClick={() => setShowBooking(true)}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Book Appointment
            </Button>
            <Button variant="outline" className="flex-1">
              <MessageSquare className="h-4 w-4 mr-2" />
              Send Message
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Appointment Booking Dialog */}
      {showBooking && (
        <AppointmentBooking
          doctorId={doctorId}
          open={showBooking}
          onOpenChange={setShowBooking}
          onBookingComplete={() => {
            setShowBooking(false);
            onOpenChange(false);
          }}
        />
      )}
    </Dialog>
  );
}