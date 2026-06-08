import { proxyOwnerDashboardGet } from '../_shared/proxy';

export async function GET(request: Request) {
  return proxyOwnerDashboardGet(request, 'services-by-month');
}
