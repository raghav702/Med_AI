import React from 'react';
import LocationTest from '@/components/test/LocationTest';

export const LocationTestPage: React.FC = () => {
  return (
    <div className="container mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Location Permission Test</h1>
        <p className="text-muted-foreground">
          Test if your browser is requesting location permission correctly
        </p>
      </div>
      
      <LocationTest />
    </div>
  );
};

export default LocationTestPage;