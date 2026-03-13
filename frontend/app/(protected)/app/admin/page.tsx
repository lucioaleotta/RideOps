import { AdminUsersPanel } from '../../../../components/admin-users-panel';

export default function AdminPage() {
  return (
    <main>
      <h1>User Management (Admin)</h1>
      <p>Gestione base utenti: creazione, assegnazione ruolo e abilitazione/disabilitazione.</p>
      <AdminUsersPanel />
    </main>
  );
}
