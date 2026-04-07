import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { CalendarDashboard } from '../../../components/calendar-dashboard';

export default function AppHomePage() {
  const role = (cookies().get('user_role')?.value ?? '').toUpperCase();

  if (role === 'ADMIN') {
    redirect('/app/admin-home');
  }

  const isDriver = role === 'DRIVER';

  return (
    <main>
      <h1>Agenda Servizi</h1>
      <p>
        {isDriver
          ? 'Vista operativa dei servizi assegnati al driver loggato, con navigazione mese / settimana / giorno.'
          : 'Vista operativa servizi con navigazione mese / settimana / giorno.'}
      </p>
      <CalendarDashboard driverMode={isDriver} />
    </main>
  );
}
