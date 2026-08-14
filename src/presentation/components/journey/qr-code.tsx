import { useMemo } from 'react';
import QRCode from 'qrcode';

/** Quiet zone recomendada por la especificación QR: sin margen, algunos lectores no lo enfocan bien. */
const QUIET_ZONE = 4;

/**
 * El QR como SVG dibujado módulo a módulo, no una imagen ni un
 * `dangerouslySetInnerHTML` con el string que arma la librería: React
 * controla cada `<rect>`, así el color sigue el tema (claro/oscuro) y no
 * hay HTML ajeno entrando al DOM aunque el valor sea uno que generamos
 * nosotros mismos.
 */
export function QrCode({
  value,
  label,
}: Readonly<{ value: string; label: string }>) {
  const modules = useMemo(() => QRCode.create(value, {
    errorCorrectionLevel: 'M',
  }).modules, [value]);

  const size = modules.size;
  const total = size + QUIET_ZONE * 2;
  const cells: number[][] = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (modules.get(row, col)) {
        cells.push([row, col]);
      }
    }
  }

  return (
    <svg
      className="jn-qr"
      viewBox={`0 0 ${total} ${total}`}
      role="img"
      aria-label={label}
    >
      <rect width={total} height={total} fill="#fff" />
      {cells.map(([row, col]) => (
        <rect
          key={`${row}-${col}`}
          x={col + QUIET_ZONE}
          y={row + QUIET_ZONE}
          width={1}
          height={1}
          fill="#1b1030"
        />
      ))}
    </svg>
  );
}
