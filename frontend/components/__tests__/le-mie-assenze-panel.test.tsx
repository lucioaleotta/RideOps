import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LeMieAssenzePanel } from '../le-mie-assenze-panel';

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
    if (url === '/api/richieste-assenza' && (!init || init.method === undefined)) {
      return Promise.resolve({ ok: true, json: async () => richieste });
    }
    if (url === '/api/richieste-assenza' && init?.method === 'POST') {
      return Promise.resolve({ ok: true, status: 201, json: async () => makeRichiesta() });
    }
    if (url.match(/\/api\/richieste-assenza\/\d+\/annulla/)) {
      return Promise.resolve({ ok: true, json: async () => ({ ...makeRichiesta(), stato: 'ANNULLATA' }) });
    }
    return Promise.resolve({ ok: true, json: async () => ({}) });
  });
}

describe('LeMieAssenzePanel', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('mostra le richieste esistenti e il conteggio in attesa', async () => {
    global.fetch = setupFetchMock([makeRichiesta()]) as unknown as typeof fetch;

    render(<LeMieAssenzePanel />);

    await screen.findByText('Ferie');
    expect(screen.getAllByText('In attesa').length).toBeGreaterThan(0);
    expect(screen.getByText('richieste da valutare')).toBeInTheDocument();
  });

  it('invia una nuova richiesta di ferie con i dati compilati', async () => {
    const fetchMock = setupFetchMock([]);
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<LeMieAssenzePanel />);

    await screen.findByText(/nessuna richiesta di assenza/i);

    await userEvent.click(screen.getByRole('button', { name: /nuova richiesta/i }));

    const tipologiaSelect = screen.getByLabelText(/tipologia/i);
    await userEvent.selectOptions(tipologiaSelect, '1');

    const dalInput = screen.getByLabelText(/^Dal$/i);
    const alInput = screen.getByLabelText(/^Al$/i);
    await userEvent.type(dalInput, '2026-09-22');
    await userEvent.type(alInput, '2026-09-25');

    await userEvent.click(screen.getByRole('button', { name: /invia richiesta/i }));

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(
        (call) => call[0] === '/api/richieste-assenza' && call[1]?.method === 'POST'
      );
      expect(postCall).toBeDefined();
    });

    const postCall = fetchMock.mock.calls.find(
      (call) => call[0] === '/api/richieste-assenza' && call[1]?.method === 'POST'
    );
    const payload = JSON.parse(String(postCall?.[1]?.body));
    expect(payload.tipoAssenzaId).toBe(1);
    expect(payload.dataInizio).toBe('2026-09-22');
    expect(payload.dataFine).toBe('2026-09-25');
    expect(payload.giornataIntera).toBe(true);

    await screen.findByText(/richiesta inviata con successo/i);
  });

  it('non propone il tipo Sganciamento tra le opzioni richiedibili dal driver', async () => {
    global.fetch = setupFetchMock([]) as unknown as typeof fetch;

    render(<LeMieAssenzePanel />);

    await screen.findByText(/nessuna richiesta di assenza/i);
    await userEvent.click(screen.getByRole('button', { name: /nuova richiesta/i }));

    const tipologiaSelect = screen.getByLabelText(/tipologia/i);
    expect(screen.queryByText('Sganciamento', { selector: 'option' })).not.toBeInTheDocument();
    expect(tipologiaSelect).toBeInTheDocument();
  });
});
