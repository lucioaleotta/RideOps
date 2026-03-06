import { CalendarDashboard } from '../../components/calendar-dashboard';

export default function AppHomePage() {
  return (
    <main>
      <h1>Calendar Dashboard</h1>
      <p>Vista operativa servizi con navigazione mese / settimana / giorno.</p>
      <CalendarDashboard />
    </main>
  );
}
