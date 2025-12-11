import React, { useState } from 'react';
import { MapPin, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface LocationTestState {
  status: 'idle' | 'requesting' | 'success' | 'error';
  location: { lat: number; lon: number; accuracy: number } | null;
  error: string | null;
  permissionState: string | null;
  method: 'gps' | 'ip' | null;
}

export const LocationTest: React.FC = () => {
  const [state, setState] = useState<LocationTestState>({
    status: 'idle',
    location: null,
    error: null,
    permissionState: null,
    method: null
  });

  const testGPSLocation = async () => {
    setState(prev => ({ ...prev, status: 'requesting', error: null, method: 'gps' }));

    // Check permission first
    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      setState(prev => ({ ...prev, permissionState: permission.state }));
    } catch (e) {
      console.log('Permission API not supported');
    }

    // Request location
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: 'Geolocation is not supported by this browser'
      }));
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState(prev => ({
          ...prev,
          status: 'success',
          location: {
            lat: position.coords.latitude,
            lon: position.coords.longitude,
            accuracy: position.coords.accuracy
          }
        }));
      },
      (error) => {
        let errorMessage = 'Unknown error';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'User denied the request for Geolocation';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'The request to get user location timed out';
            break;
        }
        
        setState(prev => ({
          ...prev,
          status: 'error',
          error: errorMessage
        }));
      },
      options
    );
  };

  const testIPLocation = async () => {
    setState(prev => ({ ...prev, status: 'requesting', error: null, method: 'ip' }));

    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      
      if (data.latitude && data.longitude) {
        setState(prev => ({
          ...prev,
          status: 'success',
          location: {
            lat: parseFloat(data.latitude),
            lon: parseFloat(data.longitude),
            accuracy: 10000 // IP location is less accurate
          }
        }));
      } else {
        throw new Error('IP location data not available');
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: 'Failed to get IP location'
      }));
    }
  };

  const reset = () => {
    setState({
      status: 'idle',
      location: null,
      error: null,
      permissionState: null,
      method: null
    });
  };

  const getStatusIcon = () => {
    switch (state.status) {
      case 'requesting':
        return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <MapPin className="w-5 h-5 text-gray-500" />;
    }
  };

  const getPermissionBadge = () => {
    if (!state.permissionState) return null;
    
    const variants = {
      granted: 'default',
      denied: 'destructive',
      prompt: 'secondary'
    } as const;
    
    return (
      <Badge variant={variants[state.permissionState as keyof typeof variants] || 'secondary'}>
        Permission: {state.permissionState}
      </Badge>
    );
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          Location Permission Test
          {getPermissionBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Test Buttons */}
        <div className="flex gap-3">
          <Button 
            onClick={testGPSLocation} 
            disabled={state.status === 'requesting'}
            className="flex items-center gap-2"
          >
            <MapPin className="w-4 h-4" />
            Test GPS Location
          </Button>
          
          <Button 
            onClick={testIPLocation} 
            disabled={state.status === 'requesting'}
            variant="outline"
            className="flex items-center gap-2"
          >
            <MapPin className="w-4 h-4" />
            Test IP Location
          </Button>
          
          <Button onClick={reset} variant="outline">
            Reset
          </Button>
        </div>

        {/* Status Messages */}
        {state.status === 'requesting' && (
          <Alert>
            <Loader2 className="w-4 h-4 animate-spin" />
            <AlertDescription>
              {state.method === 'gps' 
                ? '🔍 Requesting GPS location... You should see a permission popup!'
                : '🌐 Getting location from IP address...'
              }
            </AlertDescription>
          </Alert>
        )}

        {state.status === 'success' && state.location && (
          <Alert>
            <CheckCircle className="w-4 h-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div>
                  <strong>✅ Location detected successfully!</strong>
                </div>
                <div>
                  <strong>Coordinates:</strong> {state.location.lat.toFixed(6)}, {state.location.lon.toFixed(6)}
                </div>
                <div>
                  <strong>Accuracy:</strong> ±{Math.round(state.location.accuracy)}m
                </div>
                <div>
                  <strong>Method:</strong> {state.method === 'gps' ? '📍 GPS Location' : '🌐 IP Location'}
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {state.status === 'error' && (
          <Alert variant="destructive">
            <XCircle className="w-4 h-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div><strong>❌ Location request failed</strong></div>
                <div><strong>Error:</strong> {state.error}</div>
                {state.error?.includes('denied') && (
                  <div className="text-sm">
                    💡 <strong>Tip:</strong> Check your browser's address bar for a location icon and click "Allow"
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Instructions */}
        <div className="bg-muted p-4 rounded-lg text-sm space-y-2">
          <div className="font-semibold">🧪 How to test:</div>
          <div>1. Click "Test GPS Location" button</div>
          <div>2. Look for a permission popup in your browser (like the one in your screenshot)</div>
          <div>3. Click "Allow" to grant permission</div>
          <div>4. You should see your coordinates appear below</div>
          <div className="text-muted-foreground mt-2">
            💡 If you don't see a popup, location might already be allowed/blocked for this site
          </div>
        </div>

        {/* Browser Info */}
        <div className="text-xs text-muted-foreground space-y-1">
          <div><strong>Browser:</strong> {navigator.userAgent.split(' ')[0]}</div>
          <div><strong>Geolocation Support:</strong> {'geolocation' in navigator ? '✅ Yes' : '❌ No'}</div>
          <div><strong>HTTPS:</strong> {location.protocol === 'https:' ? '✅ Yes' : '⚠️ No (required for location)'}</div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LocationTest;