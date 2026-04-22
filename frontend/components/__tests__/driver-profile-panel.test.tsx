import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DriverProfilePanel } from '../driver-profile-panel';

describe('DriverProfilePanel', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('apre la modale e invia payload completa al salvataggio', async () => {
    const profile = {
      id: 12,
      userId: 'mario.rossi',
      email: 'mario.rossi@rideops.it',
      role: 'DRIVER',
      enabled: true,
      createdAt: '2026-01-01T10:00:00',
      firstName: 'Mario',
      lastName: 'Rossi',
      birthDate: '1985-03-12',
      licenseNumber: 'MI1234567B',
      licenseTypes: ['B', 'D'],
      residentialAddresses: ['Via Roma 14, Milano'],
      mobilePhone: '+39 335 1122334',
      licenseExpiryDate: '2028-06-30'
    };

    const updatedProfile = {
      ...profile,
      firstName: 'Luigi',
      email: 'luigi.bianchi@rideops.it'
    };

    const fetchMock = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => profile
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => updatedProfile
      });

    global.fetch = fetchMock as unknown as typeof fetch;

    render(<DriverProfilePanel />);

    await screen.findByText(/informazioni personali/i);

    await userEvent.click(screen.getByRole('button', { name: /modifica/i }));

    const nomeInput = screen.getByLabelText(/^Nome$/i);
    const emailInput = screen.getByLabelText(/^Email$/i);

    await userEvent.clear(nomeInput);
    await userEvent.type(nomeInput, 'Luigi');
    await userEvent.clear(emailInput);
    await userEvent.type(emailInput, 'luigi.bianchi@rideops.it');

    await userEvent.click(screen.getByRole('button', { name: /aggiorna driver/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    const putCall = fetchMock.mock.calls[1];
    expect(putCall[0]).toBe('/api/driver/profile');
    expect(putCall[1]?.method).toBe('PUT');

    const payload = JSON.parse(String(putCall[1]?.body));
    expect(payload.firstName).toBe('Luigi');
    expect(payload.lastName).toBe('Rossi');
    expect(payload.birthDate).toBe('1985-03-12');
    expect(payload.licenseNumber).toBe('MI1234567B');
    expect(payload.email).toBe('luigi.bianchi@rideops.it');
    expect(payload.mobilePhone).toBe('+39 335 1122334');
    expect(payload.licenseExpiryDate).toBe('2028-06-30');
    expect(payload.licenseTypes).toEqual(['B', 'D']);
    expect(payload.residentialAddresses).toEqual(['Via Roma 14, Milano']);

    await screen.findByText(/dati personali aggiornati con successo/i);
  });
});
