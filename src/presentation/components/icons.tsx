/**
 * Los iconos del prototipo de diseño (puente-18.src.html, objeto ICO),
 * portados uno a uno. Son inline y no un paquete de iconos porque son
 * pocos, pesan nada y así el trazo queda exactamente como lo dibujó el
 * diseño: heredan currentColor y el tamaño está fijado por el sistema.
 */

export function BridgeGlyph() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      aria-hidden="true"
    >
      {/* currentColor y no un blanco fijo: el mismo puente se dibuja sobre
          el riel oscuro y sobre una tarjeta clara. */}
      <path
        d="M1 7c1.6-3.4 6.4-3.4 8 0"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M1 7V4.2M9 7V4.2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CameraIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2 5.6c0-.66.54-1.2 1.2-1.2h1.4l.7-1.2c.2-.34.56-.55.96-.55h3.48c.4 0 .76.21.96.55l.7 1.2h1.4c.66 0 1.2.54 1.2 1.2v6.8c0 .66-.54 1.2-1.2 1.2H3.2c-.66 0-1.2-.54-1.2-1.2z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <circle
        cx="8"
        cy="9"
        r="2.4"
        stroke="currentColor"
        strokeWidth="1.3"
      />
    </svg>
  );
}

export function ChevronIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4.5 2.5L8 6l-3.5 3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function WarnIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M7 1.6l5.6 10.2H1.4L7 1.6z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="M7 5.6v2.9"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <circle cx="7" cy="10.3" r=".75" fill="currentColor" />
    </svg>
  );
}

export function InfoIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="7" cy="7" r="5.9" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M7 6.2v4"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <circle cx="7" cy="4.1" r=".8" fill="currentColor" />
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 13 13"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="5.4" cy="5.4" r="4" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M8.4 8.4l3 3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function TrayIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2.4 11.2h4l1 2h5.2l1-2h4M2.4 11.2L4.8 3.6h10.4l2.4 7.6v5.2H2.4v-5.2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PulseIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2 10.4h3.4L7.2 6l2.6 8 2-4.6h4.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2 6.3l2.6 2.6L10 3.5"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** El aviso a la posta. */
export function BellIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3.6 6a3.4 3.4 0 016.8 0c0 2.4 1 3.4 1 3.4H2.6s1-1 1-3.4z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="M5.9 11.4a1.3 1.3 0 002.2 0"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Lo que hace la IA: una chispa. Un destello grande y uno chico — es el
 * gesto que ya significa "esto lo propuso un modelo" en cualquier producto,
 * y aquí además avisa que lo que viene abajo todavía no lo firmó nadie.
 */
export function SparkIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5.6 1.4l1 2.6 2.6 1-2.6 1-1 2.6-1-2.6-2.6-1 2.6-1 1-2.6z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M10.7 8.2l.5 1.4 1.4.5-1.4.5-.5 1.4-.5-1.4-1.4-.5 1.4-.5.5-1.4z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Firmar: una pluma sobre la línea. */
export function SignIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2.4 9.2l6-6a1.3 1.3 0 011.9 0l.5.5a1.3 1.3 0 010 1.9l-6 6-2.9.7.5-3.1z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="M2 12.6h10"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** La posta: un punto en el mapa, cerca de la casa. */
export function PinIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M10 17.4s5.2-4.6 5.2-8.4a5.2 5.2 0 10-10.4 0c0 3.8 5.2 8.4 5.2 8.4z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle
        cx="10"
        cy="8.8"
        r="1.9"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

/**
 * Las notificaciones del médico: la campana con su punto. Es OTRA campana que
 * BellIcon a propósito — esa es "avisar a alguien" (una acción) y esta es
 * "tienes pendientes" (un estado); usar el mismo dibujo para las dos haría
 * que ninguna signifique nada.
 */
export function NotificationIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4.4 7.6a4.6 4.6 0 019.2 0c0 3.2 1.3 4.5 1.3 4.5H3.1s1.3-1.3 1.3-4.5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 14.7a1.6 1.6 0 003 0"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="13.6" cy="3.6" r="2.4" fill="currentColor" />
    </svg>
  );
}

/** La casa: la pestaña de inicio de la app del paciente. */
export function HomeIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3.4 9.4 10 3.6l6.6 5.8M5.2 8.6v7.8h9.6V8.6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.4 16.4v-4.2h3.2v4.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** La persona: la pestaña "Yo". */
export function UserIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="10"
        cy="6.6"
        r="3.2"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M3.8 17c.9-3 3.3-4.6 6.2-4.6s5.3 1.6 6.2 4.6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Los pasos de la preparación. */
export function StepsIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3.4 10.2 6 12.8l4-4.6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.6 14.4h6M10.6 5.8h6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Cerrar sesión. */
export function ExitIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6.2 13.4H3.4V2.6h2.8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.4 5.4L13 8l-2.6 2.6M12.6 8H6.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LockIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="2.6"
        y="6"
        width="8.8"
        height="6.4"
        rx="1.6"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path
        d="M4.7 6V4.4a2.3 2.3 0 014.6 0V6"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}
