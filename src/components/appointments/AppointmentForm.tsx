import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  FileText, 
  Calendar,
  Clock,
  MessageSquare
} from 'lucide-react';

interface BookingData {
  selectedDate: string | null;
  selectedTime: string | null;
  reason: string;
  patientNotes: string;
}

interface AppointmentFormProps {
  bookingData: BookingData;
  onDataChange: (data: Partial<BookingData>) => void;
  onNext: () => void;
}

export function AppointmentForm({ bookingData, onDataChange, onNext }: AppointmentFormProps) {
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!bookingData.reason || !bookingData.reason.trim()) {
      newErrors.reason = 'Please specify the reason for your visit';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onNext();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Appointment Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Appointment Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <div>
                <p className="font-medium">Date</p>
                <p className="text-gray-600">
                  {bookingData.selectedDate || 'Not selected'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <div>
                <p className="font-medium">Time</p>
                <p className="text-gray-600">{bookingData.selectedTime || 'Not selected'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reason for Visit */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Appointment Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="reason">Reason for visit *</Label>
            <Textarea
              id="reason"
              placeholder="Please describe the reason for your visit..."
              value={bookingData.reason || ''}
              onChange={(e) => onDataChange({ reason: e.target.value })}
              className="mt-2"
              rows={3}
              required
            />
            {errors.reason && (
              <p className="text-sm text-red-600 mt-1">{errors.reason}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              This helps the doctor prepare for your visit
            </p>
          </div>

          <div>
            <Label htmlFor="notes">Additional notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any specific questions or concerns you'd like to discuss..."
              value={bookingData.patientNotes || ''}
              onChange={(e) => onDataChange({ patientNotes: e.target.value })}
              className="mt-2"
              rows={3}
            />
            <p className="text-xs text-gray-500 mt-1">
              Optional: Share any questions or concerns you have
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <Button type="submit" size="lg">
          Continue to Confirmation
        </Button>
      </div>
    </form>
  );
}