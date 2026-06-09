import { GET } from './route';
import { proxyOwnerDashboardGet } from '../_shared/proxy';

jest.mock('../_shared/proxy', () => ({
  proxyOwnerDashboardGet: jest.fn(),
}));

describe('GET /api/owner/dashboard/kpis', () => {
  it('delegates to proxy helper with kpis endpoint', async () => {
    (proxyOwnerDashboardGet as jest.Mock).mockResolvedValue({ ok: true });
    const request = { url: 'http://localhost/api/owner/dashboard/kpis?months=3' } as Request;

    await GET(request);

    expect(proxyOwnerDashboardGet).toHaveBeenCalledWith(request, 'kpis');
  });
});
