import { LockIcon } from '../icons';

/**
 * Lo que ve quien acompaña cuando el paciente le quitó el acceso.
 *
 * No es una pantalla de error y por eso no se parece a una: el servidor
 * contesta 200 con este estado, no un 403. El paciente está en su derecho —
 * la información es suya— y quien acompaña merece enterarse con una
 * explicación, no con un "algo salió mal" que lo deje pensando que la app se
 * rompió.
 *
 * Se dicen las iniciales y nada más. Ni el diagnóstico, ni la cita, ni los
 * teléfonos: "sin acceso" tiene que significar sin acceso.
 */
export function RevokedScreen({
  subjectInitials,
}: Readonly<{ subjectInitials: string }>) {
  return (
    <section className="jn-card jn-revoked">
      <span className="jn-revoked-i" aria-hidden="true">
        <LockIcon />
      </span>
      <h2 className="jn-t">
        Ya no tienes acceso al recorrido de {subjectInitials}
      </h2>
      <p className="jn-lead">
        Ahora que cumplió 18, su información de salud es suya y él decide quién
        la ve. Si quiere, puede volver a darte acceso desde su celular.
      </p>
      <p className="jn-note">
        Si necesitas hablar de su tratamiento, lo mejor es pedírselo a él o
        acompañarlo a su próxima consulta.
      </p>
    </section>
  );
}
