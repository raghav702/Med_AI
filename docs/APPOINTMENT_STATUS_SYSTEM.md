# Appointment Status System Documentation

## Overview

The Appointment Status System is a comprehensive solution for managing appointment lifecycles in the doctor-patient appointment booking system. It implements a state machine approach with automatic transitions, conflict detection, and workflow management.

## Architecture

### Core Components

1. **AppointmentStatusManager** - Manages status transitions and validation
2. **AppointmentWorkflowService** - Handles complete appointment workflows
3. **AppointmentSchedulerService** - Manages time slots and scheduling
4. **React Hooks** - Provides easy integration with React components
5. **UI Components** - Ready-to-use appointment management interfaces

### State Machine

The system implements a finite state machine with the following states:

- `pending` - Initial state when appointment is requested
- `approved` - Doctor has approved the appointment
- `rejected` - Doctor has rejected the appointment
- `completed` - Appointment has been completed
- `cancelled` - Appointment has been cancelled
- `no_show` - Patient didn't show up for the appointment

## Status Transitions

### Transition Rules

| From | To | Allowed By | Conditions |
|------|----|-----------|-----------| 
| pending | approved | doctor | Future appointment |
| pending | rejected | doctor | Future appointment |
| pending | cancelled | patient, doctor | Future appointment |
| approved | completed | doctor | Past/current appointment |
| approved | cancelled | patient, doctor | >2 hours before appointment |
| approved | no_show | system, doctor | 30+ minutes after appointment time |
| cancelled | pending | patient | Future appointment (rebooking) |
| rejected | pending | patient | Future appointment (rebooking) |
| completed | completed | doctor, patient | Allow updates (notes, ratings) |

### Automatic Transitions

The system supports automatic status transitions:

- **No-show Detection**: Appointments are automatically marked as `no_show` if the patient doesn't show up 30 minutes after the scheduled time
- **Time-based Validation**: Prevents invalid operations on past appointments

## Features

### 1. Conflict Detection

The system prevents double-booking by checking:

- **Doctor Conflicts**: Ensures doctor doesn't have overlapping appointments
- **Patient Conflicts**: Ensures patient doesn't have overlapping appointments  
- **Time Slot Availability**: Checks if the requested time slot is available
- **Doctor Availability**: Validates against doctor's working hours

```typescript
const conflictResult = await appointmentStatusManager.detectConflicts(
  doctorId,
  patientId,
  appointmentDate,
  appointmentTime,
  duration
);

if (conflictResult.hasConflict) {
  console.log(`Conflict: ${conflictResult.conflictDetails}`);
}
```

### 2. Suggested Alternatives

When conflicts are detected, the system provides alternative time slots:

```typescript
const alternatives = await appointmentStatusManager.getSuggestedAlternatives(
  doctorId,
  patientId,
  preferredDate,
  duration,
  maxSuggestions
);
```

### 3. Appointment Modification

Supports rescheduling with conflict validation:

```typescript
const result = await appointmentWorkflowService.rescheduleAppointment({
  appointmentId,
  newDate,
  newTime,
  reason,
  requestedBy: 'patient'
});
```

### 4. Bulk Time Slot Management

Efficiently create and manage time slots:

```typescript
const result = await appointmentSchedulerService.createBulkTimeSlots({
  doctorId,
  startDate,
  endDate,
  slotDuration: 30,
  bufferTime: 5
});
```

### 5. Scheduling Statistics

Get insights into appointment patterns:

```typescript
const stats = await appointmentSchedulerService.getSchedulingStats(
  doctorId,
  startDate,
  endDate
);

console.log(`Utilization Rate: ${stats.utilizationRate}%`);
console.log(`Peak Hours: ${stats.peakHours.join(', ')}`);
```

## Usage Examples

### Basic Status Management

```typescript
import { useAppointmentStatus } from '@/hooks/useAppointmentStatus';

function AppointmentCard({ appointment }) {
  const {
    updateStatus,
    approveAppointment,
    rejectAppointment,
    getAllowedTransitions
  } = useAppointmentStatus(appointment.id);

  const allowedActions = getAllowedTransitions(appointment, 'doctor');

  const handleApprove = () => {
    approveAppointment({
      doctorId: 'doctor-123',
      notes: 'Appointment approved'
    });
  };

  return (
    <div>
      <h3>Appointment Status: {appointment.status}</h3>
      {allowedActions.includes('approved') && (
        <button onClick={handleApprove}>Approve</button>
      )}
    </div>
  );
}
```

