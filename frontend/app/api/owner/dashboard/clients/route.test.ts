import { GET } from './route';
import { proxyOwnerDashboardGet } from '../_shared/proxy';

jest.mock('../_shared/proxy', () => ({
  proxyOwnerDashboardGet: jest.fn(),
}));

describe('GET /api/owner/dashboard/clients', () => {
  it('delegates to proxy helper with clients endpoint', async () => {
    (proxyOwnerDashboardGet as jest.Mock).mockResolvedValue({ ok: true });
    const request = { url: 'http://localhost/api/owner/dashboard/clients?months=3' } as Request;

    await GET(request);

    expect(proxyOwnerDashboardGet).toHaveBeenCalledWith(request, 'clients');
  });
});
