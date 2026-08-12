import { AuthService } from './application/services/auth.service';
import { PatientService } from './application/services/patient.service';
import { JourneyService } from './application/services/journey.service';
import { ReferralService } from './application/services/referral.service';
import { authRepository } from './infrastructure/repositories/auth.repository';
import { patientRepository } from './infrastructure/repositories/patient.repository';
import { journeyRepository } from './infrastructure/repositories/journey.repository';
import { referralRepository } from './infrastructure/repositories/referral.repository';
import { tokenStorage } from './infrastructure/storage/token-storage';

/**
 * Composition root: el único lugar de todo el front donde se "inyectan" las
 * implementaciones concretas de infrastructure en los servicios de
 * application. Ningún otro archivo importa un repositorio directamente, así
 * que cambiar de implementación (o pasarle un fake en un test) se hace aquí y
 * en ningún otro lado. Un DI container sería sobre-diseño para esta escala.
 *
 * Ojo: trabajar con datos estáticos NO se decide aquí. Los repositorios son
 * siempre los reales; lo que se simula es la red, más abajo (ver
 * infrastructure/http/api-client.ts y su carpeta mock/).
 */
export const authService = new AuthService(authRepository, tokenStorage);
export const patientService = new PatientService(patientRepository);
export const referralService = new ReferralService(referralRepository);
export const journeyService = new JourneyService(journeyRepository);