### Complete Workflow Management

```typescript
import { AppointmentStatusManager } from '@/components/appointments/AppointmentStatusManager';

function DoctorDashboard({ appointments }) {
  return (
    <div>
      {appointments.map(appointment => (
        <AppointmentStatusManager
          key={appointment.id}
          appointment={appointment}
          userRole="doctor"
          userId="doctor-123"
          onStatusChange={(newStatus) => {
            console.log(`Status changed to: ${newStatus}`);
          }}
        />
      ))}
    </div>
  );
}
```

### Scheduling Management

```typescript
import { useAppointmentScheduling } from '@/hooks/useAppointmentStatus';

function SchedulingPanel({ doctorId }) {
  const {
    getAvailableSlots,
    createBulkSlots,
    blockSlots,
    getSchedulingStats
  } = useAppointmentScheduling(doctorId);

  const handleCreateSlots = () => {
    createBulkSlots({
      startDate: '2024-12-01',
      endDate: '2024-12-31',
      slotDuration: 30,
      bufferTime: 5
    });
  };

  return (
    <div>
      <button onClick={handleCreateSlots}>
        Create Time Slots
      </button>
    </div>
  );
}
```

## Database Schema

### Key Tables

#### appointments
- Stores appointment details and current status
- Includes workflow metadata and timestamps
- Enforces business rules through constraints

#### appointment_time_slots
- Manages available time slots for booking
- Supports blocking and availability management
- Optimized for conflict detection queries

#### doctor_availability
- Defines doctor's working hours by day of week
- Used for generating time slots and validation

### Database Functions

The system includes several PostgreSQL functions:

- `prevent_double_booking()` - Trigger to prevent conflicts
- `update_doctor_rating()` - Updates doctor ratings automatically
- `is_doctor_available()` - Checks doctor availability
- `get_available_time_slots()` - Returns available slots for a date
- `generate_time_slots()` - Bulk generates time slots

## Error Handling

### Custom Error Types

```typescript
class AppointmentStatusError extends Error {
  public readonly code: string;
  public readonly details?: any;
}

class AppointmentWorkflowError extends Error {
  public readonly code: string;
  public readonly details?: any;
}

class AppointmentSchedulerError extends Error {
  public readonly code: string;
  public readonly details?: any;
}
```

### Common Error Codes

- `INVALID_TRANSITION` - Invalid status transition attempted
- `APPOINTMENT_CONFLICT` - Scheduling conflict detected
- `INVALID_INPUT` - Invalid input parameters
- `SERVICE_UNAVAILABLE` - Database service not available
- `NOT_FOUND` - Appointment not found
- `CANCELLATION_TOO_LATE` - Cancellation attempted too close to appointment time

## Performance Considerations

### Database Optimization

1. **Indexes**: Comprehensive indexing on frequently queried columns
2. **Composite Indexes**: Optimized for common query patterns
3. **Partitioning**: Consider partitioning large appointment tables by date
4. **Connection Pooling**: Efficient database connection management

### Caching Strategy

1. **Time Slots**: Cache available time slots for popular doctors
2. **Doctor Availability**: Cache doctor availability patterns
3. **Statistics**: Cache scheduling statistics with appropriate TTL

### Query Optimization

1. **Batch Operations**: Use bulk operations for time slot creation
2. **Efficient Joins**: Minimize complex joins in frequently used queries
3. **Pagination**: Implement proper pagination for large result sets

## Security Considerations

### Row Level Security (RLS)

All tables implement RLS policies:

```sql
-- Patients can only see their own appointments
CREATE POLICY "Patients can view own appointments" ON appointments
  FOR SELECT USING (auth.uid() = patient_id);

-- Doctors can see appointments for their patients
CREATE POLICY "Doctors can view their appointments" ON appointments
  FOR SELECT USING (auth.uid() = doctor_id);
```

