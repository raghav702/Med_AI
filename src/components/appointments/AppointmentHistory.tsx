import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { appointmentService } from '@/services/appointment';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PatientAppointmentManagement } from './PatientAppointmentManagement';
import {
    Calendar,
    Clock,
    MapPin,
    User,
    Search,
    Filter,
    Star,
    CheckCircle,
    XCircle,
    AlertCircle,
    Eye
} from 'lucide-react';
import { format, isAfter, isBefore, startOfDay } from 'date-fns';
import type { AppointmentWithDetails, AppointmentStatus, AppointmentFilters } from '@/types/database';

interface AppointmentHistoryProps {
    patientId: string;
}

export function AppointmentHistory({ patientId }: AppointmentHistoryProps) {
    const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithDetails | null>(null);
    const [showManagement, setShowManagement] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<AppointmentStatus | 'all'>('all');
    const [dateFilter, setDateFilter] = useState<'all' | 'upcoming' | 'past' | 'this-month'>('all');

    // Fetch patient appointments
    const { data: appointmentsData, isLoading, error } = useQuery({
        queryKey: ['patient-appointments', patientId],
        queryFn: () => appointmentService.getAppointmentsByPatient(patientId),
        enabled: !!patientId,
    });

    const appointments = appointmentsData?.data || [];

    const getStatusColor = (status: AppointmentStatus) => {
        switch (status) {
            case 'pending':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'approved':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'rejected':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'completed':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'cancelled':
                return 'bg-gray-100 text-gray-800 border-gray-200';
            case 'no_show':
                return 'bg-orange-100 text-orange-800 border-orange-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getStatusIcon = (status: AppointmentStatus) => {
        switch (status) {
            case 'pending':
                return <Clock className="h-4 w-4" />;
            case 'approved':
                return <CheckCircle className="h-4 w-4" />;
            case 'rejected':
                return <XCircle className="h-4 w-4" />;
            case 'completed':
                return <CheckCircle className="h-4 w-4" />;
            case 'cancelled':
                return <XCircle className="h-4 w-4" />;
            case 'no_show':
                return <AlertCircle className="h-4 w-4" />;
            default:
                return <Clock className="h-4 w-4" />;
        }
    };

    const filterAppointments = (appointments: AppointmentWithDetails[]) => {
        let filtered = appointments;

        // Filter by search term
        if (searchTerm) {
            filtered = filtered.filter(apt =>
                apt.doctor.user_profile.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                apt.doctor.user_profile.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                apt.doctor.specialization.toLowerCase().includes(searchTerm.toLowerCase()) ||
                apt.reason_for_visit.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Filter by status
        if (statusFilter !== 'all') {
            filtered = filtered.filter(apt => apt.status === statusFilter);
        }

        // Filter by date
        const today = startOfDay(new Date());
        if (dateFilter === 'upcoming') {
            filtered = filtered.filter(apt =>
                isAfter(new Date(apt.appointment_date), today) ||
                (apt.appointment_date === format(today, 'yyyy-MM-dd') && ['pending', 'approved'].includes(apt.status))
            );
        } else if (dateFilter === 'past') {
            filtered = filtered.filter(apt =>
                isBefore(new Date(apt.appointment_date), today) ||
                ['completed', 'cancelled', 'rejected', 'no_show'].includes(apt.status)
            );
        } else if (dateFilter === 'this-month') {
            const thisMonth = new Date().getMonth();
            const thisYear = new Date().getFullYear();
            filtered = filtered.filter(apt => {
                const aptDate = new Date(apt.appointment_date);
                return aptDate.getMonth() === thisMonth && aptDate.getFullYear() === thisYear;
            });
        }

        return filtered.sort((a, b) =>
            new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime()
        );
    };

    const handleViewAppointment = (appointment: AppointmentWithDetails) => {
        setSelectedAppointment(appointment);
        setShowManagement(true);
    };

    const renderStars = (rating: number) => {
        return Array.from({ length: 5 }, (_, i) => (
            <Star
                key={i}
                className={`h-3 w-3 ${i < Math.floor(rating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : i < rating
                        ? 'fill-yellow-200 text-yellow-400'
                        : 'text-gray-300'
                    }`}
            />
        ));
    };

    const AppointmentCard = ({ appointment }: { appointment: AppointmentWithDetails }) => (
        <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-4">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                        <Avatar className="h-12 w-12">
                            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${appointment.doctor.id}`} />
                            <AvatarFallback>
                                {appointment.doctor.user_profile.first_name?.[0]}
                                {appointment.doctor.user_profile.last_name?.[0]}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <h3 className="font-semibold">
                                Dr. {appointment.doctor.user_profile.first_name} {appointment.doctor.user_profile.last_name}
                            </h3>
                            <p className="text-sm text-gray-600">{appointment.doctor.specialization}</p>
                            {appointment.rating && (
                                <div className="flex items-center space-x-1 mt-1">
                                    <div className="flex">
                                        {renderStars(appointment.rating)}
                                    </div>
                                    <span className="text-xs text-gray-500">({appointment.rating}/5)</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <Badge className={getStatusColor(appointment.status)}>
                        {getStatusIcon(appointment.status)}
                        <span className="ml-1 capitalize">{appointment.status.replace('_', ' ')}</span>
                    </Badge>
                </div>

                <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span>{format(new Date(appointment.appointment_date), 'EEEE, MMMM d, yyyy')}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span>{appointment.appointment_time} ({appointment.duration_minutes} minutes)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span>{appointment.reason_for_visit}</span>
                    </div>
                    {appointment.doctor.office_address && (
                        <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4 text-gray-500" />
                            <span className="truncate">{appointment.doctor.office_address}</span>
                        </div>
                    )}
                </div>

                {/* Status-specific information */}
                {appointment.status === 'rejected' && appointment.doctor_notes && (
                    <div className="mt-3 p-2 bg-red-50 rounded text-sm">
                        <p className="font-medium text-red-800">Rejection reason:</p>
                        <p className="text-red-700">{appointment.doctor_notes}</p>
                    </div>
                )}

                {appointment.status === 'completed' && appointment.prescription && (
                    <div className="mt-3 p-2 bg-green-50 rounded text-sm">
                        <p className="font-medium text-green-800">Prescription provided</p>
                    </div>
                )}

                {appointment.follow_up_required && appointment.follow_up_date && (
                    <div className="mt-3 p-2 bg-blue-50 rounded text-sm">
                        <p className="font-medium text-blue-800">
                            Follow-up required by {format(new Date(appointment.follow_up_date), 'MMM d, yyyy')}
                        </p>
                    </div>
                )}

                <div className="flex justify-between items-center mt-4 pt-3 border-t">
                    <span className="text-sm font-medium">₹{appointment.consultation_fee}</span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewAppointment(appointment)}
                    >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                    </Button>
                </div>
            </CardContent>
        </Card>
    );

    const filteredAppointments = filterAppointments(appointments);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-12">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Failed to load appointment history. Please try again.
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-6">
            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        Filter Appointments
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search by doctor, specialization, or reason..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={(value: AppointmentStatus | 'all') => setStatusFilter(value)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="approved">Approved</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                                <SelectItem value="no_show">No Show</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={dateFilter} onValueChange={(value: 'all' | 'upcoming' | 'past' | 'this-month') => setDateFilter(value)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filter by date" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Dates</SelectItem>
                                <SelectItem value="upcoming">Upcoming</SelectItem>
                                <SelectItem value="past">Past</SelectItem>
                                <SelectItem value="this-month">This Month</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Appointment List */}
            {filteredAppointments.length > 0 ? (
                <div className="grid gap-4">
                    {filteredAppointments.map((appointment) => (
                        <AppointmentCard key={appointment.id} appointment={appointment} />
                    ))}
                </div>
            ) : (
                <Card>
                    <CardContent className="text-center py-12">
                        <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-lg font-semibold mb-2">No Appointments Found</h3>
                        <p className="text-gray-600">
                            {searchTerm || statusFilter !== 'all' || dateFilter !== 'all'
                                ? 'No appointments match your current filters.'
                                : 'You don\'t have any appointments yet.'
                            }
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Appointment Management Dialog */}
            {selectedAppointment && (
                <PatientAppointmentManagement
                    appointment={selectedAppointment}
                    open={showManagement}
                    onOpenChange={(open) => {
                        setShowManagement(open);
                        if (!open) {
                            setSelectedAppointment(null);
                        }
                    }}
                />
            )}
        </div>
    );
}