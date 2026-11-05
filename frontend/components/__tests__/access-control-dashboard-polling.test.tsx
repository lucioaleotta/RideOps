import { render, waitFor } from '@testing-library/react';
import { AccessControlDashboard } from '../access-control-dashboard';
import { SessionProvider } from '../session-context';

function renderForRole(userRole: string) {
  return render(
    <SessionProvider value={{
      userId: 'session-user',
      userRole,
      tenantId: 7,
      sessionKey: `42:7:${userRole}`
    }}>
      <AccessControlDashboard />
    </SessionProvider>
  );
}

describe('AccessControlDashboard polling authorization', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      let payload: unknown = {};
      if (url.includes('/api/admin/tenants')) payload = [];
      if (url.includes('/kpis')) payload = { total7d: 0, total24h: 0, anomaliesTotal: 0, uniqueIps: 0 };
      if (url.includes('/hourly')) payload = { hours: new Array(24).fill(0), anomalyHours: new Array(24).fill(0) };
      if (url.includes('/top-ips')) payload = { ips: [] };
      if (url.includes('/countries')) payload = { countries: [] };
      if (url.includes('/owner/sessions?')) payload = { total: 0, page: 0, perPage: 12, sessions: [] };
      return Promise.resolve({ ok: true, json: async () => payload });
    }) as jest.MockedFunction<typeof fetch>;
  });

  it.each(['GESTIONALE', 'DRIVER'])('does not request access data for role %s', (userRole) => {
    renderForRole(userRole);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('loads access data only for an authenticated ADMIN session', async () => {
    renderForRole('ADMIN');

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(7));
    expect(global.fetch).toHaveBeenCalledWith('/api/admin/tenants', expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/owner/sessions/kpis'), expect.any(Object));
  });
});
