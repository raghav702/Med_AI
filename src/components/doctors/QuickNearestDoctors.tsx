import React, { useState } from 'react';
import { MapPin, Stethoscope, Star, Navigation, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNearestDoctors } from '@/hooks/useNearestDoctors';
import { formatDistance } from '@/utils/geolocation';

interface QuickNearestDoctorsProps {
  specialty?: string;
  radius?: number;
  limit?: number;
  autoStart?: boolean;
}

export const QuickNearestDoctors: React.FC<QuickNearestDoctorsProps> = ({
  specialty = 'General Physician',
  radius = 25,
  limit = 5,
  autoStart = false
}) => {
  const { doctors, loading, error, findDoctorsAuto } = useNearestDoctors();
  const [hasStarted, setHasStarted] = useState(autoStart);

  React.useEffect(() => {
    if (autoStart && !hasStarted) {
      handleFindDoctors();
      setHasStarted(true);
    }
  }, [autoStart, hasStarted]);

  const handleFindDoctors = async () => {
    await findDoctorsAuto(specialty, radius, limit);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <h3 className="font-semibold mb-2">Finding Nearest Doctors</h3>
          <p className="text-muted-foreground text-sm">
            Detecting your location and searching for {specialty.toLowerCase()}s nearby...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={handleFindDoctors} className="w-full">
            <Navigation className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (doctors.length === 0 && !hasStarted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5" />
            Find Nearest {specialty}s
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Automatically detect your location and find the closest {specialty.toLowerCase()}s within {radius}km.
          </p>
          <Button onClick={handleFindDoctors} className="w-full">
            <MapPin className="w-4 h-4 mr-2" />
            Find Doctors Near Me
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with retry button */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">
          Nearest {specialty}s ({doctors.length} found)
        </h3>
        <Button onClick={handleFindDoctors} variant="outline" size="sm">
          <Navigation className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Doctors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {doctors.map((doctor, index) => (
          <Card key={doctor.id || index} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm">{doctor.name}</h4>
                    <p className="text-xs text-muted-foreground">{doctor.specialty}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {formatDistance(doctor.distance_km)}
                  </Badge>
                </div>

                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-500" />
                    <span>{doctor.rating || 'N/A'}/5</span>
                    <span>•</span>
                    <span>{doctor.experience || 'N/A'} years</span>
                  </div>
                  
                  <div className="line-clamp-2">{doctor.address}</div>
                  
                  <div className="font-medium text-foreground">
                    ₹{doctor.price_range || 'N/A'}
                  </div>
                </div>

                <Button size="sm" className="w-full text-xs">
                  Book Appointment
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {doctors.length === 0 && hasStarted && (
        <Card>
          <CardContent className="p-6 text-center">
            <Stethoscope className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">
              No {specialty.toLowerCase()}s found within {radius}km. Try increasing the search radius.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default QuickNearestDoctors;