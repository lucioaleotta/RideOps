import { downloadServicesExport } from './exportService';

describe('downloadServicesExport', () => {
  const originalFetch = global.fetch;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  beforeEach(() => {
    global.fetch = jest.fn();
    URL.createObjectURL = jest.fn().mockReturnValue('blob:mock-url');
    URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    jest.restoreAllMocks();
  });

  it('costruisce query corretta e scarica blob con revoke', async () => {
    const blob = new Blob(['abc'], { type: 'text/csv' });
    const clickSpy = jest.fn();

    jest.spyOn(document, 'createElement').mockReturnValue({
      href: '',
      download: '',
      click: clickSpy
    } as unknown as HTMLAnchorElement);
    jest.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
    jest.spyOn(document.body, 'removeChild').mockImplementation((node) => node);

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      blob: async () => blob,
      headers: {
        get: () => 'attachment; filename="servizi_2026-01_2026-03.csv"'
      }
    });

    const loadingSpy = jest.fn();

    await downloadServicesExport({
      from: '2026-01-01',
      to: '2026-03-31',
      format: 'csv',
      onLoadingChange: loadingSpy
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/servizi/export?from=2026-01-01&to=2026-03-31&format=csv',
      expect.any(Object)
    );
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    expect(loadingSpy).toHaveBeenNthCalledWith(1, true);
    expect(loadingSpy).toHaveBeenLastCalledWith(false);
  });

  it('gestisce errore API', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Errore export' })
    });

    await expect(
      downloadServicesExport({ from: '2026-01-01', to: '2026-03-31', format: 'xlsx' })
    ).rejects.toThrow('Errore export');
  });

  it('gestisce errore rete', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network down'));

    await expect(
      downloadServicesExport({ from: '2026-01-01', to: '2026-03-31', format: 'csv' })
    ).rejects.toThrow('Network down');
  });
});
