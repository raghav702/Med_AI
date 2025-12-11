import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { doctorService } from '@/services/doctor';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday, isBefore, startOfDay } from 'date-fns';
import { CalendarViewSkeleton } from '@/components/ui/skeleton-appointments';

interface CalendarViewProps {
  doctorId: string;
  selectedDate: string | null;
  onDateSelect: (date: string) => void;
}

interface DayAvailability {
  date: string;
  isAvailable: boolean;
  availableSlots: number;
  dayOfWeek: string;
}

export function CalendarView({ doctorId, selectedDate, onDateSelect }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'week'>('calendar');

  // Fetch doctor availability
  const { data: availability, isLoading, error } = useQuery({
    queryKey: ['doctor-availability', doctorId],
    queryFn: () => doctorService.getDoctorAvailability(doctorId),
    enabled: !!doctorId,
  });

  // Generate availability data for the current month
  const generateAvailabilityData = (): DayAvailability[] => {
    if (!availability) return [];

    const today = startOfDay(new Date());
    const startDate = startOfDay(currentMonth);
    const endDate = addDays(startDate, 42); // 6 weeks view
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    return days.map(day => {
      const dayOfWeek = format(day, 'EEEE').toLowerCase();
      const dayAvailability = availability.find(a => 
        a.day_of_week === dayOfWeek && a.is_available
      );

      // Don't allow booking for past dates
      const isPastDate = isBefore(day, today);
      
      // Calculate available slots (mock calculation - in real app, this would check existing appointments)
      const availableSlots = dayAvailability && !isPastDate ? 
        Math.floor(Math.random() * 8) + 2 : 0; // Mock 2-10 slots

      return {
        date: format(day, 'yyyy-MM-dd'),
        isAvailable: !!dayAvailability && !isPastDate && availableSlots > 0,
        availableSlots,
        dayOfWeek: format(day, 'EEEE')
      };
    });
  };

  const availabilityData = generateAvailabilityData();

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
    const dateString = format(date, 'yyyy-MM-dd');
    const dayData = availabilityData.find(d => d.date === dateString);
    
    if (dayData?.isAvailable) {
      onDateSelect(dateString);
    }
  };

  const getWeekDays = () => {
    const start = startOfWeek(currentMonth);
    const end = endOfWeek(currentMonth);
    return eachDayOfInterval({ start, end });
  };

  const isDateAvailable = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    const dayData = availabilityData.find(d => d.date === dateString);
    return dayData?.isAvailable || false;
  };

  const isDateSelected = (date: Date) => {
    if (!selectedDate) return false;
    return format(date, 'yyyy-MM-dd') === selectedDate;
  };

  if (isLoading) {
    return <CalendarViewSkeleton />;
  }

  if (error || !availability) {
    return (
      <Card>
        <CardContent className="py-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load doctor availability. Please try again.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (availability.length === 0) {
    return (
      <Card>
        <CardContent className="py-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This doctor has not set their availability yet. Please try again later or contact the doctor directly.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
        <div className="text-center sm:text-left">
          <h3 className="text-lg font-semibold">Select Appointment Date</h3>
          <p className="text-sm text-gray-600">Choose a date when the doctor is available</p>
        </div>
        
        <div className="flex items-center space-x-2 mx-auto sm:mx-0">
          <Button
            variant={viewMode === 'calendar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('calendar')}
            className="touch-manipulation"
            aria-pressed={viewMode === 'calendar'}
          >
            <CalendarIcon className="h-4 w-4 mr-1" aria-hidden="true" />
            Month
          </Button>
          <Button
            variant={viewMode === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('week')}
            className="touch-manipulation"
            aria-pressed={viewMode === 'week'}
          >
            <Clock className="h-4 w-4 mr-1" aria-hidden="true" />
            Week
          </Button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
              <span className="text-lg sm:text-xl">{format(currentMonth, 'MMMM yyyy')}</span>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonth(prev => addDays(prev, -30))}
                  className="touch-manipulation"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonth(prev => addDays(prev, 30))}
                  className="touch-manipulation"
                  aria-label="Next month"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate ? new Date(selectedDate) : undefined}
              onSelect={handleDateSelect}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              disabled={(date) => !isDateAvailable(date)}
              modifiers={{
                available: (date) => isDateAvailable(date),
                selected: (date) => isDateSelected(date),
                today: (date) => isToday(date)
              }}
              modifiersStyles={{
                available: {
                  backgroundColor: '#dcfce7',
                  color: '#166534'
                },
                selected: {
                  backgroundColor: '#3b82f6',
                  color: 'white'
                }
              }}
              className="rounded-md border w-full"
              components={{
                // Enhanced touch targets for mobile
                DayContent: ({ date, ...props }) => (
                  <div 
                    {...props}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
                  >
                    {date.getDate()}
                  </div>
                )
              }}
            />
            
            {/* Legend */}
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-6 mt-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded bg-green-200" aria-hidden="true"></div>
                <span>Available</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded bg-gray-200" aria-hidden="true"></div>
                <span>Unavailable</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded bg-blue-500" aria-hidden="true"></div>
                <span>Selected</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Week of {format(startOfWeek(currentMonth), 'MMM d, yyyy')}</span>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonth(prev => addDays(prev, -7))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonth(prev => addDays(prev, 7))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {getWeekDays().map((day) => {
                const dateString = format(day, 'yyyy-MM-dd');
                const dayData = availabilityData.find(d => d.date === dateString);
                const isSelected = selectedDate === dateString;
                const isAvailable = dayData?.isAvailable || false;
                const isPast = isBefore(day, startOfDay(new Date()));
                
                return (
                  <Card 
                    key={dateString}
                    className={`cursor-pointer transition-all duration-200 touch-manipulation min-h-[80px] sm:min-h-[100px] ${
                      isSelected 
                        ? 'ring-2 ring-blue-500 bg-blue-50' 
                        : isAvailable 
                        ? 'hover:bg-green-50 border-green-200 focus-within:ring-2 focus-within:ring-green-500' 
                        : 'opacity-50 cursor-not-allowed'
                    }`}
                    onClick={() => isAvailable && onDateSelect(dateString)}
                    role="button"
                    tabIndex={isAvailable ? 0 : -1}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ' ') && isAvailable) {
                        e.preventDefault();
                        onDateSelect(dateString);
                      }
                    }}
                    aria-label={`${isAvailable ? 'Select' : 'Unavailable'} ${format(day, 'EEEE, MMMM d')}, ${dayData?.availableSlots || 0} slots available`}
                  >
                    <CardContent className="p-2 sm:p-3 text-center h-full flex flex-col justify-center">
                      <div className="text-xs text-gray-500 mb-1">
                        {format(day, 'EEE')}
                      </div>
                      <div className={`text-base sm:text-lg font-semibold mb-1 ${
                        isToday(day) ? 'text-blue-600' : 
                        isPast ? 'text-gray-400' : 
                        isAvailable ? 'text-green-600' : 'text-gray-400'
                      }`}>
                        {format(day, 'd')}
                      </div>
                      {isAvailable && (
                        <Badge variant="secondary" className="text-xs">
                          {dayData?.availableSlots} slots
                        </Badge>
                      )}
                      {isPast && !isAvailable && (
                        <div className="text-xs text-gray-400">Past</div>
                      )}
                      {!isPast && !isAvailable && (
                        <div className="text-xs text-gray-400">Unavailable</div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Doctor's Weekly Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Doctor's Weekly Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {availability.map((schedule) => (
              <div 
                key={schedule.id}
                className={`p-3 rounded-lg border touch-manipulation ${
                  schedule.is_available 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-gray-50 border-gray-200'
                }`}
                role="presentation"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium capitalize">
                    {schedule.day_of_week}
                  </span>
                  {schedule.is_available ? (
                    <Badge variant="secondary" className="text-green-700 bg-green-100">
                      Available
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      Unavailable
                    </Badge>
                  )}
                </div>
                {schedule.is_available && (
                  <div className="text-sm text-gray-600">
                    <time dateTime={schedule.start_time}>
                      {schedule.start_time}
                    </time>
                    {' - '}
                    <time dateTime={schedule.end_time}>
                      {schedule.end_time}
                    </time>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}