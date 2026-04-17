import Link from 'next/link';
import { AdminUsersPanel } from '../../../../components/admin-users-panel';

export default function AdminPage() {
  return (
    <main>
      <div className="admin-page-header">
        <div className="admin-page-header-icon" aria-hidden="true">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.74" />
          </svg>
        </div>
        <div className="admin-page-header-text">
          <h1 className="admin-page-title">Pannello Amministrativo Utenti</h1>
          <p className="admin-page-subtitle">Gestione utenti con modifica dati, stato account e tracciamento operazioni amministrative.</p>
        </div>
      </div>
      <div style={{ marginBottom: 20 }}>
        <Link href="/app/admin/tenants" className="primary-button">
          <span style={{ marginRight: 6 }}>→</span> Vai a Gestione Clienti
        </Link>
      </div>
      <AdminUsersPanel />
    </main>
  );
}
