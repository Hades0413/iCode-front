import type { JourneyAccess } from '../../domain/entities/journey.entity';
import type { JourneyRepositoryPort } from '../ports/journey-repository.port';

/** Se lanza cuando el mensaje del tutor llega vacío. */
export class EmptyReminderError extends Error {
  constructor() {
    super('Escribe algo para que le llegue.');
    this.name = 'EmptyReminderError';
  }
}

/**
 * Los casos de uso de la app del paciente y de quien lo acompaña.
 *
 * Todas las acciones devuelven el recorrido completo y no un pedacito: son
 * cambios chiquitos con efectos en varios lugares —marcar un ítem mueve el
 * avance y el "te falta ___", quitarle el acceso al tutor lo saca de la
 * pantalla— y reconstruir eso en el cliente es la manera de que la app diga
 * algo distinto del servidor.
 */
export class JourneyService {
  private readonly journeyRepository: JourneyRepositoryPort;

  constructor(journeyRepository: JourneyRepositoryPort) {
    this.journeyRepository = journeyRepository;
  }

  async getJourney(): Promise<JourneyAccess> {
    return this.journeyRepository.getJourney();
  }

  async setChecklistItem(
    itemId: string,
    done: boolean,
  ): Promise<JourneyAccess> {
    return this.journeyRepository.setChecklistItem(itemId, done);
  }

  async remindPatient(text: string): Promise<JourneyAccess> {
    const message = text.trim();
    if (message === '') {
      throw new EmptyReminderError();
    }
    return this.journeyRepository.remindPatient(message);
  }

  async setGuardianAccess(hasAccess: boolean): Promise<JourneyAccess> {
    return this.journeyRepository.setGuardianAccess(hasAccess);
  }

  async dismissMessage(messageId: string): Promise<JourneyAccess> {
    return this.journeyRepository.dismissMessage(messageId);
  }
}
