import type { ReactElement } from 'react';
import { BellIcon, ChevronIcon, PinIcon, PulseIcon, TrayIcon } from '../icons';
import type { DemoProfile, DemoProfileGlyph } from '../../routes/demo-profiles';

const GLYPH: Record<DemoProfileGlyph, () => ReactElement> = {
  clinic: PulseIcon,
  referrals: TrayIcon,
  patient: PinIcon,
  guardian: BellIcon,
};

/**
 * Con qué perfil entrar.
 *
 * En el hospital son dos oficinas distintas trabajando sobre los mismos
 * pacientes, y cada una tiene su pantalla: preguntar quién eres **antes** de
 * entrar evita que el especialista aterrice en una bandeja de avisos que no le
 * toca, o que el área caiga en un tablero clínico donde no puede hacer nada.
 *
 * Cada opción hace un login de verdad con ese usuario (ver
 * routes/demo-profiles.ts): no es un modo de la pantalla, y los permisos que
 * llegan son los que dice el servidor.
 */
export function ProfileChoice({
  profiles,
  busyUser,
  onChoose,
  disabled = false,
}: Readonly<{
  profiles: readonly DemoProfile[];
  /** El perfil con el ingreso en vuelo. */
  busyUser: string | null;
  onChoose: (profile: DemoProfile) => void;
  disabled?: boolean;
}>) {
  return (
    <div className="choice">
      {profiles.map((profile) => {
        const Glyph = GLYPH[profile.glyph];
        const isBusy = busyUser === profile.userName;
        return (
          <button
            key={profile.userName}
            type="button"
            className="choice-i"
            disabled={disabled}
            onClick={() => onChoose(profile)}
          >
            <span className="choice-g" aria-hidden="true">
              <Glyph />
            </span>
            <span className="choice-t">
              <b>{profile.claim}</b>
              <span className="mini">{profile.detail}</span>
            </span>
            <span className="choice-a">
              {isBusy ? <i className="spin" /> : <ChevronIcon />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
