import type {
  JourneyAccess,
  JourneyViewer,
  JourneyViewerRole,
  TransitionJourney,
} from '../../../domain/entities/journey.entity';

/**
 * El recorrido que ven el paciente y quien lo acompaña, en el backend
 * simulado.
 *
 * Es el **mismo caso** que el tablero del hospital (T.D., el que reingresó
 * después de perder dos citas) contado de la otra manera: sin códigos de
 * estado, sin siglas y sin la palabra "contrarreferencia". El especialista
 * lee "READMITTED"; el chico lee "tu cita es el viernes 28 y tienes que estar
 * 9:30 en el hospital". Los dos miran el mismo caso.
 *
 * Lo mutable —qué ítems marcó, si el tutor tiene acceso, los mensajes que le
 * mandó— se persiste en localStorage, igual que el resto del mock.
 *
 * Datos 100 % ficticios.
 */

const STORAGE_KEY = 'icode.mock.journey';

interface JourneyStore {
  /** Qué ítems del checklist marcó el paciente. */
  checked: Record<string, boolean>;
  /** Si quien lo acompaña sigue teniendo acceso. */
  guardianAccess: boolean | null;
  /** Mensajes del tutor que el paciente todavía no descartó. */
  messages: { id: string; text: string; sentAt: string; from: string }[];
}

const EMPTY: JourneyStore = {
  checked: {},
  guardianAccess: null,
  messages: [],
};

function read(): JourneyStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as JourneyStore) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

