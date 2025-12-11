// Export authentication service
export { AuthService, authService, AuthServiceError } from './auth';
export type { IAuthService, SignUpUserData } from './auth';

// Export database service
export { DatabaseService, databaseService, DatabaseServiceError } from './database';
export type { IDatabaseService } from './database';

// Export doctor service
export { DoctorService, doctorService, DoctorServiceError } from './doctor';
export type { IDoctorService } from './doctor';

// Export appointment service
export { AppointmentService, appointmentService, AppointmentServiceError } from './appointment';
export type { IAppointmentService } from './appointment';

// Appointment notification service removed (simplified app)

// Export patient service
export { PatientService, patientService, PatientServiceError } from './patient';
export type { IPatientService } from './patient';

// Export profile setup service
export { ProfileSetupService, profileSetupService } from './profile-setup';

// Export patient stats service
export { PatientStatsService, patientStatsService, PatientStatsServiceError } from './patient-stats';
export type { IPatientStatsService } from './patient-stats';

// Export comprehensive data services
export { 
  comprehensiveDataService, 
  comprehensiveAppointmentService,
  comprehensiveDoctorService,
  comprehensivePatientService,
  UnifiedDataService,
  ComprehensiveAppointmentService,
  ComprehensiveDoctorService,
  ComprehensivePatientService
} from './comprehensive-data-service';

// Export data validation and security services
export {
  inputSanitizer,
  validationSchemas,
  rateLimitService,
  auditLogger,
  dataValidationService,
  InputSanitizer,
  ValidationSchemas,
  RateLimitService,
  AuditLogger,
  DataValidationService
} from './data-validation-service';

export {
  appointmentSecurityMiddleware,
  doctorSecurityMiddleware,
  patientSecurityMiddleware,
  securityUtils,
  AppointmentSecurityMiddleware,
  DoctorSecurityMiddleware,
  PatientSecurityMiddleware,
  SecurityUtils,
  SecurityMiddlewareError
} from './security-middleware';

export type {
  SecurityContext,
  AuditLogEntry,
  SecurityEvent,
  DataAccessEvent,
  AppointmentAuditEvent,
  AuditLogFilters
} from './data-validation-service';

// Analytics and reporting services removed (simplified app)

// Export AI Orchestrator service
export {
  AIOrchestrator,
  aiOrchestrator,
  AIOrchestratorError
} from './aiOrchestrator';

export type {
  IAIOrchestrator
} from './aiOrchestrator';

// Export Doctor Query service
export {
  DoctorQueryService,
  doctorQueryService
} from './doctorQueryService';

export type {
  Location,
  DoctorQueryFilters,
  DoctorWithDistance,
  AvailabilityInfo
} from './doctorQueryService';