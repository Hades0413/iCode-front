import type {
  AppointmentReport,
  JourneyAccess,
} from '../../domain/entities/journey.entity';

/**
 * Lo que necesita la app del paciente y de quien lo acompaña.
 *
 * No hay un `patientId` en ninguna firma: el recorrido que se devuelve es el
 * de **la sesión**. Un paciente pide "mi recorrido" y un tutor pide "el
 * recorrido del que acompaño"; que el id viajara en la URL sería invitar a
 * probar el de al lado, y del otro lado hay una historia clínica.
 */
export interface JourneyRepositoryPort {
  /** El recorrido, o el aviso de que el paciente revocó el acceso. */
  getJourney(): Promise<JourneyAccess>;

  /** Marca o desmarca un ítem de la preparación. Solo el dueño. */
  setChecklistItem(itemId: string, done: boolean): Promise<JourneyAccess>;

  /** El recordatorio que el tutor le manda al paciente. */
  remindPatient(text: string): Promise<JourneyAccess>;

  /** El paciente le da o le quita el acceso a quien lo acompaña. */
  setGuardianAccess(hasAccess: boolean): Promise<JourneyAccess>;

  /** El paciente descarta un mensaje que ya leyó. */
  dismissMessage(messageId: string): Promise<JourneyAccess>;

  /** El paciente registra una cita que consiguió por su cuenta. */
  reportAppointment(report: AppointmentReport): Promise<JourneyAccess>;

  /** El paciente genera (o regenera) su código único de consulta. */
  generateConsultationCode(): Promise<JourneyAccess>;
}
