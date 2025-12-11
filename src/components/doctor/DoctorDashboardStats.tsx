import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { appointmentService } from '@/services/appointment';
import { patientService } from '@/services/patient';
import { useAuth } from '@/contexts/AuthContext';
import type { DoctorStats } from '@/types/database';
import {
  Users,
  Calendar,
  Clock,
  DollarSign,
  TrendingUp,
  Star,
  AlertCircle,
  Activity
} from 'lucide-react';

export const DoctorDashboardStats: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DoctorStats | null>(null);
  const [patientCount, setPatientCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load dashboard statistics
  const loadStats = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Load doctor stats and patient count in parallel
      const [doctorStats, patientsResult] = await Promise.allSettled([
        appointmentService.getDoctorStats(user.id),
        patientService.getPatientsByDoctor(user.id, { limit: 1 })
      ]);

      // Handle doctor stats
      if (doctorStats.status === 'fulfilled') {
        setStats(doctorStats.value);
      } else {
        console.error('Failed to load doctor stats:', doctorStats.reason);
      }

      // Handle patient count
      if (patientsResult.status === 'fulfilled') {
        setPatientCount(patientsResult.value.count);
      } else {
        console.error('Failed to load patient count:', patientsResult.reason);
      }

    } catch (err) {
      console.error('Error loading dashboard stats:', err);
      setError('Failed to load dashboard statistics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [user?.id]);

  // Calculate completion rate
  const getCompletionRate = () => {
    if (!stats || stats.total_appointments === 0) return 0;
    return Math.round((stats.completed_appointments / stats.total_appointments) * 100);
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[60px] mb-2" />
              <Skeleton className="h-3 w-[120px]" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total Patients */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{patientCount}</div>
          <p className="text-xs text-muted-foreground">
            Patients under your care
          </p>
        </CardContent>
      </Card>

      {/* Total Appointments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.total_appointments || 0}</div>
          <p className="text-xs text-muted-foreground">
            All time appointments
          </p>
        </CardContent>
      </Card>

      {/* Pending Appointments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.pending_appointments || 0}</div>
          <p className="text-xs text-muted-foreground">
            {stats?.pending_appointments === 1 ? 'Requires' : 'Require'} your attention
          </p>
        </CardContent>
      </Card>

      {/* Completed Appointments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completed</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.completed_appointments || 0}</div>
          <p className="text-xs text-muted-foreground">
            {getCompletionRate()}% completion rate
          </p>
        </CardContent>
      </Card>

      {/* Total Revenue */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(stats?.total_revenue || 0)}</div>
          <p className="text-xs text-muted-foreground">
            From completed appointments
          </p>
        </CardContent>
      </Card>

      {/* Average Rating */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
          <Star className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats?.average_rating ? stats.average_rating.toFixed(1) : 'N/A'}
          </div>
          <p className="text-xs text-muted-foreground">
            Patient satisfaction
          </p>
        </CardContent>
      </Card>

      {/* Cancelled Appointments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.cancelled_appointments || 0}</div>
          <p className="text-xs text-muted-foreground">
            Cancelled by patients
          </p>
        </CardContent>
      </Card>

      {/* No Shows */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">No Shows</CardTitle>
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.no_show_appointments || 0}</div>
          <p className="text-xs text-muted-foreground">
            Patients didn't show up
          </p>
        </CardContent>
      </Card>
    </div>
  );
};