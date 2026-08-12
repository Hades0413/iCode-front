import { useState, type SubmitEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { env } from '../../infrastructure/config/env';
import { getApiErrorMessage } from '../../common/utils/get-api-error-message';
import { ProfileChoice } from '../components/auth/profile-choice';
import { BridgeGlyph, WarnIcon } from '../components/icons';
import { useAuth } from '../hooks/use-auth';
import { demoProfiles } from '../routes/demo-profiles';
import { landingRoute } from '../routes/workspace-sections';
import '../styles/auth.css';

/**
 * Ingreso. En modo prototipo (env.demoLogin) lo primero que se pregunta es
 * **quién eres**: el especialista de pediatría y el área de referencias son
 * dos oficinas distintas con dos pantallas distintas, y elegir aquí es lo que
 * hace que cada uno entre a la suya en vez de aterrizar en la del otro.
 *
 * Elegir un perfil NO es un modo de la pantalla: hace el mismo
 * POST /auth/login que haría cualquiera, con el usuario de ese rol. Se crea
 * una sesión de verdad, con su token opaco, y GET /auth/me trae los permisos.
 * Lo único que no pasa es que alguien escriba las credenciales.
 *
 * Sin modo prototipo no hay perfiles que ofrecer —las credenciales las tiene
 * cada persona— y queda el formulario de siempre, que exige usuario y
 * contraseña.
 */

/** Los otros usuarios del seed, para probar permisos sin editar .env.local. */
const OTHER_DEMO_USERS = [
  { userName: 'operador', hint: 'solo lectura: no firma ni avisa' },
  { userName: 'sinpermisos', hint: 'recibe 403 en la lista' },
];

export function LoginPage() {
  const { login, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const demo = env.demoLogin;

  // En modo prototipo los campos arrancan puestos: se ve como un login real
  // y se entra sin escribir.
  const [userName, setUserName] = useState(demo?.userName ?? '');
  const [password, setPassword] = useState(demo?.password ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);

  // Con sesión válida el formulario no tiene nada que hacer (por ejemplo si
  // se recarga o si alguien vuelve a /login desde el tablero).
  if (isLoading) {
    return null;
  }
  if (user) {
    // Cada rol entra por su propia pantalla, no todos al consultorio.
    return <Navigate to={landingRoute(user)} replace />;
  }

  async function enter(credentials: { userName: string; password: string }) {
    setError(null);
    setSubmitting(credentials.userName);
    try {
      const profile = await login(credentials.userName, credentials.password);
      navigate(landingRoute(profile), { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Usuario o contraseña inválidos'));
    } finally {
      setSubmitting(null);
    }
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    // Campos vacíos en modo prototipo: se entra con el usuario de demo en
    // lugar de mostrar un error por algo que aquí no importa.
    const typed = { userName: userName.trim(), password };
    const credentials =
      demo && (!typed.userName || !typed.password) ? demo : typed;
    void enter(credentials);
  }

  const isBusy = submitting !== null;
  const profiles = demoProfiles();

  return (
    <div className="p18 auth" data-role="esp">
      <aside className="auth-aside">
        <div className="auth-brand">
          <span className="glyph">
            <BridgeGlyph />
          </span>
          Puente 18+
          <span className="sub">INSN San Borja</span>
        </div>

        <div className="auth-pitch">
          <h2>De pediatría a adultos sin que nadie se caiga en el camino.</h2>
          <p>
            A los 18 el sistema pediátrico deja de atender. Este es el tablero
            que vigila que cada paciente llegue al otro lado.
          </p>
        </div>

        <div className="auth-flow">
          <div className="auth-flow-track">
            <i />
          </div>
          <ol className="auth-flow-steps">
            <li>
              <div className="sn">1 · pediatría</div>
              <div className="st">INSN San Borja</div>
              <div className="sd">Prepara su resumen clínico</div>
            </li>
            <li>
              <div className="sn">2 · primer nivel</div>
              <div className="st">Posta del barrio</div>
              <div className="sd">Le consigue la cita</div>
            </li>
            <li>
              <div className="sn">3 · adultos</div>
              <div className="st">Hospital de adultos</div>
              <div className="sd">Lo atiende de ahí en adelante</div>
            </li>
          </ol>
        </div>

        <p className="auth-foot">
          Prototipo · Hackatón Niño San Borja 2026 · datos ficticios
          <span className="auth-credit">
            Puente Villena Rey, Miraflores · foto de Avodrocc (CC BY 2.0)
          </span>
        </p>
      </aside>

      <main className="auth-panel">
        <form className="auth-form" onSubmit={handleSubmit}>
          <div>
            <h1 className="auth-t">
              {demo ? '¿Quién eres?' : 'Iniciar sesión'}
            </h1>
            <p className="auth-lead">
              {demo
                ? 'Elige tu rol: cada oficina entra a su propia pantalla.'
                : 'Con tu usuario del hospital.'}
            </p>
          </div>

          {/* La elección de rol va primero y el formulario queda abajo: en el
              prototipo lo que importa es desde qué oficina se mira, no las
              credenciales. */}
          {profiles.length > 0 && (
            <>
              <ProfileChoice
                profiles={profiles}
                busyUser={submitting}
                disabled={isBusy}
                onChoose={(profile) =>
                  void enter({
                    userName: profile.userName,
                    // Todos los usuarios del seed comparten la misma
                    // contraseña de prueba (ver el README).
                    password: demo?.password ?? '',
                  })
                }
              />
              <div className="auth-or">
                <span>o entra con un usuario</span>
              </div>
            </>
          )}

          <div className="fg">
            <label htmlFor="userName">Usuario</label>
            <input
              id="userName"
              name="userName"
              className="inp"
              autoComplete="username"
              value={userName}
              onChange={(event) => setUserName(event.target.value)}
              // En modo prototipo no se exige nada: entrar con los campos
              // vacíos es válido.
              required={!demo}
              disabled={isBusy}
            />
          </div>

          <div className="fg">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              name="password"
              type="password"
              className="inp"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required={!demo}
              disabled={isBusy}
            />
          </div>

          {error && (
            <p role="alert" className="auth-error">
              <WarnIcon />
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn btn-pri btn-lg btn-block"
            disabled={isBusy}
          >
            {submitting !== null && submitting === userName.trim() ? (
              <>
                <span className="spin" />
                Ingresando…
              </>
            ) : (
              'Ingresar'
            )}
          </button>

          {demo && (
            <div className="auth-demo">
              <div>
                <b>No hace falta ninguna cuenta.</b> Cualquiera de los perfiles
                de arriba entra directo; el formulario acepta cualquier usuario
                del seed.
              </div>
              <div className="auth-demo-row">
                <span className="lbl">O prueba como</span>
                {OTHER_DEMO_USERS.map((other) => (
                  <button
                    key={other.userName}
                    type="button"
                    className="auth-as"
                    disabled={isBusy}
                    title={other.hint}
                    onClick={() =>
                      void enter({
                        userName: other.userName,
                        // Todos los usuarios del seed comparten la misma
                        // contraseña de prueba (ver el README).
                        password: demo.password,
                      })
                    }
                  >
                    {submitting === other.userName ? '…' : other.userName}
                  </button>
                ))}
              </div>
            </div>
          )}
        </form>
      </main>
    </div>
  );
}
