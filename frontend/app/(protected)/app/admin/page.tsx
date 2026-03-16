import { AdminUsersPanel } from '../../../../components/admin-users-panel';

export default function AdminPage() {
  return (
    <main>
      <h1>Pannello Amministrativo Utenti</h1>
      <p>Gestione utenti con modifica dati, stato account e tracciamento operazioni amministrative.</p>
      <AdminUsersPanel />
    </main>
  );
}
