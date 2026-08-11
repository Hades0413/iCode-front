import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/use-auth';

export function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  if (!user) {
    return null;
  }

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <h1>Puente 18+</h1>
        <button type="button" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </header>

      <section className="dashboard-card">
        <h2>
          {user.firstName} {user.lastName}
        </h2>
        <p>
          {user.userName}
          {user.email ? ` · ${user.email}` : ''}
        </p>

        <h3>Permisos efectivos</h3>
        {user.permissions.length === 0 ? (
          <p>Este usuario no tiene permisos asignados.</p>
        ) : (
          <ul className="permission-list">
            {user.permissions.map((code) => (
              <li key={code}>
                <code>{code}</code>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
