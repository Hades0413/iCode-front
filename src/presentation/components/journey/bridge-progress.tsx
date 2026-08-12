/**
 * El puente con el propio paciente cruzándolo.
 *
 * Es la barra de progreso de la preparación, contada con la metáfora del
 * producto: a la izquierda el hospital de niños, a la derecha el de adultos,
 * y el punto —él— avanza por el arco cada vez que completa un paso. El tramo
 * caminado se pinta sólido; el que falta queda punteado.
 *
 * No es un adorno sobre un porcentaje: es el mensaje de la app. Cruzar no le
 * pasa *a* él, lo hace él — y verse a sí mismo avanzando cuando marca un ítem
 * dice eso mejor que cualquier texto.
 */
export function BridgeProgress({ progress }: Readonly<{ progress: number }>) {
  const t = Math.min(Math.max(progress, 0), 1);

  // El arco es una Bézier cuadrática; el punto se ubica evaluándola en t.
  const P0 = { x: 22, y: 64 };
  const P1 = { x: 150, y: -6 };
  const P2 = { x: 278, y: 64 };
  const u = 1 - t;
  const x = u * u * P0.x + 2 * u * t * P1.x + t * t * P2.x;
  const y = u * u * P0.y + 2 * u * t * P1.y + t * t * P2.y;

  return (
    <svg
      className="jn-bridge"
      viewBox="0 0 300 92"
      fill="none"
      role="img"
      aria-label={`Llevas ${Math.round(t * 100)} % del cruce preparado`}
    >
      {/* Las dos orillas. */}
      <rect
        x="6"
        y="52"
        width="30"
        height="30"
        rx="6"
        className="jn-bridge-b"
      />
      <path d="M21 60v8M17 64h8" className="jn-bridge-x" />
      <rect
        x="264"
        y="44"
        width="30"
        height="38"
        rx="6"
        className="jn-bridge-b"
      />
      <path d="M279 54v8M275 58h8" className="jn-bridge-x" />

      {/* El arco: lo que falta, punteado; lo caminado, sólido y creciendo. */}
      <path
        d="M22 64 Q150 -6 278 64"
        className="jn-bridge-rest"
        pathLength={1}
      />
      <path
        d="M22 64 Q150 -6 278 64"
        className="jn-bridge-done"
        pathLength={1}
        style={{ ['--t' as string]: t }}
      />

      {/* Él, cruzando. El grupo se mueve con transform para poder animarlo. */}
      <g
        className="jn-bridge-me"
        style={{ transform: `translate(${x}px, ${y}px)` }}
      >
        <circle r="9" className="jn-bridge-halo" />
        <circle r="5.5" className="jn-bridge-dot" />
      </g>
    </svg>
  );
}
