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

function setupFetchMock(richieste: ReturnType<typeof makeRichiesta>[], saldi: unknown[] = []) {
  return jest.fn().mockImplementation((url: string, init?: RequestInit) => {
    if (url === '/api/auth/me') {
      return Promise.resolve({ ok: true, json: async () => ({ id: 12, userId: 'sofia.conti', role: 'DRIVER', tenantId: 7 }) });
    }
    if (url === '/api/driver/12/saldi') {
      return Promise.resolve({ ok: true, json: async () => saldi });
    }
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

  it('mostra l\'orario in elenco e nasconde Annulla per le assenze inserite dal Gestionale', async () => {
    global.fetch = setupFetchMock([
      makeRichiesta({ id: 30, oraInizio: '12:00:00', oraFine: '23:59:00', dataInizio: '2099-12-31', dataFine: '2099-12-31' }),
      makeRichiesta({ id: 31, origine: 'GESTIONALE', stato: 'APPROVATA', dataInizio: '2099-12-31', dataFine: '2099-12-31' })
    ]) as unknown as typeof fetch;

    render(<LeMieAssenzePanel />);

    await userEvent.click(await screen.findByRole('button', { name: 'Elenco' }));
    expect(await screen.findByText('12:00–23:59')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Annulla richiesta' })).toHaveLength(1);
  });

  it('mostra le richieste esistenti e il conteggio in attesa', async () => {
    global.fetch = setupFetchMock([makeRichiesta()]) as unknown as typeof fetch;

    render(<LeMieAssenzePanel />);

    await userEvent.click(await screen.findByRole('button', { name: 'Elenco' }));
    expect((await screen.findAllByText('Ferie')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('In attesa').length).toBeGreaterThan(0);
    expect(screen.getByText('richieste da valutare')).toBeInTheDocument();
  });

  it('mostra il calendario come vista iniziale e assegna colori distinti alle tipologie', async () => {
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-10`;
    const requests = [
      makeRichiesta({ id: 26, dataInizio: date, dataFine: date }),
      makeRichiesta({
        id: 27,
        tipoAssenzaId: 3,
        tipoAssenzaCodice: 'PER',
        tipoAssenzaNome: 'Permesso',
        dataInizio: date,
        dataFine: date,
        stato: 'APPROVATA'
      })
    ];
    global.fetch = setupFetchMock(requests) as unknown as typeof fetch;

    const { container } = render(<LeMieAssenzePanel />);

    expect(await screen.findByRole('button', { name: 'Calendario' })).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => {
      expect(container.querySelector('.assenza-calendar-event--fer')).toBeInTheDocument();
    });
    expect(container.querySelector('.assenza-calendar-event--per')).toBeInTheDocument();
    expect(screen.getByText('Ferie', { selector: '.assenza-calendar-legend > span' })).toBeInTheDocument();
  });

  it('mostra separatamente ferie residue valide e scadute', async () => {
    global.fetch = setupFetchMock([], [{
      tipoAssenzaId: 1,
      codice: 'FER',
      nome: 'Ferie',
      unitaMisura: 'GIORNI',
      quantitaMaturata: 26,
      quantitaUtilizzata: 10,
      residuoValido: 12,
      residuoScaduto: 4,
      saldoAnnuale: true,
      saldoCaricato: true,
      monteOreAbilitato: true,
      scadenzaFerieMesi: 18
    }]) as unknown as typeof fetch;

    render(<LeMieAssenzePanel />);

    await screen.findByText('I tuoi saldi');
    expect(await screen.findByText('12')).toBeInTheDocument();
    expect(screen.getByText('Quota scaduta')).toBeInTheDocument();
    expect(screen.getByText('4 giorni')).toBeInTheDocument();
  });

  it('spiega quando una richiesta richiede approvazione per quota ferie scaduta', async () => {
    global.fetch = setupFetchMock([makeRichiesta({
      richiedeApprovazioneEccezionale: true,
      origine: 'GESTIONALE'
    })]) as unknown as typeof fetch;

    render(<LeMieAssenzePanel />);

    await userEvent.click(await screen.findByRole('button', { name: 'Elenco' }));
    await screen.findByText('La richiesta usa quota ferie scaduta e richiede una conferma esplicita del Gestionale.');
  });

  it('mostra il saldo annuale zero restituito dal backend', async () => {
    global.fetch = setupFetchMock([], [{
      tipoAssenzaId: 1,
      codice: 'FER',
      nome: 'Ferie',
      unitaMisura: 'GIORNI',
      quantitaMaturata: 0,
      quantitaUtilizzata: 0,
      residuoValido: 0,
      residuoScaduto: 0,
      saldoAnnuale: true,
      saldoCaricato: true,
      monteOreAbilitato: true,
      scadenzaFerieMesi: 18
    }]) as unknown as typeof fetch;

    render(<LeMieAssenzePanel />);

    expect(await screen.findByText('Ferie')).toBeInTheDocument();
    expect(screen.getByText('giorni disponibili')).toBeInTheDocument();
    expect(screen.getByText(/maturato 0 · utilizzato 0/i)).toBeInTheDocument();
  });

  it('indica che una tipologia senza monte annuale non ha saldo automatico', async () => {
    global.fetch = setupFetchMock([], [{
      tipoAssenzaId: 2,
      codice: 'MAL',
      nome: 'Malattia',
      unitaMisura: 'GIORNI',
      quantitaMaturata: 0,
      quantitaUtilizzata: 0,
      residuoValido: 0,
      residuoScaduto: 0,
      saldoAnnuale: false,
      saldoCaricato: false,
      monteOreAbilitato: false,
      scadenzaFerieMesi: null
    }]) as unknown as typeof fetch;

    render(<LeMieAssenzePanel />);

    expect(await screen.findByText('nessun monte annuale')).toBeInTheDocument();
    expect(screen.getByText(/non prevede una quota annuale automatica/i)).toBeInTheDocument();
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
