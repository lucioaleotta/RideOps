import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ServicesPanel } from '../services-panel';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeService(overrides: Partial<{
  id: number;
  serviceAssignmentType: 'INTERNAL' | 'INCOMING' | 'OUTSOURCED' | 'INCOMING_OUTSOURCED';
  partnerId: number | null;
  status: 'OPEN' | 'ASSIGNED' | 'EXECUTED' | 'CLOSED';
}> = {}) {
  return {
    id: overrides.id ?? 1,
    startAt: '2026-05-10T09:00:00',
    pickupLocation: 'Via Roma 1',
    destination: 'Aeroporto',
    type: 'TRANSFER',
    durationHours: null,
    notes: null,
    price: 100,
    externalBookingReference: null,
    internalBookingReference: 'RO-001',
    clientName: 'Mario Rossi',
    clientPhone: '+39 333 1234567',
    clientEmail: 'mario@example.com',
    passengersCount: 2,
    itinerary: null,
    status: overrides.status ?? 'OPEN',
    assignedDriverId: null,
    assignedVehicleId: null,
    assignedByUserId: null,
    assignedAt: null,
    serviceAssignmentType: overrides.serviceAssignmentType ?? 'INTERNAL',
    partnerId: overrides.partnerId ?? null,
    outgoingPartnerId: null,
    pricePartner: null,
    margin: null,
    createdAt: '2026-05-01T10:00:00',
    updatedAt: '2026-05-01T10:00:00',
  };
}

const PARTNER = { id: 7, ragioneSociale: 'Acme Partner Srl', deleted: false };

function setupFetchMock(
  service: ReturnType<typeof makeService>,
  failingRequest?: { method: string; urlPattern: RegExp; message: string }
) {
  return jest.fn().mockImplementation((url: string, init?: RequestInit) => {
    if (failingRequest && init?.method === failingRequest.method && failingRequest.urlPattern.test(url)) {
      return Promise.resolve({ ok: false, json: async () => ({ message: failingRequest.message }) });
    }
    if (url.includes('/api/gestionale/drivers')) {
      return Promise.resolve({ ok: true, json: async () => [] });
    }
    if (url.includes('/api/fleet/vehicles')) {
      return Promise.resolve({ ok: true, json: async () => [] });
    }
    if (url.includes('/api/partners')) {
      return Promise.resolve({ ok: true, json: async () => [PARTNER] });
    }
    if (url.includes('/partner-history')) {
      return Promise.resolve({ ok: false, json: async () => ({ message: 'Not found' }) });
    }
    if (url.match(/\/api\/services\/\d+/)) {
      return Promise.resolve({ ok: true, json: async () => service });
    }
    if (url.includes('/api/services')) {
      return Promise.resolve({ ok: true, json: async () => [service] });
    }
    return Promise.resolve({ ok: true, json: async () => ({}) });
  });
}

/** Apre la form di modifica per il primo servizio in lista */
async function openEditForm(user: ReturnType<typeof userEvent.setup>) {
  // Attendi che la tabella sia caricata
  const azioniButton = await screen.findByRole('button', { name: /azioni servizio 1/i });

  // Apri il menu a tendina della riga
  await user.click(azioniButton);

  // Clicca "Apri dettaglio"
  const apriDettaglio = await screen.findByRole('button', { name: /apri dettaglio/i });
  await user.click(apriDettaglio);

  // Clicca "Modifica" nel pannello dettaglio
  const modificaButton = await screen.findByRole('button', { name: /^modifica$/i });
  await user.click(modificaButton);
}

// ─── Test suite ──────────────────────────────────────────────────────────────

