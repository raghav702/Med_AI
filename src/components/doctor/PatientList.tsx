import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { patientService } from '@/services/patient';
import { useAuth } from '@/contexts/AuthContext';
import type { PatientWithProfile, UserProfileFilters, PaginationOptions } from '@/types/database';
import {
  Search,
  Filter,
  Users,
  Phone,
  Calendar,
  AlertCircle,
  Eye,
  RefreshCw,
  User
} from 'lucide-react';

interface PatientListProps {
  onPatientSelect?: (patient: PatientWithProfile) => void;
  showMyPatientsOnly?: boolean;
}

export const PatientList: React.FC<PatientListProps> = ({ 
  onPatientSelect,
  showMyPatientsOnly = false 
}) => {
  const { user } = useAuth();
  const [patients, setPatients] = useState<PatientWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<UserProfileFilters>({});
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 0,
    totalCount: 0
  });

  // Load patients
  const loadPatients = async (page = 1, search = searchTerm, currentFilters = filters) => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const paginationOptions: PaginationOptions = {
        page,
        limit: pagination.limit
      };

      const searchFilters: UserProfileFilters = {
        ...currentFilters,
        search: search.trim() || undefined,
        user_role: 'patient'
      };

      let result;
      if (showMyPatientsOnly) {
        result = await patientService.getPatientsByDoctor(user.id, paginationOptions);
      } else {
        result = await patientService.searchPatients(searchFilters, paginationOptions);
      }

      setPatients(result.data);
      setPagination({
        page: result.page,
        limit: result.limit,
        totalPages: result.total_pages,
        totalCount: result.count
      });
    } catch (err) {
      console.error('Error loading patients:', err);
      setError('Failed to load patients. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadPatients();
  }, [user?.id, showMyPatientsOnly]);

  // Handle search
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    if (value.trim() !== searchTerm.trim()) {
      loadPatients(1, value, filters);
    }
  };

  // Handle filter changes
  const handleFilterChange = (key: keyof UserProfileFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    loadPatients(1, searchTerm, newFilters);
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    loadPatients(page);
  };

  // Handle refresh
  const handleRefresh = () => {
    loadPatients(pagination.page);
  };

  // Get patient initials
  const getPatientInitials = (patient: PatientWithProfile) => {
    const firstName = patient.user_profile?.first_name || '';
    const lastName = patient.user_profile?.last_name || '';
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    return 'P';
  };

  // Get patient display name
  const getPatientName = (patient: PatientWithProfile) => {
    const firstName = patient.user_profile?.first_name || '';
    const lastName = patient.user_profile?.last_name || '';
    if (firstName || lastName) {
      return `${firstName} ${lastName}`.trim();
    }
    return 'Unknown Patient';
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Calculate age
  const calculateAge = (dateOfBirth?: string) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={handleRefresh} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          {showMyPatientsOnly ? 'My Patients' : 'All Patients'}
        </CardTitle>
        <CardDescription>
          {showMyPatientsOnly 
            ? 'Patients who have appointments with you'
            : 'Search and manage patient profiles'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search patients by name or phone..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Select
              value={filters.has_conditions?.toString() || 'all'}
              onValueChange={(value) => 
                handleFilterChange('has_conditions', value === 'all' ? undefined : value === 'true')
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Medical Conditions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Patients</SelectItem>
                <SelectItem value="true">Has Conditions</SelectItem>
                <SelectItem value="false">No Conditions</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.is_active?.toString() || 'all'}
              onValueChange={(value) => 
                handleFilterChange('is_active', value === 'all' ? undefined : value === 'true')
              }
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleRefresh} size="icon">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Patient Table */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-3 w-[150px]" />
                </div>
                <Skeleton className="h-8 w-[80px]" />
              </div>
            ))}
          </div>
        ) : patients.length === 0 ? (
          <div className="text-center py-8">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              {showMyPatientsOnly ? 'No patients found' : 'No patients match your search'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {showMyPatientsOnly 
                ? 'You don\'t have any patients yet. Patients will appear here after they book appointments with you.'
                : 'Try adjusting your search terms or filters.'
              }
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Medical Info</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patients.map((patient) => {
                    const age = calculateAge(patient.user_profile?.date_of_birth);
                    const hasConditions = patient.user_profile?.medical_conditions?.length > 0;
                    const hasAllergies = patient.user_profile?.allergies?.length > 0;
                    const hasMedications = patient.user_profile?.medications?.length > 0;

                    return (
                      <TableRow key={patient.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {getPatientInitials(patient)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{getPatientName(patient)}</div>
                              <div className="text-sm text-muted-foreground">
                                Joined {formatDate(patient.created_at)}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {patient.user_profile?.phone_number && (
                              <div className="flex items-center gap-1 text-sm">
                                <Phone className="h-3 w-3" />
                                {patient.user_profile.phone_number}
                              </div>
                            )}
                            {patient.emergency_contact_phone && (
                              <div className="text-xs text-muted-foreground">
                                Emergency: {patient.emergency_contact_phone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {age ? `${age} years` : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {hasConditions && (
                              <Badge variant="outline" className="text-xs">
                                Conditions
                              </Badge>
                            )}
                            {hasAllergies && (
                              <Badge variant="outline" className="text-xs">
                                Allergies
                              </Badge>
                            )}
                            {hasMedications && (
                              <Badge variant="outline" className="text-xs">
                                Medications
                              </Badge>
                            )}
                            {!hasConditions && !hasAllergies && !hasMedications && (
                              <span className="text-xs text-muted-foreground">None</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={patient.user_profile?.is_active ? 'default' : 'secondary'}>
                            {patient.user_profile?.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onPatientSelect?.(patient)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of{' '}
                  {pagination.totalCount} patients
                </div>
                <Pagination>
                  <PaginationContent>
                    {pagination.page > 1 && (
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => handlePageChange(pagination.page - 1)}
                          className="cursor-pointer"
                        />
                      </PaginationItem>
                    )}
                    
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      const pageNum = i + 1;
                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            onClick={() => handlePageChange(pageNum)}
                            isActive={pageNum === pagination.page}
                            className="cursor-pointer"
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    
                    {pagination.page < pagination.totalPages && (
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => handlePageChange(pagination.page + 1)}
                          className="cursor-pointer"
                        />
                      </PaginationItem>
                    )}
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};