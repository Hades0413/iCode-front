import { env } from '../../infrastructure/config/env';

/**
 * Los perfiles del hospital que se pueden probar en el prototipo.
 *
 * Son **dos y nada más**, porque son las dos oficinas que trabajan sobre los
 * mismos pacientes: el médico firma la historia clínica y reclama, el área de
 * Referencias avisa a la posta y manda la carta. Sin esta lista, para ver la
 * otra mitad habría que acordarse del usuario exacto del seed.
 *
 * Un tercer perfil "que ve todo" no entra acá aunque el seed tenga un usuario
 * con todos los permisos: quien elige por dónde entrar quiere hacer SU
 * trabajo, y una opción que mezcla las dos bandejas confunde justo lo que esta
 * pantalla intenta separar.
 *
 * Elegir un perfil **no es un truco de la UI**: hace un login de verdad con
 * las credenciales de ese usuario, así que los permisos que llegan son los
 * que dice el servidor y un 403 sigue siendo un 403. Por eso se elige en el
 * ingreso y en ningún otro lado: dentro de la app no hay forma de ponerse el
 * sombrero de otra oficina sin volver a entrar.
 *
 * Solo existe en modo prototipo (ver env.demoLogin): en producción no hay una
 * contraseña compartida con la que saltar de usuario, y no debería haberla.
 */
/** Qué dibujo lo representa. La presentación decide el icono concreto. */
export type DemoProfileGlyph = 'clinic' | 'referrals' | 'patient' | 'guardian';

export interface DemoProfile {
  userName: string;
  /** Cómo se llama el rol en el hospital. */
  role: string;
  /** Cómo se presenta el que entra: "Soy el especialista". */
  claim: string;
  /** Qué hace, en una línea. */
  detail: string;
  glyph: DemoProfileGlyph;
}

const PROFILES: readonly DemoProfile[] = [
  {
    userName: 'medico',
    role: 'Especialista de pediatría',
    claim: 'Soy el médico',
    detail:
      'Preparo y firmo la historia clínica de transferencia de mis pacientes',
    glyph: 'clinic',
  },
  {
    userName: 'referencias',
    role: 'Referencias y contrarreferencias',
    claim: 'Soy del área de referencias',
    detail: 'Aviso a la posta 2 meses antes y mando la carta cuando cumplen 18',
    glyph: 'referrals',
  },
  {
    userName: 'paciente',
    role: 'Paciente',
    claim: 'Soy el paciente',
    detail: 'Veo mi cita, mi tratamiento y lo que tengo que preparar',
    glyph: 'patient',
  },
  {
    userName: 'tutor',
    role: 'Madre, padre o tutor',
    claim: 'Acompaño a un paciente',
    detail: 'Veo su recorrido y puedo recordarle lo que le falta',
    glyph: 'guardian',
  },
];

/** Los perfiles disponibles, o ninguno si el prototipo no está habilitado. */
export function demoProfiles(): readonly DemoProfile[] {
  return env.demoLogin ? PROFILES : [];
}