describe('ServicesPanel', () => {
  beforeEach(() => {
    // Il pulsante "Nuovo servizio" viene renderizzato in un portal su questo elemento
    const portalTarget = document.createElement('div');
    portalTarget.id = 'services-new-button-portal';
    document.body.appendChild(portalTarget);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    const portalTarget = document.getElementById('services-new-button-portal');
    if (portalTarget) portalTarget.remove();
  });

  // ─── Creazione ────────────────────────────────────────────────────────────

  it('mostra la checkbox "Ricevuto da partner" nella form di creazione', async () => {
    global.fetch = setupFetchMock(makeService()) as typeof fetch;

    render(<ServicesPanel />);

    const nuovoServizioBtn = await screen.findByRole('button', { name: /nuovo servizio/i });
    await userEvent.click(nuovoServizioBtn);

    expect(screen.getByLabelText(/ricevuto da partner/i)).toBeInTheDocument();
  });

  it('nella creazione: selezionare la checkbox mostra il selettore partner', async () => {
    global.fetch = setupFetchMock(makeService()) as typeof fetch;
    const user = userEvent.setup();

    render(<ServicesPanel />);

    const nuovoServizioBtn = await screen.findByRole('button', { name: /nuovo servizio/i });
    await user.click(nuovoServizioBtn);

    const checkbox = screen.getByLabelText(/ricevuto da partner/i);
    await user.click(checkbox);

    expect(screen.getByRole('combobox', { name: /partner/i })).toBeInTheDocument();
  });

  it('mostra l’errore di creazione dentro il popup, non dietro al backdrop', async () => {
    global.fetch = setupFetchMock(makeService(), {
      method: 'POST',
      urlPattern: /^\/api\/services$/,
      message: 'Errore di creazione test'
    }) as typeof fetch;
    const user = userEvent.setup();

    render(<ServicesPanel />);
    await user.click(await screen.findByRole('button', { name: /nuovo servizio/i }));
    fireEvent.change(screen.getByLabelText(/data\/ora inizio/i), { target: { value: '2026-10-03T10:00' } });
    await user.type(screen.getByLabelText('Pickup'), 'Via Roma 1');
    await user.type(screen.getByLabelText('Destinazione'), 'Aeroporto');
    await user.click(screen.getByRole('button', { name: /crea servizio/i }));

    const dialog = screen.getByRole('dialog', { name: /nuovo servizio/i });
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Errore di creazione test');
    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });

  it('mostra l’errore di affidamento dentro il popup del partner', async () => {
    global.fetch = setupFetchMock(makeService(), {
      method: 'PATCH',
      urlPattern: /\/api\/services\/1\/outsource$/,
      message: 'Errore di affidamento test'
    }) as typeof fetch;
    const user = userEvent.setup();

    render(<ServicesPanel />);
    await user.click(await screen.findByRole('button', { name: /azioni servizio 1/i }));
    await user.click(await screen.findByRole('button', { name: /apri dettaglio/i }));
    await user.click(await screen.findByRole('button', { name: /affida servizio al partner/i }));

    const dialog = screen.getByRole('dialog', { name: /affida servizio a partner/i });
    await user.selectOptions(within(dialog).getByRole('combobox', { name: /^partner$/i }), '7');
    await user.type(within(dialog).getByLabelText(/prezzo al partner esecutore/i), '75');
    await user.click(within(dialog).getByRole('button', { name: /conferma affidamento/i }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Errore di affidamento test');
    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });

  it('richiede la conferma dell’esecuzione partner prima della chiusura manuale', async () => {
    const fetchMock = setupFetchMock(makeService({ serviceAssignmentType: 'OUTSOURCED', partnerId: PARTNER.id }));
    global.fetch = fetchMock as typeof fetch;
    const user = userEvent.setup();

    render(<ServicesPanel />);
    await user.click(await screen.findByRole('button', { name: /azioni servizio 1/i }));
    await user.click(await screen.findByRole('button', { name: /apri dettaglio/i }));
    await user.click(await screen.findByRole('button', { name: /chiudi servizio/i }));

    const dialog = screen.getByRole('dialog', { name: /conferma esecuzione partner/i });
    const confirmButton = within(dialog).getByRole('button', { name: /conferma chiusura/i });
    expect(confirmButton).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalledWith('/api/services/1/close-manually', expect.anything());

    await user.click(within(dialog).getByRole('checkbox', { name: /confermo di aver ricevuto conferma/i }));
    expect(confirmButton).toBeEnabled();
    await user.click(confirmButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/services/1/close-manually', expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ partnerExecutionConfirmed: true })
      }));
    });
    expect(await screen.findByText(/il dovuto resta nel saldo\/report partner ed è stato registrato il ricavo del margine/i)).toBeInTheDocument();
  });

  it('mantiene aperta la conferma eliminazione e mostra lì l’errore', async () => {
    global.fetch = setupFetchMock(makeService(), {
      method: 'DELETE',
      urlPattern: /\/api\/services\/1$/,
      message: 'Errore di eliminazione test'
    }) as typeof fetch;
    const user = userEvent.setup();

    render(<ServicesPanel />);
    await user.click(await screen.findByRole('button', { name: /azioni servizio 1/i }));
    await user.click(await screen.findByRole('button', { name: /apri dettaglio/i }));
    await user.click(await screen.findByRole('button', { name: /elimina/i }));

    const dialog = screen.getByRole('dialog', { name: /conferma eliminazione servizio/i });
    await user.click(within(dialog).getByRole('button', { name: /^elimina$/i }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Errore di eliminazione test');
    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });

  // ─── Modifica – INTERNAL ──────────────────────────────────────────────────

  it('mostra la checkbox "Ricevuto da partner" in modifica per un servizio INTERNAL', async () => {
    const service = makeService({ serviceAssignmentType: 'INTERNAL' });
    global.fetch = setupFetchMock(service) as typeof fetch;
    const user = userEvent.setup();

    render(<ServicesPanel />);
    await openEditForm(user);

    await waitFor(() => {
      expect(screen.getByLabelText(/ricevuto da partner/i)).toBeInTheDocument();
    });
  });

  it('in modifica INTERNAL: la checkbox è inizialmente non selezionata', async () => {
    const service = makeService({ serviceAssignmentType: 'INTERNAL' });
    global.fetch = setupFetchMock(service) as typeof fetch;
    const user = userEvent.setup();

    render(<ServicesPanel />);
    await openEditForm(user);

    const checkbox = await screen.findByLabelText(/ricevuto da partner/i);
    expect(checkbox).not.toBeChecked();
  });

  it('in modifica INTERNAL: selezionare la checkbox mostra il selettore partner', async () => {
    const service = makeService({ serviceAssignmentType: 'INTERNAL' });
    global.fetch = setupFetchMock(service) as typeof fetch;
    const user = userEvent.setup();

    render(<ServicesPanel />);
    await openEditForm(user);

    const checkbox = await screen.findByLabelText(/ricevuto da partner/i);
    await user.click(checkbox);

    expect(checkbox).toBeChecked();
    expect(screen.getByRole('combobox', { name: /partner/i })).toBeInTheDocument();
  });

  it('in modifica INTERNAL: deselezionare la checkbox nasconde il selettore partner', async () => {
    const service = makeService({ serviceAssignmentType: 'INTERNAL' });
    global.fetch = setupFetchMock(service) as typeof fetch;
    const user = userEvent.setup();

    render(<ServicesPanel />);
    await openEditForm(user);

    // Spunta e poi rispunta
    const checkbox = await screen.findByLabelText(/ricevuto da partner/i);
    await user.click(checkbox); // check
    await user.click(checkbox); // uncheck

    expect(checkbox).not.toBeChecked();
    expect(screen.queryByRole('combobox', { name: /partner/i })).not.toBeInTheDocument();
  });

  // ─── Modifica – INCOMING ──────────────────────────────────────────────────

  it('mostra la checkbox "Ricevuto da partner" in modifica per un servizio INCOMING', async () => {
    const service = makeService({ serviceAssignmentType: 'INCOMING', partnerId: PARTNER.id });
    global.fetch = setupFetchMock(service) as typeof fetch;
    const user = userEvent.setup();

    render(<ServicesPanel />);
    await openEditForm(user);

    const checkbox = await screen.findByLabelText(/ricevuto da partner/i);
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toBeChecked();
  });

  it('in modifica INCOMING: la checkbox è inizialmente selezionata e il selettore partner è visibile', async () => {
    const service = makeService({ serviceAssignmentType: 'INCOMING', partnerId: PARTNER.id });
    global.fetch = setupFetchMock(service) as typeof fetch;
    const user = userEvent.setup();

    render(<ServicesPanel />);
    await openEditForm(user);

    await waitFor(() => {
      expect(screen.getByLabelText(/ricevuto da partner/i)).toBeChecked();
    });
    expect(screen.getByRole('combobox', { name: /partner/i })).toBeInTheDocument();
  });

  it('in modifica INCOMING: deselezionare la checkbox nasconde il selettore partner', async () => {
    const service = makeService({ serviceAssignmentType: 'INCOMING', partnerId: PARTNER.id });
    global.fetch = setupFetchMock(service) as typeof fetch;
    const user = userEvent.setup();

    render(<ServicesPanel />);
    await openEditForm(user);

    const checkbox = await screen.findByLabelText(/ricevuto da partner/i);
    await user.click(checkbox); // uncheck

    expect(checkbox).not.toBeChecked();
    expect(screen.queryByRole('combobox', { name: /partner/i })).not.toBeInTheDocument();
  });

  // ─── Modifica – OUTSOURCED ────────────────────────────────────────────────

  it('NON mostra la checkbox "Ricevuto da partner" in modifica per un servizio OUTSOURCED', async () => {
    const service = makeService({ serviceAssignmentType: 'OUTSOURCED', partnerId: PARTNER.id });
    global.fetch = setupFetchMock(service) as typeof fetch;
    const user = userEvent.setup();

    render(<ServicesPanel />);
    await openEditForm(user);

    // Attendi che la form di modifica sia aperta verificando il titolo
    await screen.findByRole('heading', { name: /modifica servizio/i });

    expect(screen.queryByLabelText(/ricevuto da partner/i)).not.toBeInTheDocument();
  });

  it('mostra il campo readonly "Modalita gestione servizio" per OUTSOURCED in modifica', async () => {
    const service = makeService({ serviceAssignmentType: 'OUTSOURCED', partnerId: PARTNER.id });
    global.fetch = setupFetchMock(service) as typeof fetch;
    const user = userEvent.setup();

    render(<ServicesPanel />);
    await openEditForm(user);

    await screen.findByRole('heading', { name: /modifica servizio/i });

    const readonlyInput = screen.getByDisplayValue(/affidato/i);
    expect(readonlyInput).toBeDisabled();
  });
});
