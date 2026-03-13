import { cookies } from 'next/headers';
import { CalendarDashboard } from '../../../components/calendar-dashboard';
import { FleetDeadlinesAlerts } from '../../../components/fleet-deadlines-alerts';

export default function AppHomePage() {
  const role = (cookies().get('user_role')?.value ?? '').toUpperCase();
  const isDriver = role === 'DRIVER';

  return (
    <main>
      <h1>Calendar Dashboard</h1>
      <p>
        {isDriver
          ? 'Vista operativa dei servizi assegnati al driver loggato, con navigazione mese / settimana / giorno.'
          : 'Vista operativa servizi con navigazione mese / settimana / giorno.'}
      </p>
      {!isDriver && <FleetDeadlinesAlerts />}
      <CalendarDashboard driverMode={isDriver} />
    </main>
  );
}
