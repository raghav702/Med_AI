import React, { useState } from 'react';
import { MapPin, Stethoscope, Star, Clock, DollarSign, Building, Navigation } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useNearestDoctors } from '@/hooks/useNearestDoctors';
import { formatDistance } from '@/utils/geolocation';

const specialties = [
  'General Physician',
  'Cardiologist',
  'Dermatologist',
  'ENT',
  'Orthopedist',
  'Neurologist',
  'Psychiatrist',
  'Pediatrician',
  'Gynecologist',
  'Ophthalmologist'
];

export const NearestDoctorsDemo: React.FC = () => {
  const {
    doctors,
    loading,
    error,
    userLocation,
    searchParams,
    findDoctors,
    findDoctorsWithCoords,
    getUserLocationOnly,
    clearResults
  } = useNearestDoctors();

  const [searchForm, setSearchForm] = useState({
    specialty: 'General Physician',
    radius: '25',
    limit: '5',
    manualLat: '',
    manualLon: ''
  });

  const handleAutoSearch = async () => {
    await findDoctors(
      searchForm.specialty,
      parseFloat(searchForm.radius),
      parseInt(searchForm.limit)
    );
  };

  const handleManualSearch = async () => {
    if (!searchForm.manualLat || !searchForm.manualLon) {
      alert('Please enter both latitude and longitude');
      return;
    }

    await findDoctorsWithCoords(
      parseFloat(searchForm.manualLat),
      parseFloat(searchForm.manualLon),
      searchForm.specialty,
      parseFloat(searchForm.radius),
      parseInt(searchForm.limit)
    );
  };

  const handleGetLocation = async () => {
    await getUserLocationOnly();
  };

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Find Nearest Doctors</h1>
        <p className="text-muted-foreground">
          Discover healthcare providers near you using GPS coordinates
        </p>
      </div>

      {/* Search Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="w-5 h-5" />
            Search Parameters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="specialty">Specialty</Label>
              <Select
                value={searchForm.specialty}
                onValueChange={(value) => setSearchForm(prev => ({ ...prev, specialty: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {specialties.map(specialty => (
                    <SelectItem key={specialty} value={specialty}>
                      {specialty}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="radius">Radius (km)</Label>
              <Input
                id="radius"
                type="number"
                min="1"
                max="100"
                value={searchForm.radius}
                onChange={(e) => setSearchForm(prev => ({ ...prev, radius: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="limit">Max Results</Label>
              <Input
                id="limit"
                type="number"
                min="1"
                max="20"
                value={searchForm.limit}
                onChange={(e) => setSearchForm(prev => ({ ...prev, limit: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={handleAutoSearch}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <MapPin className="w-4 h-4" />
              {loading ? 'Searching...' : 'Find Using My Location'}
            </Button>

            <Button
              onClick={handleGetLocation}
              disabled={loading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Navigation className="w-4 h-4" />
              Get My Location
            </Button>

            <Button
              onClick={clearResults}
              variant="outline"
              disabled={loading}
            >
              Clear Results
            </Button>
          </div>

          {/* Manual Coordinates */}
          <div className="border-t pt-4">
            <Label className="text-sm font-medium">Manual Coordinates (Optional)</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
              <div>
                <Label htmlFor="lat" className="text-xs">Latitude</Label>
                <Input
                  id="lat"
                  type="number"
                  step="any"
                  placeholder="28.6139"
                  value={searchForm.manualLat}
                  onChange={(e) => setSearchForm(prev => ({ ...prev, manualLat: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="lon" className="text-xs">Longitude</Label>
                <Input
                  id="lon"
                  type="number"
                  step="any"
                  placeholder="77.2090"
                  value={searchForm.manualLon}
                  onChange={(e) => setSearchForm(prev => ({ ...prev, manualLon: e.target.value }))}
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleManualSearch}
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  Search Here
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Location Display */}
      {userLocation && (
        <Alert>
          <MapPin className="w-4 h-4" />
          <AlertDescription>
            <strong>Your Location:</strong> {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
            {userLocation.accuracy && (
              <span className="text-muted-foreground ml-2">
                (±{Math.round(userLocation.accuracy)}m accuracy)
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Search Results */}
      {searchParams && (
        <div className="text-sm text-muted-foreground">
          Showing results for <strong>{searchParams.specialty}</strong> within{' '}
          <strong>{searchParams.radius_km}km</strong>
        </div>
      )}

      {/* Doctors List */}
      {doctors.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {doctors.map((doctor, index) => (
            <Card key={doctor.id || index} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">{doctor.name}</h3>
                      <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
                    </div>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {formatDistance(doctor.distance_km)}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Building className="w-4 h-4" />
                      <span>{doctor.works_for}</span>
                    </div>

                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span className="line-clamp-2">{doctor.address}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-500" />
                        <span>{doctor.rating || 'N/A'}/5</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{doctor.experience || 'N/A'} years</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-muted-foreground">
                      <DollarSign className="w-4 h-4" />
                      <span>₹{doctor.price_range || 'N/A'}</span>
                    </div>
                  </div>

                  <Button className="w-full" size="sm">
                    <Stethoscope className="w-4 h-4 mr-2" />
                    Book Appointment
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* No Results */}
      {!loading && doctors.length === 0 && searchParams && (
        <Card>
          <CardContent className="p-8 text-center">
            <Stethoscope className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Doctors Found</h3>
            <p className="text-muted-foreground">
              No doctors found for {searchParams.specialty} within {searchParams.radius_km}km.
              Try increasing the search radius or selecting a different specialty.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default NearestDoctorsDemo;