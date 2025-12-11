import React from 'react';
import { Skeleton } from './skeleton';
import { Card, CardContent, CardHeader } from './card';
import { cn } from '@/lib/utils';

// Profile skeleton loader
export const ProfileSkeleton: React.FC = () => (
  <Card>
    <CardHeader>
      <div className="flex items-center space-x-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-6">
      {/* Personal Information Section */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-40" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-36" />
          </div>
        </div>
      </div>
      
      {/* Medical Information Section */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-36" />
        <div className="space-y-3">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-6 w-18" />
              <Skeleton className="h-6 w-22" />
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

// Medical records list skeleton
export const MedicalRecordsListSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, index) => (
      <Card key={index}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <div className="flex items-center space-x-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-full max-w-md" />
              <div className="flex items-center space-x-4">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <div className="flex space-x-2">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

// Dashboard skeleton
export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-10 w-32" />
    </div>
    
    {/* Stats Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Skeleton className="h-8 w-8" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-6 w-12" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
    
    {/* Main Content */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-center space-x-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-1 flex-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-36" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    </div>
  </div>
);

// Form skeleton
export const FormSkeleton: React.FC<{ fields?: number }> = ({ fields = 5 }) => (
  <div className="space-y-6">
    {Array.from({ length: fields }).map((_, index) => (
      <div key={index} className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
    ))}
    <div className="flex justify-end space-x-2">
      <Skeleton className="h-10 w-20" />
      <Skeleton className="h-10 w-24" />
    </div>
  </div>
);

// Table skeleton
export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({ 
  rows = 5, 
  columns = 4 
}) => (
  <div className="space-y-3">
    {/* Header */}
    <div className="flex space-x-4 pb-2 border-b">
      {Array.from({ length: columns }).map((_, index) => (
        <Skeleton key={index} className="h-4 flex-1" />
      ))}
    </div>
    
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="flex space-x-4 py-2">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton key={colIndex} className="h-4 flex-1" />
        ))}
      </div>
    ))}
  </div>
);

// Button skeleton
export const ButtonSkeleton: React.FC<{ width?: string; height?: string }> = ({ 
  width = 'w-24', 
  height = 'h-10' 
}) => (
  <Skeleton className={cn('rounded-md', width, height)} />
);

// Navigation skeleton
export const NavigationSkeleton: React.FC = () => (
  <div className="space-y-2">
    {Array.from({ length: 5 }).map((_, index) => (
      <div key={index} className="flex items-center space-x-3 p-2">
        <Skeleton className="h-5 w-5" />
        <Skeleton className="h-4 flex-1" />
      </div>
    ))}
  </div>
);

// Card list skeleton
export const CardListSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, index) => (
      <Card key={index}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

// Search results skeleton
export const SearchResultsSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="p-4 border rounded-lg">
        <div className="flex items-start space-x-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

// File upload skeleton
export const FileUploadSkeleton: React.FC = () => (
  <div className="space-y-4">
    <div className="border-2 border-dashed rounded-lg p-6">
      <div className="text-center space-y-2">
        <Skeleton className="h-8 w-8 mx-auto" />
        <Skeleton className="h-4 w-48 mx-auto" />
        <Skeleton className="h-3 w-32 mx-auto" />
      </div>
    </div>
  </div>
);