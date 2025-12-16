import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { useDeviceType } from '@/hooks/use-mobile';
import { ChevronDown, X, MapPin, Star, IndianRupee, SlidersHorizontal } from 'lucide-react';
import type { DoctorSearchFilters } from '@/types/database';

interface DoctorSearchFiltersProps {
  filters: DoctorSearchFilters;
  onFiltersChange: (filters: DoctorSearchFilters) => void;
}

const SPECIALIZATIONS = [
  'Allergist And Clinical Immunologist',
  'Allergist And Immunologist',
  'Anaesthesiologist',
  'Ayurveda Practitioner',
  'Cardiac Surgeon',
  'Cardiologist',
  'Clinical Psychologist',
  'Critical Care Specialist',
  'Dentist',
  'Dermatologist',
  'Diabetologist',
  'Dietician',
  'ENT Specialist',
  'Endocrinologist',
  'Family Physician',
  'Gastroenterologist',
  'General Physician',
  'General Surgeon',
  'Gynecologist',
  'Infectious Disease Specialist',
  'Nephrologist',
  'Neurologist',
  'Neurosurgeon',
  'Oncologist',
  'Ophthalmologist',
  'Orthopedic Surgeon',
  'Pain Management Specialist',
  'Pediatrician',
  'Physiotherapist',
  'Plastic Surgeon',
  'Psychiatrist',
  'Psychologist',
  'Pulmonologist',
  'Radiologist',
  'Rheumatologist',
  'Spine Surgeon',
  'Urologist'
];

export function DoctorSearchFilters({ filters, onFiltersChange }: DoctorSearchFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localFilters, setLocalFilters] = useState<DoctorSearchFilters>(filters);
  const { isMobile } = useDeviceType();

  const handleFilterChange = (key: keyof DoctorSearchFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    const emptyFilters: DoctorSearchFilters = {};
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  const removeFilter = (key: keyof DoctorSearchFilters) => {
    const newFilters = { ...localFilters };
    delete newFilters[key];
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const activeFilters = Object.entries(localFilters).filter(([_, value]) => 
    value !== undefined && value !== null && 
    (Array.isArray(value) ? value.length > 0 : true)
  );

  const FilterContent = () => (
    <div className="space-y-4 sm:space-y-6">
      {/* Quick Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="specialty" className="flex items-center gap-2">
            <Star className="h-4 w-4" aria-hidden="true" />
            Specialty
          </Label>
          <Select
            value={localFilters.specialty || 'all'}
            onValueChange={(value) => handleFilterChange('specialty', value === 'all' ? undefined : value)}
          >
            <SelectTrigger className="touch-manipulation" id="specialty">
              <SelectValue placeholder="All specialties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All specialties</SelectItem>
              {SPECIALIZATIONS.map((spec) => (
                <SelectItem key={spec} value={spec}>
                  {spec}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="location" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            Location
          </Label>
          <Input
            id="location"
            placeholder="Search by city or address"
            value={localFilters.location || ''}
            onChange={(e) => handleFilterChange('location', e.target.value || undefined)}
            className="touch-manipulation"
          />
        </div>
      </div>

      {/* Active Filters */}
      {activeFilters.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Active filters ({activeFilters.length})
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-gray-500 hover:text-gray-700 touch-manipulation"
                >
                  Clear all
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {activeFilters.map(([key, value]) => (
                  <Badge key={key} variant="secondary" className="flex items-center gap-1 pr-1">
                    <span className="max-w-[150px] truncate">
                      {key === 'specialty' && value}
                      {key === 'location' && `📍 ${value}`}
                      {key === 'min_rating' && `⭐ ${value}+`}
                      {key === 'max_price' && `💰 ≤₹${value}`}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFilter(key as keyof DoctorSearchFilters)}
                      className="h-auto p-1 hover:bg-gray-200 rounded-full touch-manipulation"
                      aria-label={`Remove ${key} filter`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <div className="space-y-4">
        {/* Mobile filter trigger */}
        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="flex-1 justify-start gap-2 touch-manipulation">
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {activeFilters.length > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {activeFilters.length}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
              <SheetHeader className="text-left">
                <SheetTitle>Filter Doctors</SheetTitle>
                <SheetDescription>
                  Refine your search to find the perfect doctor for your needs.
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6">
                <FilterContent />
              </div>
            </SheetContent>
          </Sheet>
        </div>
        
        {/* Active filters preview */}
        {activeFilters.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <span className="text-xs text-gray-500 shrink-0">Active:</span>
            {activeFilters.slice(0, 3).map(([key, value]) => (
              <Badge key={key} variant="outline" className="shrink-0 text-xs">
                {key === 'specialty' && value}
                {key === 'location' && `📍 ${value}`}
                {key === 'min_rating' && `⭐ ${value}+`}
                {key === 'max_price' && `💰 ≤₹${value}`}
              </Badge>
            ))}
            {activeFilters.length > 3 && (
              <Badge variant="outline" className="shrink-0 text-xs">
                +{activeFilters.length - 3} more
              </Badge>
            )}
          </div>
        )}
      </div>
    );
  }

  return <FilterContent />;
}
