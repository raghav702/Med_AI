import React from 'react';
import { Card, CardContent, CardHeader } from './card';
import { Skeleton } from './skeleton';

export const AppointmentBookingSkeleton: React.FC = () => (
  <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
    {/* Header skeleton */}
    <div className="flex items-center gap-2">
      <Skeleton className="h-5 w-5" />
      <Skeleton className="h-6 w-32" />
    </div>

    {/* Doctor info skeleton */}
    <Card>
      <CardContent className="pt-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
          <Skeleton className="h-16 w-16 rounded-full mx-auto sm:mx-0" />
          <div className="flex-1 text-center sm:text-left space-y-2">
            <Skeleton className="h-6 w-48 mx-auto sm:mx-0" />
            <Skeleton className="h-4 w-32 mx-auto sm:mx-0" />
            <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Content skeleton */}
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <Skeleton className="h-6 w-64 mx-auto" />
        <Skeleton className="h-4 w-80 mx-auto" />
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="touch-manipulation">
            <CardHeader className="text-center pb-2">
              <Skeleton className="h-8 w-8 mx-auto mb-2" />
              <Skeleton className="h-4 w-24 mx-auto" />
            </CardHeader>
            <CardContent className="text-center pt-0">
              <Skeleton className="h-3 w-32 mx-auto" />
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="flex justify-center pt-4">
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  </div>
);

export const CalendarViewSkeleton: React.FC = () => (
  <div className="space-y-4 sm:space-y-6">
    {/* Header skeleton */}
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
      <div className="text-center sm:text-left space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="flex items-center space-x-2 mx-auto sm:mx-0">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>

    {/* Calendar skeleton */}
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
          <Skeleton className="h-6 w-32" />
          <div className="flex items-center space-x-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Calendar grid skeleton */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
        
        {/* Legend skeleton */}
        <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center space-x-2">
              <Skeleton className="w-3 h-3 rounded" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    {/* Schedule skeleton */}
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="p-3 rounded-lg border space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
);

export const TimeSlotSelectorSkeleton: React.FC = () => (
  <div className="space-y-4 sm:space-y-6">
    {/* Header skeleton */}
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
      <div className="text-center sm:text-left space-y-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2 mx-auto sm:mx-0">
        <Skeleton className="h-4 w-16" />
        <div className="flex space-x-1">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-8 w-12" />
          ))}
        </div>
      </div>
    </div>

    {/* Summary skeleton */}
    <Card>
      <CardContent className="pt-4">
        <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
          <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Tabs skeleton */}
    <div className="space-y-4">
      <div className="grid w-full grid-cols-4 gap-1">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
      
      {/* Time slots skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>

    {/* Legend skeleton */}
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center space-x-2">
              <Skeleton className="w-3 h-3 rounded" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
);

export const DoctorSelectorSkeleton: React.FC = () => (
  <div className="space-y-4">
    {/* Search and filters skeleton */}
    <div className="flex flex-col sm:flex-row gap-4">
      <Skeleton className="h-10 flex-1" />
      <Skeleton className="h-10 w-32" />
    </div>

    {/* Doctor cards skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="cursor-pointer transition-all duration-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <Skeleton className="h-4 w-24" />
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Skeleton key={j} className="h-4 w-4" />
                    ))}
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);