### Input Validation

- All user inputs are validated on both client and server side
- SQL injection prevention through parameterized queries
- Business rule validation before database operations

### Audit Logging

- All status changes are logged with timestamps and user information
- Critical operations include audit trails
- Compliance with healthcare data regulations

## Testing

### Test Coverage

The system includes comprehensive tests:

1. **Unit Tests**: Core business logic and state machine rules
2. **Integration Tests**: Database operations and service interactions
3. **End-to-End Tests**: Complete user workflows
4. **Performance Tests**: Load testing for high-volume scenarios

### Test Categories

- Status transition validation
- Conflict detection accuracy
- Workflow completion
- Error handling
- Performance benchmarks

## Monitoring and Analytics

### Key Metrics

1. **Appointment Volume**: Track appointment creation and completion rates
2. **Status Distribution**: Monitor appointment status distribution
3. **Conflict Rate**: Track scheduling conflicts and resolution
4. **Response Times**: Monitor system performance
5. **Error Rates**: Track and alert on error conditions

### Dashboards

- Real-time appointment status monitoring
- Doctor utilization rates
- Patient booking patterns
- System health metrics

## Future Enhancements

### Planned Features

1. **Smart Scheduling**: AI-powered appointment suggestions
2. **Automated Reminders**: SMS/Email reminder system
3. **Waitlist Management**: Automatic rebooking from waitlists
4. **Multi-location Support**: Support for doctors across multiple locations
5. **Integration APIs**: Third-party calendar and EHR integrations

### Scalability Improvements

1. **Microservices**: Split into focused microservices
2. **Event Sourcing**: Implement event sourcing for audit trails
3. **CQRS**: Separate read and write models for better performance
4. **Distributed Caching**: Redis-based distributed caching

## Troubleshooting

### Common Issues

1. **Status Transition Errors**: Check transition rules and user permissions
2. **Conflict Detection**: Verify time zone handling and date formats
3. **Performance Issues**: Check database indexes and query optimization
4. **Workflow Stuck**: Check for failed automatic transitions

### Debug Tools

- Comprehensive logging with structured data
- Status transition history tracking
- Performance monitoring and alerting
- Database query analysis tools

## API Reference

### Core Services

#### AppointmentStatusManager

```typescript
class AppointmentStatusManager {
  validateStatusTransition(from, to, requestedBy, appointment): boolean
  getAllowedTransitions(appointment, requestedBy): AppointmentStatus[]
  updateAppointmentStatus(id, status, requestedBy, notes?): Promise<Appointment>
  detectConflicts(doctorId, patientId, date, time, duration?): Promise<ConflictDetectionResult>
  getSuggestedAlternatives(doctorId, patientId, date, duration?, max?): Promise<Alternative[]>
  processModificationRequest(request): Promise<ModificationResult>
  processAutomaticTransitions(): Promise<void>
}
```

#### AppointmentWorkflowService

```typescript
class AppointmentWorkflowService {
  createAppointmentWithWorkflow(data, createdBy): Promise<{appointment, workflow}>
  approveAppointment(id, doctorId, notes?): Promise<Appointment>
  rejectAppointment(id, doctorId, reason?): Promise<Appointment>
  rescheduleAppointment(request): Promise<RescheduleResult>
  cancelAppointment(request): Promise<Appointment>
  completeAppointment(id, doctorId, data): Promise<Appointment>
  getWorkflowStatus(id): Promise<AppointmentWorkflow>
}
```

#### AppointmentSchedulerService

```typescript
class AppointmentSchedulerService {
  getAvailableTimeSlots(doctorId, startDate, endDate, patientId?, preferences?): Promise<AvailableTimeSlot[]>
  createBulkTimeSlots(request): Promise<BulkResult>
  blockTimeSlots(doctorId, slots, reason): Promise<BlockResult>
  unblockTimeSlots(doctorId, slots): Promise<UnblockResult>
  getSchedulingStats(doctorId, startDate, endDate): Promise<SchedulingStats>
}
```

This comprehensive appointment status system provides a robust foundation for managing complex appointment workflows while maintaining data integrity and providing excellent user experience.