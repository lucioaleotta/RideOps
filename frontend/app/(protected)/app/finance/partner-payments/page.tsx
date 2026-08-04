import { cookies } from 'next/headers';
import { FinanceModule } from '../../../../../features/finance/finance-module';

export default function FinancePartnerPaymentsPage() {
  const role = (cookies().get('user_role')?.value ?? '').toUpperCase();

  if (role !== 'GESTIONALE') {
    return (
      <main>
        <article className="dashboard-card">
          <h1 style={{ marginTop: 0 }}>Accesso negato</h1>
          <p>La sezione Report Pagamenti Partner è riservata al ruolo Gestionale.</p>
        </article>
      </main>
    );
  }

  return <FinanceModule section="partner-payments" />;
}
