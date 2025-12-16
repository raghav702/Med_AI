import React from 'react';
import { NavigationLayout } from '@/components/layout/NavigationLayout';
import { DoctorDashboardStats } from '@/components/doctor/DoctorDashboardStats';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import {
  Users,
  Calendar,
  FileText,
  Clock,
  TrendingUp,
  AlertCircle,
  Plus,
  Activity,
  Search,
  Stethoscope,
  User,
} from 'lucide-react';

export const DoctorDashboard: React.FC = () => {
  const { user } = useAuth();

  const recentActivity = [
    {
      id: 1,
      action: 'Added medical record for Emma Wilson',
      time: '2 hours ago',
      type: 'record',
    },
    {
      id: 2,
      action: 'Completed consultation with Robert Brown',
      time: '4 hours ago',
      type: 'consultation',
    },
    {
      id: 3,
      action: 'Scheduled appointment for Lisa Garcia',
      time: '1 day ago',
      type: 'appointment',
    },
  ];

  return (
    <NavigationLayout>
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Welcome back, Dr. {user?.email?.split('@')[0]}
              </h1>
              <p className="text-muted-foreground mt-2">
                Here's an overview of your medical practice today
              </p>
            </div>
            <div className="flex gap-2">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Appointment
              </Button>
              <Button variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Add Record
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <DoctorDashboardStats />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription>
                  Your latest actions and updates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-600 mt-2"></div>
                      <div className="flex-1">
                        <p className="text-sm">{activity.action}</p>
                        <p className="text-xs text-muted-foreground">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full" asChild>
                    <Link to="/doctor/appointments">
                      View All Activity
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common tasks and shortcuts for your daily workflow
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" className="h-20 flex-col gap-2" asChild>
                  <Link to="/doctor/patients">
                    <Users className="h-6 w-6" />
                    <span>My Patients</span>
                  </Link>
                </Button>
                <Button variant="outline" className="h-20 flex-col gap-2" asChild>
                  <Link to="/doctor/appointments">
                    <Calendar className="h-6 w-6" />
                    <span>Appointments</span>
                  </Link>
                </Button>
                <Button variant="outline" className="h-20 flex-col gap-2" asChild>
                  <Link to="/doctor/profile">
                    <User className="h-6 w-6" />
                    <span>My Profile</span>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Alerts */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <AlertCircle className="h-5 w-5" />
                Getting Started
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-blue-700">
                  • Complete your doctor profile to start accepting patients
                </p>
                <p className="text-sm text-blue-700">
                  • Review pending appointment requests from patients
                </p>
                <p className="text-sm text-blue-700">
                  • Manage your appointments and patient consultations
                </p>
                <div className="mt-4">
                  <Button size="sm" asChild>
                    <Link to="/doctor/profile">
                      Complete Profile Setup
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </NavigationLayout>
  );
};