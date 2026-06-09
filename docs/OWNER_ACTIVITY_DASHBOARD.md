# Owner Activity Dashboard (Admin)

La feature espone una dashboard analytics per ruolo `ADMIN` nell'area protetta frontend.

## Frontend

- Pagina: `/app/admin-home`
- Tab: `Activity Dashboard`
- Componente principale: `OwnerActivityDashboard`

API interne Next.js (proxy verso backend):
- `GET /api/owner/dashboard/kpis?months=1|3|6|12`
- `GET /api/owner/dashboard/services-by-month?months=1|3|6|12`
- `GET /api/owner/dashboard/top5?months=1|3|6|12`
- `GET /api/owner/dashboard/clients?months=1|3|6|12&page=<n>&per_page=<n>`

## Backend

Endpoint REST (protetti con `@PreAuthorize("hasRole('ADMIN')")`):
- `GET /owner/dashboard/kpis`
- `GET /owner/dashboard/services-by-month`
- `GET /owner/dashboard/top5`
- `GET /owner/dashboard/clients`

Vincoli principali:
- `months` deve essere uno tra `1, 3, 6, 12`
- paginazione clienti attiva solo quando i tenant totali sono almeno 20

## Dati demo

Script seed dedicato:
- `backend/script/seed_owner_activity_dashboard.sql`

## Verifica rapida

Backend:
```bash
cd backend && mvn -B test
```

Frontend (unit + coverage):
```bash
cd frontend && npm run test:ci
```
