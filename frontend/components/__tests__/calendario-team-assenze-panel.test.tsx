import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CalendarioTeamAssenzePanel } from '../calendario-team-assenze-panel';

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function setupCalendarFetch() {
  const today = new Date();
  const todayKey = localDateKey(today);
  const fetchMock = jest.fn().mockImplementation((url: string) => {
    if (url.startsWith('/api/calendario-assenze?')) {
      return Promise.resolve({
        ok: true,
        json: async () => [
          {
            richiestaId: 101,
            driverId: 12,
            tipoAssenzaId: 1,
            tipoAssenzaCodice: 'PER',
            tipoAssenzaNome: 'Permesso',
            dataInizio: todayKey,
            dataFine: todayKey,
            giornataIntera: false,
            oraInizio: '09:30:00',
            oraFine: '12:00:00',
            origine: 'DRIVER',
            richiedeApprovazioneEccezionale: false
          },
          {
            richiestaId: 102,
            driverId: 14,
            tipoAssenzaId: 6,
            tipoAssenzaCodice: 'SGA',
            tipoAssenzaNome: 'Sganciamento',
            dataInizio: todayKey,
            dataFine: todayKey,
            giornataIntera: true,
            oraInizio: null,
            oraFine: null,
            origine: 'GESTIONALE',
            richiedeApprovazioneEccezionale: false
          }
        ]
      });
    }
    if (url.startsWith('/api/gestionale/drivers')) {
      return Promise.resolve({
        ok: true,
        json: async () => [
          { id: 12, firstName: 'Luca', lastName: 'Bianchi', role: 'DRIVER' },
          { id: 14, firstName: 'Sara', lastName: 'Rossi', role: 'DRIVER' },
          { id: 15, firstName: 'Marco', lastName: 'Freelancer', role: 'DRIVER_FREELANCER' }
        ]
      });
    }
    return Promise.resolve({ ok: true, json: async () => [] });
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return { fetchMock, todayKey };
}

describe('CalendarioTeamAssenzePanel', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('mostra assenze approvate, nomi driver e granularità oraria', async () => {
    setupCalendarFetch();
    render(<CalendarioTeamAssenzePanel />);

    expect(await screen.findByText('Calendario team')).toBeInTheDocument();
    expect((await screen.findAllByText('Luca Bianchi')).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/09:30–12:00/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Sganciamento').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /2 assenze/ })).toBeInTheDocument();
  });

  it('mostra l\'orario anche quando giornataIntera è true', async () => {
    const todayKey = localDateKey(new Date());
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.startsWith('/api/calendario-assenze?')) {
        return Promise.resolve({
          ok: true,
          json: async () => [{
            richiestaId: 103, driverId: 12, tipoAssenzaId: 1, tipoAssenzaCodice: 'PER', tipoAssenzaNome: 'Permesso',
            dataInizio: todayKey, dataFine: todayKey, giornataIntera: true, oraInizio: '12:00:00', oraFine: '23:59:00',
            origine: 'DRIVER', richiedeApprovazioneEccezionale: false
          }]
        });
      }
      if (url.startsWith('/api/gestionale/drivers')) {
        return Promise.resolve({ ok: true, json: async () => [{ id: 12, firstName: 'Luca', lastName: 'Bianchi', role: 'DRIVER' }] });
      }
      return Promise.resolve({ ok: true, json: async () => [] });
    }) as unknown as typeof fetch;

    render(<CalendarioTeamAssenzePanel />);

    expect((await screen.findAllByText(/12:00–23:59/)).length).toBeGreaterThan(0);
    expect(screen.queryByText('Intera giornata')).not.toBeInTheDocument();
  });

  it('filtra il calendario per driver ed esplora i mesi usando l’intervallo API corretto', async () => {
    const user = userEvent.setup();
    const { fetchMock } = setupCalendarFetch();
    render(<CalendarioTeamAssenzePanel />);

    await screen.findAllByText('Sara Rossi');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Driver' }), '12');

    expect(screen.getAllByText('Luca Bianchi').length).toBeGreaterThan(0);
    expect(within(screen.getByRole('region', { name: 'Dettagli della data selezionata' }))
      .queryByText('Sara Rossi', { selector: 'strong' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Mese precedente' }));
    const currentDate = new Date();
    const previousMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const from = localDateKey(previousMonth);
    const to = localDateKey(new Date(previousMonth.getFullYear(), previousMonth.getMonth() + 1, 0));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        `/api/calendario-assenze?from=${from}&to=${to}`,
        { cache: 'no-store' }
      );
    });
  });
});
