import type { JourneyAccess } from '../../domain/entities/journey.entity';
import type { JourneyRepositoryPort } from '../../application/ports/journey-repository.port';
import { apiClient } from '../http/api-client';

/**
 * Implementación real de JourneyRepositoryPort.
 *
 * Todos los endpoints cuelgan de `/journey` sin id: el recorrido es el de la
 * sesión. Y todos contestan el recurso completo, incluido el caso en que el
 * paciente le revocó el acceso al tutor — que llega como 200 con
 * `access: 'REVOKED'` y no como 403, porque no es un error sino un estado
 * legítimo que la app tiene que saber mostrar con cara amable.
 */
class HttpJourneyRepository implements JourneyRepositoryPort {
  async getJourney(): Promise<JourneyAccess> {
    const { data } = await apiClient.get<JourneyAccess>('/journey');
    return data;
  }

  async setChecklistItem(
    itemId: string,
    done: boolean,
  ): Promise<JourneyAccess> {
    const { data } = await apiClient.patch<JourneyAccess>(
      `/journey/checklist/${encodeURIComponent(itemId)}`,
      { done },
    );
    return data;
  }

  async remindPatient(text: string): Promise<JourneyAccess> {
    const { data } = await apiClient.post<JourneyAccess>('/journey/reminders', {
      text,
    });
    return data;
  }

  async setGuardianAccess(hasAccess: boolean): Promise<JourneyAccess> {
    const { data } = await apiClient.put<JourneyAccess>(
      '/journey/guardian-access',
      { hasAccess },
    );
    return data;
  }

  async dismissMessage(messageId: string): Promise<JourneyAccess> {
    const { data } = await apiClient.delete<JourneyAccess>(
      `/journey/messages/${encodeURIComponent(messageId)}`,
    );
    return data;
  }
}

export const journeyRepository = new HttpJourneyRepository();
