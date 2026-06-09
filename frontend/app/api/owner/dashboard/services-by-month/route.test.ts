import { GET } from './route';
import { proxyOwnerDashboardGet } from '../_shared/proxy';

jest.mock('../_shared/proxy', () => ({
  proxyOwnerDashboardGet: jest.fn(),
}));

describe('GET /api/owner/dashboard/services-by-month', () => {
  it('delegates to proxy helper with services-by-month endpoint', async () => {
    (proxyOwnerDashboardGet as jest.Mock).mockResolvedValue({ ok: true });
    const request = { url: 'http://localhost/api/owner/dashboard/services-by-month?months=3' } as Request;

    await GET(request);

    expect(proxyOwnerDashboardGet).toHaveBeenCalledWith(request, 'services-by-month');
  });
});
