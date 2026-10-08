import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RichiesteDaApprovarePanel } from '../richieste-da-approvare-panel';

const TIPI_ASSENZA = [
  {
    id: 1,
    codice: 'FER',
    nome: 'Ferie',
    unitaMisura: 'GIORNI',
    origineDriverConsentita: true,
    origineGestionaleConsentita: true,
    richiedeOrario: false,
    preavvisoMinimoGiorniDefault: 3,
    attivo: true
  },
  {
    id: 6,
    codice: 'SGA',
    nome: 'Sganciamento',
    unitaMisura: 'GIORNI',
    origineDriverConsentita: false,
    origineGestionaleConsentita: true,
    richiedeOrario: false,
    preavvisoMinimoGiorniDefault: 0,
    attivo: true
  }
];

const DRIVER_OPTIONS = [{ driverId: 12, firstName: 'Sofia', lastName: 'Conti' }];

function makeRichiesta(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 26,
    driverId: 12,
    tipoAssenzaId: 1,
    tipoAssenzaCodice: 'FER',
    tipoAssenzaNome: 'Ferie',
    origine: 'DRIVER',
    dataInizio: '2026-09-22',
    dataFine: '2026-09-25',
    giornataIntera: true,
    oraInizio: null,
    oraFine: null,
    stato: 'IN_ATTESA',
    richiedeApprovazioneEccezionale: false,
    motivazione: null,
    motivoRifiuto: null,
    approvataDa: null,
    dataDecisione: null,
    creatoIl: '2026-09-16T10:00:00',
    aggiornatoIl: '2026-09-16T10:00:00',
    ...overrides
  };
}

function setupFetchMock(richieste: ReturnType<typeof makeRichiesta>[]) {
  return jest.fn().mockImplementation((url: string, init?: RequestInit) => {
    if (url === '/api/tipi-assenza') {
      return Promise.resolve({ ok: true, json: async () => TIPI_ASSENZA });
    }
    if (url === '/api/richieste-assenza/driver-options') {
      return Promise.resolve({ ok: true, json: async () => DRIVER_OPTIONS });
    }
    if (url === '/api/richieste-assenza' && (!init || init.method === undefined)) {
      return Promise.resolve({ ok: true, json: async () => richieste });
    }
    if (url === '/api/richieste-assenza/inserimento-gestionale') {
      return Promise.resolve({ ok: true, status: 201, json: async () => makeRichiesta({ origine: 'GESTIONALE' }) });
    }
    if (url.match(/\/api\/richieste-assenza\/\d+\/approva/)) {
      return Promise.resolve({ ok: true, json: async () => makeRichiesta({ stato: 'APPROVATA' }) });
    }
    if (url.match(/\/api\/richieste-assenza\/\d+\/rifiuta/)) {
      return Promise.resolve({ ok: true, json: async () => makeRichiesta({ stato: 'RIFIUTATA' }) });
    }
    return Promise.resolve({ ok: true, json: async () => ({}) });
  });
}

