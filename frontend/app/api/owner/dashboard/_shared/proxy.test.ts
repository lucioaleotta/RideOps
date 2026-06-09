import { proxyOwnerDashboardGet } from './proxy';

jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

const { cookies } = jest.requireMock('next/headers') as { cookies: jest.Mock };

describe('proxyOwnerDashboardGet', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns 401 when token is missing', async () => {
    cookies.mockReturnValue({ get: () => undefined });

    const response = await proxyOwnerDashboardGet({ url: 'http://localhost/api/owner/dashboard/kpis' } as Request, 'kpis');

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ message: 'Unauthorized' });
  });

  it('forwards query params and auth header to backend', async () => {
    cookies.mockReturnValue({ get: () => ({ value: 'jwt-token' }) });

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ total_services: 7 }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const response = await proxyOwnerDashboardGet(
      { url: 'http://localhost/api/owner/dashboard/kpis?months=6' } as Request,
      'kpis'
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8080/owner/dashboard/kpis?months=6',
      {
        headers: { Authorization: 'Bearer jwt-token' },
        cache: 'no-store',
      }
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ total_services: 7 });
  });

  it('returns backend error message when backend call fails', async () => {
    cookies.mockReturnValue({ get: () => ({ value: 'jwt-token' }) });

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: 'months must be one of: 1, 3, 6, 12' }),
    }) as unknown as typeof fetch;

    const response = await proxyOwnerDashboardGet(
      { url: 'http://localhost/api/owner/dashboard/top5?months=2' } as Request,
      'top5'
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ message: 'months must be one of: 1, 3, 6, 12' });
  });
});
