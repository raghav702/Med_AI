import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { 
  Calendar, 
  Clock, 
  IndianRupee, 
  MapPin, 
  User,
  FileText,
  MessageSquare,
  CreditCard,
  Shield,
  AlertCircle,
  CheckCircle,
  Star
} from 'lucide-react';
import { format } from 'date-fns';
import type { DoctorWithProfile } from '@/types/database';

interface BookingData {
  selectedDate: string | null;
  selectedTime: string | null;
  reasonForVisit: string;
  symptoms: string;
  patientNotes: string;
  duration: number;
}

interface BookingConfirmationProps {
  doctor: DoctorWithProfile;
  bookingData: BookingData;
  onConfirm: () => void;
  isLoading: boolean;
}

export function BookingConfirmation({ 
  doctor, 
  bookingData, 
  onConfirm, 
  isLoading 
}: BookingConfirmationProps) {
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToCancellation, setAgreedToCancellation] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'insurance' | 'cash'>('card');

  const canConfirm = agreedToTerms && agreedToCancellation && !isLoading;

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

  const calculateTotal = () => {
    const baseFee = doctor.consultation_fee;
    const platformFee = Math.round(baseFee * 0.05); // 5% platform fee
    const total = baseFee + platformFee;
    
    return {
      baseFee,
      platformFee,
      total
    };
  };

  const { baseFee, platformFee, total } = calculateTotal();

  return (
    <div className="space-y-6">
      {/* Booking Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Confirm Your Appointment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Doctor Info */}
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${doctor.id}`} />
              <AvatarFallback>
                {doctor.user_profile.first_name?.[0]}{doctor.user_profile.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <h3 className="text-lg font-semibold">
                Dr. {doctor.user_profile.first_name} {doctor.user_profile.last_name}
              </h3>
              <p className="text-gray-600">{doctor.specialization}</p>
              <div className="flex items-center space-x-2 mt-1">
                <div className="flex items-center">
                  {renderStars(doctor.rating)}
                </div>
                <span className="text-sm text-gray-600">
                  {doctor.rating.toFixed(1)} ({doctor.total_reviews} reviews)
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Appointment Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="font-medium">Date</p>
                  <p className="text-gray-600">
                    {bookingData.selectedDate ? 
                      format(new Date(bookingData.selectedDate), 'EEEE, MMMM d, yyyy') : 
                      'Not selected'
                    }
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Clock className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="font-medium">Time</p>
                  <p className="text-gray-600">{bookingData.selectedTime}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <User className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="font-medium">Duration</p>
                  <p className="text-gray-600">{bookingData.duration} minutes</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <FileText className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="font-medium">Reason for Visit</p>
                  <p className="text-gray-600">{bookingData.reasonForVisit}</p>
                </div>
              </div>
              
              {doctor.office_address && (
                <div className="flex items-start space-x-3">
                  <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Location</p>
                    <p className="text-gray-600">{doctor.office_address}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Additional Information */}
          {(bookingData.symptoms || bookingData.patientNotes) && (
            <>
              <Separator />
              <div className="space-y-3">
                {bookingData.symptoms && (
                  <div className="flex items-start space-x-3">
                    <MessageSquare className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Symptoms</p>
                      <p className="text-gray-600">{bookingData.symptoms}</p>
                    </div>
                  </div>
                )}
                
                {bookingData.patientNotes && (
                  <div className="flex items-start space-x-3">
                    <FileText className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Additional Notes</p>
                      <p className="text-gray-600">{bookingData.patientNotes}</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Payment Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Consultation Fee</span>
              <span>₹{baseFee}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Platform Fee</span>
              <span>₹{platformFee}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>₹{total}</span>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-3">
            <p className="font-medium">Payment Method</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Button
                variant={paymentMethod === 'card' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPaymentMethod('card')}
                className="justify-start"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Credit Card
              </Button>
              <Button
                variant={paymentMethod === 'insurance' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPaymentMethod('insurance')}
                className="justify-start"
              >
                <Shield className="h-4 w-4 mr-2" />
                Insurance
              </Button>
              <Button
                variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPaymentMethod('cash')}
                className="justify-start"
              >
                <IndianRupee className="h-4 w-4 mr-2" />
                Pay at Visit
              </Button>
            </div>
          </div>

          {paymentMethod === 'card' && (
            <Alert>
              <CreditCard className="h-4 w-4" />
              <AlertDescription>
                Payment will be processed after the doctor approves your appointment request.
              </AlertDescription>
            </Alert>
          )}

          {paymentMethod === 'insurance' && (
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Please bring your insurance card to the appointment. Coverage will be verified with your provider.
              </AlertDescription>
            </Alert>
          )}

          {paymentMethod === 'cash' && (
            <Alert>
              <IndianRupee className="h-4 w-4" />
              <AlertDescription>
                Payment of ₹{total} will be due at the time of your visit. Cash, check, or card accepted.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Terms and Conditions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Terms and Conditions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="terms"
              checked={agreedToTerms}
              onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
            />
            <div className="text-sm">
              <label htmlFor="terms" className="cursor-pointer">
                I agree to the{' '}
                <button type="button" className="text-blue-600 hover:underline">
                  Terms of Service
                </button>{' '}
                and{' '}
                <button type="button" className="text-blue-600 hover:underline">
                  Privacy Policy
                </button>
              </label>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="cancellation"
              checked={agreedToCancellation}
              onCheckedChange={(checked) => setAgreedToCancellation(checked as boolean)}
            />
            <div className="text-sm">
              <label htmlFor="cancellation" className="cursor-pointer">
                I understand the{' '}
                <button type="button" className="text-blue-600 hover:underline">
                  cancellation policy
                </button>{' '}
                and agree to provide at least 24 hours notice for cancellations
              </label>
            </div>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> This is an appointment request. The doctor will review and approve your request. 
              You will receive a confirmation notification once approved.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <Button
          onClick={onConfirm}
          disabled={!canConfirm}
          size="lg"
          className="min-w-[150px]"
        >
          {isLoading ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Booking...
            </>
          ) : (
            'Confirm Booking'
          )}
        </Button>
      </div>
    </div>
  );
}