describe('RichiesteDaApprovarePanel', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('mostra la richiesta in attesa con nome driver e conteggio', async () => {
    global.fetch = setupFetchMock([makeRichiesta()]) as unknown as typeof fetch;

    render(<RichiesteDaApprovarePanel />);

    await screen.findByText('Sofia Conti');
    expect(screen.getByText('Da approvare')).toBeInTheDocument();
  });

  it('mostra l\'orario richiesto nel dettaglio', async () => {
    global.fetch = setupFetchMock([makeRichiesta({ oraInizio: '12:00:00', oraFine: '23:59:00' })]) as unknown as typeof fetch;

    render(<RichiesteDaApprovarePanel />);

    expect(await screen.findByText('12:00–23:59')).toBeInTheDocument();
  });

  it('approva una richiesta in attesa', async () => {
    const fetchMock = setupFetchMock([makeRichiesta()]);
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<RichiesteDaApprovarePanel />);
    await screen.findByText('Sofia Conti');

    await userEvent.click(screen.getByRole('button', { name: /^approva$/i }));

    await waitFor(() => {
      const approvaCall = fetchMock.mock.calls.find((call) => String(call[0]).includes('/approva'));
      expect(approvaCall).toBeDefined();
      expect(approvaCall?.[1]?.method).toBe('PATCH');
    });

    await screen.findByText(/richiesta approvata/i);
  });

  it('evidenzia richieste eccezionali e conflitti con servizi assegnati', async () => {
    const richiesta = makeRichiesta({
      richiedeApprovazioneEccezionale: true,
      conflittiTurno: [{
        servizioId: 87,
        inizio: '2026-10-05T09:00:00',
        durataOre: 2,
        partenza: 'Sede',
        destinazione: 'Aeroporto'
      }]
    });
    global.fetch = setupFetchMock([richiesta]) as unknown as typeof fetch;

    render(<RichiesteDaApprovarePanel />);

    await screen.findByText('Richiesta eccezionale: utilizza quota maturata oltre la scadenza configurata e richiede conferma esplicita.');
    expect(screen.getByText('Conflitto con 1 servizio/i assegnato/i')).toBeInTheDocument();
    expect(screen.getByText(/Sede → Aeroporto/)).toBeInTheDocument();
  });

  it('rifiuta una richiesta richiedendo il motivo', async () => {
    const fetchMock = setupFetchMock([makeRichiesta()]);
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<RichiesteDaApprovarePanel />);
    await screen.findByText('Sofia Conti');

    await userEvent.click(screen.getByRole('button', { name: /^rifiuta$/i }));
    const textarea = screen.getByPlaceholderText(/motivo del rifiuto/i);
    await userEvent.type(textarea, 'Copertura turni insufficiente');
    await userEvent.click(screen.getByRole('button', { name: /^conferma$/i }));

    await waitFor(() => {
      const rifiutaCall = fetchMock.mock.calls.find((call) => String(call[0]).includes('/rifiuta'));
      expect(rifiutaCall).toBeDefined();
      const payload = JSON.parse(String(rifiutaCall?.[1]?.body));
      expect(payload.motivoRifiuto).toBe('Copertura turni insufficiente');
    });
  });

  it('crea uno sganciamento per un driver selezionato', async () => {
    const fetchMock = setupFetchMock([]);
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<RichiesteDaApprovarePanel />);
    await screen.findByText(/nessuna richiesta trovata/i);

    await userEvent.click(screen.getByRole('button', { name: /sganciamento/i }));
    const driverSelect = screen.getByLabelText(/driver/i);
    await userEvent.selectOptions(driverSelect, '12');
    await userEvent.type(screen.getByLabelText(/^Dal$/i), '2026-09-22');
    await userEvent.type(screen.getByLabelText(/^Al$/i), '2026-09-22');

    await userEvent.click(screen.getByRole('button', { name: /^conferma$/i }));

    await waitFor(() => {
      const call = fetchMock.mock.calls.find((c) => c[0] === '/api/richieste-assenza/inserimento-gestionale');
      expect(call).toBeDefined();
      const payload = JSON.parse(String(call?.[1]?.body));
      expect(payload.tipoAssenzaId).toBe(6);
      expect(payload.driverId).toBe(12);
    });
  });

  it('mostra un messaggio di attesa esplicita per inserimento ferie scadute', async () => {
    global.fetch = jest.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url === '/api/tipi-assenza') return Promise.resolve({ ok: true, json: async () => TIPI_ASSENZA });
      if (url === '/api/richieste-assenza/driver-options') return Promise.resolve({ ok: true, json: async () => DRIVER_OPTIONS });
      if (url === '/api/richieste-assenza/inserimento-gestionale') {
        return Promise.resolve({ ok: true, status: 201, json: async () => makeRichiesta({ origine: 'GESTIONALE', stato: 'IN_ATTESA', richiedeApprovazioneEccezionale: true }) });
      }
      if (url === '/api/richieste-assenza' && init?.method === undefined) return Promise.resolve({ ok: true, json: async () => [] });
      return Promise.resolve({ ok: true, json: async () => ({}) });
    }) as unknown as typeof fetch;

    render(<RichiesteDaApprovarePanel />);
    await screen.findByText(/nessuna richiesta trovata/i);
    await userEvent.click(screen.getByRole('button', { name: /inserisci assenza/i }));
    await userEvent.selectOptions(screen.getByLabelText(/^Driver$/i), '12');
    await userEvent.selectOptions(screen.getByLabelText(/^Tipologia$/i), '1');
    await userEvent.type(screen.getByLabelText(/^Dal$/i), '2026-10-10');
    await userEvent.type(screen.getByLabelText(/^Al$/i), '2026-10-10');
    await userEvent.click(screen.getByRole('button', { name: /^conferma$/i }));

    await screen.findByText('Richiesta inserita in attesa di conferma: utilizza quota maturata oltre la scadenza configurata');
  });
});
