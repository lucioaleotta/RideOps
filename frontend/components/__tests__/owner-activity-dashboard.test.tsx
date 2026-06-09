import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OwnerActivityDashboard } from '../owner-activity-dashboard';

function mockOk(data: unknown) {
  return Promise.resolve({
    ok: true,
    json: async () => data,
  });
}

function makeFetchMock() {
  return jest.fn().mockImplementation((url: string) => {
    if (url.includes('/api/owner/dashboard/kpis')) {
      return mockOk({
        total_services: 30,
        active_clients: 5,
        total_clients: 12,
        avg_services_per_client: 3,
      });
    }

    if (url.includes('/api/owner/dashboard/services-by-month')) {
      return mockOk({
        labels: ['Apr', 'May', 'Jun'],
        datasets: [
          {
            tenant_id: 1,
            tenant_name: 'Acme',
            color: '#185FA5',
            data: [2, 4, 8],
          },
        ],
      });
    }

    if (url.includes('/api/owner/dashboard/top5')) {
      return mockOk({
        top5: [
          {
            tenant_id: 1,
            tenant_name: 'Acme',
            total_services: 8,
            avg_logins_per_week: 2.5,
            score: 20,
          },
        ],
      });
    }

    if (url.includes('/api/owner/dashboard/clients')) {
      return mockOk({
        clients: [
          {
            tenant_id: 1,
            tenant_name: 'Acme',
            plan: 'Business',
            plan_limit: 500,
            total_services: 8,
            avg_logins_per_week: 2.5,
            limit_pct: 81,
            trend_pct: 10,
          },
        ],
        total: 1,
        page: 0,
        per_page: 15,
        paginated: false,
      });
    }

    return mockOk({});
  });
}

describe('OwnerActivityDashboard', () => {
  beforeEach(() => {
    global.fetch = makeFetchMock() as unknown as typeof fetch;
  });

  it('renders fetched KPI and ranking data', async () => {
    render(<OwnerActivityDashboard />);

    expect(await screen.findByText('Servizi totali')).toBeInTheDocument();
    expect(await screen.findByText('30')).toBeInTheDocument();
    expect(await screen.findByText('Top 5 clienti')).toBeInTheDocument();
    expect(await screen.findAllByText('Acme')).toHaveLength(3);
  });

  it('reloads sections when period changes', async () => {
    const fetchSpy = makeFetchMock();
    global.fetch = fetchSpy as unknown as typeof fetch;
    const user = userEvent.setup();

    render(<OwnerActivityDashboard />);

    await screen.findByText('Servizi totali');

    await user.click(screen.getByRole('button', { name: '6 mesi' }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/owner/dashboard/kpis?months=6'),
        expect.any(Object)
      );
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/owner/dashboard/clients?months=6&page=0&per_page=15'),
        expect.any(Object)
      );
    });
  });
});