function write(store: JourneyStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

/* ============================================================
   El recorrido del seed
   ============================================================ */

/** La misma cita que el hospital ve en su tablero, dicha para el paciente. */
const JOURNEY: TransitionJourney = {
  initials: 'T.D.',
  age: '18 años',
  state: 'READMITTED',
  diagnosis: 'Distrofia muscular de Duchenne',
  diagnosisPlain:
    'Es una enfermedad de los músculos que hace que pierdan fuerza con el tiempo. No se cura, pero con controles seguidos y los ejercicios de rehabilitación se cuida el corazón, la respiración y la movilidad.',
  followUp:
    'Control con neurología cada 3 meses, corazón y pulmón una vez al año, y rehabilitación todas las semanas.',
  medications: [
    {
      initial: 'D',
      name: 'Deflazacort',
      dose: '30 mg · 1 vez al día, con el desayuno',
      purpose:
        'Frena la pérdida de fuerza. No se deja de tomar de golpe: si un día lo olvidas, avisa en el control.',
    },
    {
      initial: 'C',
      name: 'Calcio + vitamina D3',
      dose: '1 al día, con el almuerzo',
      purpose:
        'Cuida los huesos, que se debilitan con el corticoide. Es la que más se olvida.',
    },
    {
      initial: 'O',
      name: 'Omeprazol',
      dose: '20 mg · en ayunas',
      purpose: 'Protege el estómago del corticoide.',
    },
  ],
  allergies: [
    {
      substance: 'Penicilina',
      detail:
        'A los 9 años le salieron ronchas y se le hinchó la cara. Decirlo SIEMPRE antes de que le pongan cualquier antibiótico.',
    },
  ],
  contacts: [
    {
      role: 'Tu médica del INSN',
      name: 'Dra. Nadia Ortiz',
      detail: 'Neurología pediátrica · (01) 208-0000 anexo 2140',
    },
    {
      role: 'Tu posta',
      name: 'P.S. Año Nuevo — Comas',
      detail: 'Av. Túpac Amaru 3900 · (01) 558-1122',
    },
    {
      role: 'Emergencias',
      name: 'Hospital Sergio Bernales',
      detail: 'Emergencia abierta las 24 horas · (01) 558-0186',
    },
  ],
  checklist: [
    {
      id: 'dosis',
      title: 'Aprenderte tus medicamentos',
      detail:
        'Saber decir qué tomas, cuánto y a qué hora, sin mirar el papel. En el hospital de adultos te lo van a preguntar a ti, no a tu mamá.',
      pendingLabel: 'aprenderte tus dosis',
      done: false,
    },
    {
      id: 'dni',
      title: 'Llevar tu DNI y tu carnet del seguro',
      detail: 'Sin el documento no te pueden registrar en admisión.',
      pendingLabel: 'llevar tu DNI',
      done: false,
    },
    {
      id: 'carta',
      title: 'Guardar la carta que mandó el hospital de niños',
      detail:
        'Es el resumen de tu historia. Te la entregan en la posta; llévala impresa o en el celular.',
      pendingLabel: 'guardar tu carta',
      done: false,
    },
    {
      id: 'preguntas',
      title: 'Anotar tus preguntas',
      detail:
        'Lo que quieras preguntar en la consulta. Escríbelo antes: adentro se olvida.',
      pendingLabel: 'anotar tus preguntas',
      done: false,
    },
    {
      id: 'alergia',
      title: 'Saber decir tu alergia',
      detail: 'Penicilina. Decirlo antes de cualquier antibiótico.',
      pendingLabel: 'saber decir tu alergia',
      done: false,
    },
  ],
  guide: [
    {
      question: '¿Qué cambia ahora que tengo 18?',
      answer:
        'Te atiende un hospital de adultos en vez del hospital de niños. Es el mismo tratamiento; cambia el lugar y el equipo. Tu médica del INSN queda disponible para dudas del traspaso.',
    },
    {
      question: '¿Tengo que ir con alguien?',
      answer:
        'Puedes ir solo o acompañado, como prefieras. En adultos las preguntas te las hacen a ti, así que conviene que sepas tus medicamentos.',
    },
    {
      question: '¿Y si no puedo ir ese día?',
      answer:
        'Avisa a tu posta antes de la fecha para que te reprogramen. Si no avisas y no vas, la cita se pierde y conseguir otra tarda más.',
    },
    {
      question: '¿Qué llevo?',
      answer:
        'DNI, carnet del seguro, la carta del hospital de niños y la lista de lo que tomas. Si tienes exámenes recientes, llévalos también.',
    },
  ],
  healthPost: {
    id: 'ps-comas',
    name: 'P.S. Año Nuevo — Comas',
    district: 'Comas',
    distanceKm: 1.6,
  },
  appointment: {
    hospital: 'Hospital Sergio Bernales',
    specialist: 'Dr. Sergio Antúnez — Neurología de adultos',
    date: '2026-08-28T09:00',
    reason: 'Primera consulta en el hospital de adultos',
    managedBy: 'P.S. Año Nuevo — Comas',
  },
  appointmentAddress: 'Av. Túpac Amaru km 14.5, Comas · Consultorios externos',
  arriveMinutesEarly: 30,
  admissionNote:
    'Preséntate en admisión del pabellón de consultorios externos con tu DNI. Ahí te dan el ticket para neurología.',
  summaryApproved: true,
  attendingDoctor: 'Dra. Nadia Ortiz',
  specialty: 'Neurología',
  guardian: {
    firstName: 'Rosa',
    relationship: 'madre',
    hasAccess: true,
  },
  pendingMessage: null,
};

/* ============================================================
   Quién mira
   ============================================================ */

/**
 * Los permisos de cada rol. No es lo mismo mirar la propia información que
 * acompañar a alguien que la tiene: el dueño marca su preparación y decide
 * quién la ve; quien acompaña solo puede recordarle.
 */
function viewerFor(role: JourneyViewerRole, guardian: string): JourneyViewer {
  return role === 'OWNER'
    ? {
        role,
        relationship: 'Tú',
        canEditChecklist: true,
        canSendReminder: false,
        canManageGuardianAccess: true,
      }
    : {
        role,
        relationship: guardian,
        canEditChecklist: false,
        canSendReminder: true,
        canManageGuardianAccess: false,
      };
}

/** El recorrido con lo que se haya tocado en esta demo. */
function currentJourney(): TransitionJourney {
  const store = read();
  return {
    ...JOURNEY,
    checklist: JOURNEY.checklist.map((item) => ({
      ...item,
      done: store.checked[item.id] ?? item.done,
    })),
    guardian: {
      // El mock siempre tiene un tutor de ejemplo — el "| null" del tipo
      // real es para el caso (ya adulto, sin tutor activo) que este JSON
      // fijo no representa.
      ...JOURNEY.guardian!,
      hasAccess: store.guardianAccess ?? JOURNEY.guardian!.hasAccess,
    },
    pendingMessage: store.messages.at(-1) ?? null,
  };
}

/**
 * Lo que ve cada uno. Si el paciente le quitó el acceso, el tutor recibe un
 * 200 con `REVOKED` y las iniciales, y nada más: ni el diagnóstico, ni la
 * cita, ni los teléfonos.
 */
export function journeyFor(role: JourneyViewerRole): JourneyAccess {
  const journey = currentJourney();
  // Igual que en currentJourney(): este mock siempre construye un tutor.
  const viewer = viewerFor(role, journey.guardian!.relationship);

  if (role === 'GUARDIAN' && !journey.guardian!.hasAccess) {
    return {
      access: 'REVOKED',
      viewer,
      subjectInitials: journey.initials,
    };
  }

  return { access: 'GRANTED', viewer, journey };
}

/* ---------- escrituras ---------- */

export function setChecklistItem(itemId: string, done: boolean): boolean {
  if (!JOURNEY.checklist.some((item) => item.id === itemId)) {
    return false;
  }
  const store = read();
  store.checked[itemId] = done;
  write(store);
  return true;
}

export function addMessage(text: string, from: string): void {
  const store = read();
  store.messages.push({
    id: `msg-${store.messages.length + 1}-${text.length}`,
    text,
    sentAt: new Date().toISOString(),
    from,
  });
  write(store);
}

export function dismissMessage(messageId: string): void {
  const store = read();
  store.messages = store.messages.filter((message) => message.id !== messageId);
  write(store);
}

export function setGuardianAccess(hasAccess: boolean): void {
  const store = read();
  store.guardianAccess = hasAccess;
  write(store);
}
