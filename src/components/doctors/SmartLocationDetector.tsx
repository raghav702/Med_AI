import React, { useState, useEffect } from 'react';
import { MapPin, Loader2, AlertCircle, Navigation, Wifi } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  getUserLocation, 
  getLocationFromIP, 
  getLocationWithFallback,
  type UserLocation 
} from '@/utils/geolocation';

interface SmartLocationDetectorProps {
  onLocationDetected: (location: UserLocation) => void;
  onError?: (error: string) => void;
  autoDetect?: boolean;
}

type LocationMethod = 'gps' | 'ip' | 'manual' | 'none';

export const SmartLocationDetector: React.FC<SmartLocationDetectorProps> = ({
  onLocationDetected,
  onError,
  autoDetect = true
}) => {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<LocationMethod>('none');
  const [permissionStatus, setPermissionStatus] = useState<'unknown' | 'granted' | 'denied'>('unknown');

  // Check location permission status
  useEffect(() => {
    const checkPermission = async () => {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        setPermissionStatus(permission.state === 'granted' ? 'granted' : 'denied');
        
        // Listen for permission changes
        permission.onchange = () => {
          setPermissionStatus(permission.state === 'granted' ? 'granted' : 'denied');
        };
      } catch (error) {
        console.warn('Permission API not supported');
      }
    };

    checkPermission();
  }, []);

  // Auto-detect location on component mount
  useEffect(() => {
    if (autoDetect && !location && !loading) {
      handleAutoDetect();
    }
  }, [autoDetect]);

  const handleAutoDetect = async () => {
    setLoading(true);
    setError(null);

    try {
      const detectedLocation = await getLocationWithFallback();
      setLocation(detectedLocation);
      setMethod(detectedLocation.accuracy && detectedLocation.accuracy < 1000 ? 'gps' : 'ip');
      onLocationDetected(detectedLocation);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to detect location';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGPSLocation = async () => {
    setLoading(true);
    setError(null);

    try {
      const gpsLocation = await getUserLocation();
      setLocation(gpsLocation);
      setMethod('gps');
      onLocationDetected(gpsLocation);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'GPS location failed';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleIPLocation = async () => {
    setLoading(true);
    setError(null);

    try {
      const ipLocation = await getLocationFromIP();
      setLocation(ipLocation);
      setMethod('ip');
      onLocationDetected(ipLocation);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'IP location failed';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getMethodBadge = () => {
    switch (method) {
      case 'gps':
        return (
          <Badge variant="default" className="flex items-center gap-1">
            <Navigation className="w-3 h-3" />
            GPS Location
          </Badge>
        );
      case 'ip':
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Wifi className="w-3 h-3" />
            IP Location
          </Badge>
        );
      default:
        return null;
    }
  };

  const getAccuracyText = () => {
    if (!location?.accuracy) return '';
    
    if (location.accuracy < 100) {
      return `±${Math.round(location.accuracy)}m accuracy`;
    } else if (location.accuracy < 1000) {
      return `±${Math.round(location.accuracy / 100) / 10}km accuracy`;
    } else {
      return `±${Math.round(location.accuracy / 1000)}km accuracy`;
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Location Detection
            </h3>
            {getMethodBadge()}
          </div>

          {/* Current Location Display */}
          {location && (
            <Alert>
              <MapPin className="w-4 h-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <div>
                    <strong>Current Location:</strong> {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                  </div>
                  {location.accuracy && (
                    <div className="text-sm text-muted-foreground">
                      {getAccuracyText()}
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Location Permission Status */}
          {permissionStatus === 'denied' && (
            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                Location access is blocked. You can still use IP-based location or enter coordinates manually.
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleAutoDetect}
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <MapPin className="w-4 h-4" />
              )}
              Auto-Detect Location
            </Button>

            <Button
              onClick={handleGPSLocation}
              disabled={loading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Navigation className="w-4 h-4" />
              Use GPS
            </Button>

            <Button
              onClick={handleIPLocation}
              disabled={loading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Wifi className="w-4 h-4" />
              Use IP Location
            </Button>
          </div>

          {/* Location Method Explanation */}
          <div className="text-sm text-muted-foreground space-y-2">
            <div><strong>Auto-Detect:</strong> Tries GPS first, falls back to IP location</div>
            <div><strong>GPS:</strong> Most accurate (±10-100m) but requires permission</div>
            <div><strong>IP Location:</strong> Less accurate (±1-10km) but works without permission</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SmartLocationDetector;