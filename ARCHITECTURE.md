# ARCHITECTURE - System Design & Code Structure

Guida completa all'architettura di RideOps: stack tecnologico, decision record, design patterns, database schema.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture Layers](#architecture-layers)
4. [Database Schema](#database-schema)
5. [Authentication Flow](#authentication-flow)
6. [API Design](#api-design)
7. [Frontend Architecture](#frontend-architecture)
8. [Backend Architecture](#backend-architecture)
9. [Deployment Architecture](#deployment-architecture)
10. [ADRs (Architecture Decision Records)](#adrs-architecture-decision-records)
11. [Design Patterns](#design-patterns)

---

## System Overview

RideOps è un sistema completamente distribuito per la gestione del ride sharing.

```
┌─────────────────────────────────────────────────────────────────┐
│                        External Users                            │
│                    (Web Browser, Mobile)                         │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                    HTTPS / TLS 1.3
                           │
         ┌─────────────────┴─────────────────┐
         │                                   │
    ┌────▼──────┐                    ┌──────▼────┐
    │ Frontend   │                    │  Backend   │
    │ Next.js    │                    │ Spring     │
    │ Cloud Run  │                    │ Boot       │
    │ 200ms p99  │                    │ Cloud Run  │
    └───┬────────┘                    └──────┬─────┘
        │                                    │
        │         API (REST/JSON)            │
        │◄─── /api/* (authenticated)  ───►   │
        │                                    │
        │                              ┌─────▼─────┐
        │                              │  Cloud SQL │
        │                              │ PostgreSQL │
        │                              │  Managed   │
        │                              └────────────┘
        │
        └─────────────────┬─────────────────┐
                  IAM & JWT tokens
                  (httpOnly cookies)
```

### Key Characteristics

- **Monorepo:** Frontend + Backend in same Git repo
- **Type-Safe:** TypeScript (frontend), Java (backend)
- **Container-Native:** Docker multi-stage builds
- **Cloud-Native:** Google Cloud Run (serverless)
- **Distributed:** Frontend & backend deployable independently
- **Authenticated:** JWT + OIDC Federation
- **Responsive:** < 200ms p99 latency (measured)

---

## Technology Stack

### Frontend Stack

| Layer | Technology | Version | Purpose |
|:---|:---|:---|:---|
| Framework | Next.js | 14.2.15 | Server/client rendering, routing |
| Language | TypeScript | 5.6.3 | Type safety, developer experience |
| Runtime | React | 18.3.1 | Component-based UI library |
| Styling | Tailwind CSS | Latest | Utility-first CSS framework |
| State | React Hooks | Built-in | Local + URL state management |
| Build | Webpack | Via Next.js | Code bundling, tree-shaking |
| Package Manager | npm | 10+ | Dependency management |
| Container | Docker | 20+ | Multi-stage for production |

**Frontend Dependencies (Key):**
```json
{
  "next": "14.2.15",
  "react": "18.3.1",
  "typescript": "5.6.3",
  "tailwindcss": "3.x",
  "axios": "1.x",  // API client
  "next-auth": "5.x" // JWT/OAuth
}
```

### Backend Stack

| Layer | Technology | Version | Purpose |
|:---|:---|:---|:---|
| Framework | Spring Boot | 3.3.8 | REST framework, IoC container |
| Language | Java | 21 LTS | Type-safe backend |
| Database | PostgreSQL | 15 | Relational DBMS |
| Web Server | Tomcat | Embedded | Application server |
| Build | Maven | 3.9+ | Dependency + build management |
| Container | Docker | 20+ | Multi-stage for production |
| Security | Spring Security | 6.x | Authentication, authorization |

**Backend Dependencies (Key):**
```xml
<!-- Web -->
<spring-boot-starter-web>
<spring-boot-starter-security>

<!-- Database -->
<spring-boot-starter-data-jpa>
<postgresql> (driver)

<!-- Testing -->
<spring-boot-starter-test>
<testcontainers> (PostgreSQL in Docker)
<junit-jupiter>

<!-- Monitoring -->
<spring-boot-starter-actuator>
<micrometer-core>
```

### Infrastructure Stack

| Layer | Technology | Purpose |
|:---|:---|:---|
| Cloud | Google Cloud Platform | Managed services |
| Compute | Cloud Run | Serverless container execution |
| Registry | Artifact Registry | Container image storage |
| Database | Cloud SQL PostgreSQL | Managed relational DB |
| Auth | Identity Platform | OAuth 2.0 / OIDC |
| CI/CD | GitHub Actions | Automated testing + deployment |
| DNS | Cloud DNS | Domain routing |
| CDN | Cloud CDN | Cache static assets |

### Development Stack

- **Local DB:** PostgreSQL in Docker
- **Dev Server:** Tomcat (Spring Boot) + Webpack (Next.js)
- **Testing:** Jest, Playwright, Testcontainers
- **Code Quality:** ESLint, Prettier, Spotless (Java formatter)
- **Version Control:** Git, GitHub

---

## Architecture Layers

### Frontend (Next.js)

```
frontend/
├── app/                           # Next.js App Router
│   ├── layout.tsx                # Root layout (providers, nav)
│   ├── page.tsx                  # Home page
│   ├── login/
│   │   └── page.tsx              # Login form page
│   ├── app/                       # Protected routes (requires auth)
│   │   ├── layout.tsx            # App shell (sidebar, nav)
│   │   ├── services/
│   │   │   └── page.tsx          # Services listing
│   │   ├── finance/
│   │   │   └── page.tsx          # Finance dashboard
│   │   └── admin/
│   │       └── page.tsx          # Admin panel
│   └── api/                       # Route handlers (server)
│       └── auth/
│           ├── login/route.ts    # POST /api/auth/login
│           └── logout/route.ts   # POST /api/auth/logout
│
├── components/                    # Reusable React components
│   ├── login-form.tsx            # Form with validation
│   ├── app-shell.tsx             # Layout wrapper
│   ├── services-panel.tsx        # Features components
│   └── __tests__/                # Component tests
│       ├── login-form.test.tsx
│       └── [...]
│
├── lib/                           # Utilities, helpers
│   ├── api.ts                    # Axios instance (API client)
│   ├── jwt.ts                    # JWT parsing, validation
│   ├── currency.ts               # Currency formatting
│   └── cookie.ts                 # Cookie helpers
│
├── types/                         # TypeScript interfaces
│   ├── auth.ts                   # User, JWT interfaces
│   ├── finance.ts                # Financial models
│   └── [...]
│
├── middleware.ts                  # Next.js middleware
│   └── Protects /app/* routes, redirects to /login
│
├── next.config.mjs               # Next.js config
├── tailwind.config.js            # Tailwind CSS config
├── jest.config.js                # Jest test config
├── playwright.config.ts          # Playwright E2E config
└── package.json                  # npm dependencies + scripts
```

**Request Flow (Frontend):**
```
Browser
  ↓
middleware.ts (check JWT in cookie)
  ├─ If valid → proceed
  └─ If invalid → redirect /login
  ↓
Next.js App Router (find route component)
  ├─ Static page (.tsx) → render + hydrate
  └─ API Route (route.ts) → execute server function
  ↓
Component (React)
  ├─ Use hooks (useState, useEffect)
  ├─ Maybe fetch data (axios)
  └─ Render JSX → HTML → browser displays
```

### Backend (Spring Boot)

```
backend/
├── src/main/java/com/rideops/
│   ├── RideopsApplication.java      # Application entry point
│   │
│   ├── security/                    # Authentication & authorization
│   │   ├── SecurityConfig.java      # Spring Security config
│   │   ├── JwtProvider.java         # JWT token generation
│   │   ├── JwtAuthenticationFilter.java
│   │   └── CustomUserDetails.java
│   │
│   ├── adapter/in/                  # HTTP Controllers
│   │   ├── auth/AuthController.java        # /api/auth/* endpoints
│   │   ├── services/ServicesController.java
│   │   ├── finance/FinanceController.java
│   │   └── admin/AdminController.java
│   │
│   ├── adapter/out/                 # Database repositories
│   │   ├── UserRepository.java      # JPA repository (User entity)
│   │   ├── RideRepository.java
│   │   ├── TransactionRepository.java
│   │   └── [...]
│   │
│   ├── application/                 # Business logic (Use Cases)
│   │   ├── AuthService.java         # Login, logout, token refresh
│   │   ├── RideService.java         # Ride request, accept, complete
│   │   ├── FinanceService.java      # Transaction tracking
│   │   └── [...]
│   │
│   ├── domain/                      # Domain models (entities)
│   │   ├── User.java                # JPA entity @Entity
│   │   ├── Ride.java
│   │   ├── Transaction.java
│   │   └── [...]
│   │
│   └── config/                      # Spring configuration
│       ├── DatabaseConfig.java
│       ├── CorsConfig.java
│       └── [...]
│
├── src/main/resources/
│   ├── application.yml              # Spring configuration (dev)
│   ├── application-prod.yml         # Production config
│   └── db/migration/                # Flyway SQL migrations
│       ├── V1__Initial_Schema.sql
│       ├── V2__Add_User_Roles.sql
│       └── [...]
│
├── src/test/java/com/rideops/
│   ├── integration/                 # Integration tests (with Testcontainers)
│   │   └── RideServiceRepositoryIntegrationTest.java
│   │
│   ├── unit/                        # Unit tests (mocked dependencies)
│   │   ├── AuthServiceTest.java
│   │   ├── FinanceServiceTest.java
│   │   └── [...]
│   │
│   └── [...]
│
└── pom.xml                          # Maven dependencies + build config
```

**Request Flow (Backend):**
```
HTTP Request: POST /api/auth/login
  ↓
Spring DispatcherServlet (route to controller)
  ↓
JwtAuthenticationFilter (middleware)
  ├─ Extract JWT from Authorization header
  └─ Validate signature + expiration
  ↓
AuthController.login() (handler/adapter)
  ├─ Validate input (email, password)
  ├─ Call AuthService.authenticate()
  └─ Return JWT in response header
  ↓
AuthService.authenticate() (business logic)
  ├─ Call UserRepository.findByEmail()
  ├─ Hash password + compare
  ├─ If valid, generate JWT token
  └─ Return User + Token
  ↓
UserRepository.findByEmail() (database access)
  ├─ Execute SQL: SELECT * FROM users WHERE email = ?
  └─ Return User entity
  ↓
HTTP Response: 200 OK
  Body: { "token": "...", "userId": "...", "role": "..." }
```

---

## Database Schema

### Core Entities

```sql
-- Users table
users:
  id (PK)
  email (UNIQUE, NOT NULL)
  password_hash (NOT NULL)
  first_name
  last_name
  role (ENUM: ADMIN, GESTIONALE, DRIVER)  -- role-based access
  status (ENUM: ACTIVE, SUSPENDED, DELETED)
  phone
  avatar_url
  created_at (timestamp)
  updated_at (timestamp)

-- Rides table (requests + completions)
rides:
  id (PK)
  rider_id (FK users.id)
  driver_id (FK users.id, nullable = unassigned)
  origin (location/coordinates)
  destination (location/coordinates)
  distance_km
  estimated_minutes
  fare_amount
  tip_amount
  status (ENUM: REQUESTED, ACCEPTED, ARRIVED, IN_PROGRESS, COMPLETED, CANCELLED)
  scheduled_at (nullable = ASAP)
  created_at
  updated_at
  completed_at (nullable)

-- Vehicles table (fleet management)
vehicles:
  id (PK)
  driver_id (FK users.id)
  license_plate (UNIQUE)
  make
  model
  year
  color
  status (ENUM: ACTIVE, MAINTENANCE, RETIRED)
  last_inspection_date
  insurance_expires_at
  created_at
  updated_at

-- Transactions table (financial tracking)
transactions:
  id (PK)
  user_id (FK users.id)           -- who received payment
  type (ENUM: RIDE_FARE, TIP, REFUND, CHARGE)
  amount
  currency (e.g. EUR)
  reference_id (FK rides.id, nullable)
  status (ENUM: PENDING, COMPLETED, FAILED)
  created_at
  updated_at

-- Audits table (compliance + security)
audits:
  id (PK)
  user_id (FK users.id, nullable)
  action (ENUM: LOGIN, LOGOUT, CREATE_RIDE, ADMIN_ACCESS)
  resource (e.g. "ride:123")
  details (JSON)
  ip_address
  user_agent
  created_at
```

### Relationships

```
Users (1) ─── (N) Rides (as rider or driver)
Users (1) ─── (N) Vehicles
Users (1) ─── (N) Transactions
Rides (1) ─── (N) Transactions (reference_id)
Vehicles (N) ─── (1) Users (driver_id)
Audits (N) ─── (1) Users
```

### Indexes (Performance Optimization)

```sql
-- Frequently queried
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_rides_rider_id ON rides(rider_id);
CREATE INDEX idx_rides_driver_id ON rides(driver_id);
CREATE INDEX idx_rides_status ON rides(status);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);

-- Time-based queries
CREATE INDEX idx_rides_created_at ON rides(created_at DESC);
CREATE INDEX idx_audits_created_at ON audits(created_at DESC);

-- Composite indexes
CREATE INDEX idx_rides_status_driver ON rides(status, driver_id)
WHERE driver_id IS NOT NULL;
```

---

## Authentication Flow

### Login Flow (JWT + httpOnly Cookies)

```
1. User enters email + password in /login form
   ↓
2. Frontend (middleware.ts) checks if already logged in
   └─ If yes → redirect /app
   └─ If no → show form
   ↓
3. User submits form
   ↓
4. Frontend calls POST /api/auth/login (route handler)
   {
     "email": "driver@example.com",
     "password": "SecurePass123!"
   }
   ↓
5. Backend (AuthController.login) receives request
   ├─ Validate input (not empty, valid email format)
   ├─ Query DB: SELECT * FROM users WHERE email = ?
   ├─ Compare request password with stored password_hash
   │  └─ Plain text is hashed with bcrypt then compared
   ├─ If invalid → return 401 Unauthorized
   ├─ If valid → generate JWT token
   └─ Return 200 OK with Set-Cookie header
   ↓
6. JWT Token Structure:
   {
     "header": { "alg": "HS256", "typ": "JWT" },
     "payload": {
       "sub": "driver:123",           # User ID
       "email": "driver@example.com",
       "role": "DRIVER",              # For authorization
       "iat": 1704067200,             # Issued at (unix ts)
       "exp": 1704153600              # Expires at (1 day later)
     },
     "signature": "..." # HMAC-SHA256 of header + payload
   }
   ↓
7. Backend sends response:
   HTTP/1.1 200 OK
   Set-Cookie: access_token=eyJhbGc...; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400
   Set-Cookie: user_role=DRIVER; Secure; SameSite=Strict; Path=/; Max-Age=86400
   
   {
     "success": true,
     "userId": "123",
     "role": "DRIVER"
   }
   ↓
8. Browser stores cookies (automatic, httpOnly = not accessible to JS)
   ↓
9. Frontend redirects to /app
   ↓
10. Subsequent requests to /app or /api:
    ├─ Middleware checks: Is access_token cookie valid?
    ├─ Verifies JWT signature (using secret key)
    ├─ Checks if not expired (exp > now)
    ├─ If valid → allow request
    └─ If invalid → redirect /login

11. Backend API requests (/api/*):
    ├─ JwtAuthenticationFilter (middleware)
    │  └─ Extracts JWT from Authorization header
    │  └─ Or from cookie (if sent)
    ├─ Validates signature + expiration
    ├─ If valid → SecurityContext.setAuthentication()
    └─ Controller handler executes with authenticated user
```

### Logout Flow

```
1. User clicks Logout button in /app
   ↓
2. Frontend calls POST /api/auth/logout
   └─ No body needed
   ↓
3. Backend (AuthController.logout) receives request
   ├─ Verify user is authenticated
   └─ Return 303 See Other redirect + clear cookies
   ↓
4. Backend sends response:
   HTTP/1.1 303 See Other
   Location: https://rideops-frontend-123.run.app/login
   Set-Cookie: access_token=; Max-Age=0; Path=/
   Set-Cookie: user_role=; Max-Age=0; Path=/
   ↓
5. Browser:
   ├─ Receives 303 redirect
   ├─ Clears cookies (Max-Age=0)
   └─ Redirects to https://rideops-frontend-123.run.app/login
   ↓
6. Next time user accesses /app:
   ├─ Middleware checks: Is access_token cookie present?
   ├─ Cookie not found (was cleared)
   └─ Redirect /login → show login form
```

### Role-Based Access Control (RBAC)

```
Roles in system:
  - ADMIN: Full system access, manage users/vehicles/finances
  - GESTIONALE: Manage fleet, assign rides, view analytics
  - DRIVER: View assigned rides, submit fares, profile management

Example: Authorization in Spring Security
@PreAuthorize("hasRole('ADMIN')")
public ResponseEntity<?> getAllUsers() {
  // Only ADMIN can access
}

Example: Authorization in Frontend Middleware
if (middleware path is /app/admin/*) {
  if (user role is ADMIN) → allow
  else → redirect /login
}

JWT token includes role claim:
{
  "sub": "user:123",
  "role": "DRIVER",
  ...
}
Frontend & backend both check role from token.
```

---

## API Design

### REST Endpoints

**Authentication:**
```
POST /api/auth/login
  Request:  { "email": "...", "password": "..." }
  Response: 200 { "userId": "...", "role": "..." }
  
POST /api/auth/logout
  Response: 303 Location: /login (with cleared cookies)

GET /api/auth/profile
  Response: 200 { "id": "...", "email": "...", "role": "..." }
```

**Rides:**
```
GET /api/services
  Query: ?status=REQUESTED&limit=10
  Response: 200 [{ id, origin, destination, fare, driver }, ...]

POST /api/services
  Request:  { "origin": [lat, lng], "destination": [lat, lng] }
  Response: 201 { "id": "...", "status": "REQUESTED", "fare": "..." }

PATCH /api/services/:id
  Request:  { "status": "ACCEPTED" }
  Response: 200 { ... }

GET /api/services/:id
  Response: 200 { id, rider, driver, status, fare, ... }
```

**Finance:**
```
GET /api/finance/transactions
  Query: ?user_id=123&month=2024-01
  Response: 200 [{ id, type, amount, date }, ...]

GET /api/finance/summary
  Response: 200 { totalEarnings: 1000, totalFares: 500, ... }
```

**Admin:**
```
GET /api/admin/users
  Query: ?role=DRIVER&status=ACTIVE
  Response: 200 [{ id, email, role, status }, ...]

PATCH /api/admin/users/:id
  Request:  { "status": "SUSPENDED" }
  Response: 200 { ... }
```

### API Error Response Format

```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Email is required",
    "details": {
      "field": "email"
    },
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

---

## Frontend Architecture

### State Management

**Local Component State (React Hooks):**
```tsx
function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // State only lives in component, re-initialized when component unmounts
}
```

**URL State (Router Query Parameters):**
```tsx
// Query state persists across navigation
// Example: /app/services?sort=distance&limit=20

function ServicesList() {
  const router = useRouter();
  const { sort, limit } = router.query;
  
  // Can bookmark this URL and state is restored
}
```

**Global State (Context API, not Redux):**
```tsx
// Not used in this project for simplicity
// If needed, use React Context + useReducer for complex flows
```

### Component Hierarchy

```
<RootLayout>
  ├─ <header> Navigation, user menu
  ├─ <main>
  │   ├─ <AppShell> (protected routes only)
  │   │   ├─ <Sidebar> Navigation menu
  │   │   └─ <Page> Content (varies by route)
  │   │       ├─ /app/services → <ServicesList>
  │   │       ├─ /app/finance → <FinanceDashboard>
  │   │       └─ /app/admin → <AdminPanel>
  │   │
  │   └─ <PublicPages>
  │       ├─ /login → <LoginForm>
  │       ├─ /forgot-password → <ForgotPasswordForm>
  │       └─ /reset-password → <ResetPasswordForm>
  │
  └─ <footer> Links, copyright
```

### Styling Strategy

**Tailwind CSS (Utility-First):**
```tsx
// ❌ Avoid creating CSS classes
// ✅ Use Tailwind utility classes directly

function Button({ children }) {
  return (
    <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
      {children}
    </button>
  );
}
```

**Component Composition Over Raw Styling:**
```tsx
// Create reusable styled components
function PrimaryButton({ children, onClick }) {
  return (
    <button onClick={onClick} className="px-4 py-2 bg-blue-500 text-white rounded">
      {children}
    </button>
  );
}

// Use everywhere
<PrimaryButton onClick={login}>Sign In</PrimaryButton>
```

---

## Backend Architecture

### Layered Architecture (Clean Code)

```
┌─────────────────────────────────── HTTP Layer ───────────────────────────────────┐
│ AdapterIn (Controllers)                                                            │
│ ├─ Parse HTTP request → DTO                                                      │
│ ├─ Call Use Case service                                                         │
│ └─ Convert response → JSON                                                       │
│ ┌─────────────────────────────── Application Layer ──────────────────────────────┐│
│ │ Use Cases (Services)                                                           ││
│ │ ├─ BusinessLogic                                                              ││
│ │ ├─ Orchestrate domain objects                                                 ││
│ │ └─ Call repositories                                                          ││
│ │ ┌──────────────────────────── Domain Layer ─────────────────────────────────┐││
│ │ │ Domain Models (Entities, Value Objects)                                   │││
│ │ │ ├─ Pure business rules                                                    │││
│ │ │ └─ No infrastructure knowledge                                            │││
│ │ │ ┌──────────────────────── Infrastructure Layer ──────────────────────┐   │││
│ │ │ │ AdapterOut (Repositories, External Services)                       │   │││
│ │ │ │ ├─ JPA repositories (database access)                              │   │││
│ │ │ │ ├─ HTTP clients (external APIs)                                    │   │││
│ │ │ │ └─ Caches, queues                                                  │   │││
│ │ │ │ ▼                                                                   │   │││
│ │ │ │ ┌─────────────┐  ┌──────────────┐  ┌─────────────┐                │   │││
│ │ │ │ │ PostgreSQL  │  │ Elasticsearch│  │ Redis Cache │                │   │││
│ │ │ │ └─────────────┘  └──────────────┘  └─────────────┘                │   │││
│ │ │ └──────────────────────────── ───────────────────────────────────────┘   │││
│ │ └──────────────────────────────────── ─────────────────────────────────────┘││
│ └────────────────────────────────────── ─────────────────────────────────────────┘
└─────────────────────────────────────── ──────────────────────────────────────────┘
```

### Package Structure

```java
com.rideops
├── RideopsApplication          // Entry point, @SpringBootApplication
├── adapter
│   ├── in.web                  // HTTP Controllers
│   │   ├── AuthController      // @RestController, @RequestMapping("/api/auth")
│   │   ├── ServicesController  // /api/services endpoints
│   │   └── ...
│   └── out.persistence         // Database repositories
│       ├── UserJpaRepository   // @Repository extends JpaRepository<User, Long>
│       ├── RideJpaRepository
│       └── ...
├── application                 // Business use cases (services)
│   ├── AuthService             // @Service, public methods for login/logout
│   ├── RideService             // Request, accept, complete rides
│   ├── FinanceService          // Track transactions
│   └── ...
├── domain                       // Business models
│   ├── User                     // @Entity, JPA annotations
│   ├── Ride
│   ├── Transaction
│   └── ...
├── security                     // Authentication & authorization
│   ├── SecurityConfig           // @Configuration, @EnableWebSecurity
│   ├── JwtProvider              // Generate, validate JWT
│   ├── JwtAuthenticationFilter  // @Component extends OncePerRequestFilter
│   └── CustomUserDetails        // UserDetails implementation
└── config                       // Spring @Configuration classes
    ├── CorsConfig               // CORS, origins whitelist
    ├── JacksonConfig            // JSON serialization
    └── ...
```

### Dependency Injection Pattern

```java
// Instead of manual instantiation:
AuthService authService = new AuthService();  // ❌ Wrong

// Use Spring DI (constructor injection):
@RestController
public class AuthController {
  private final AuthService authService;
  private final UserRepository userRepository;
  
  public AuthController(AuthService authService, UserRepository userRepository) {
    this.authService = authService;
    this.userRepository = userRepository;
  }
  // ✅ Spring automatically instantiates and injects
}
```

---

## Deployment Architecture

### Local Development

```
┌────────────────────────────────┐
│        Your Machine            │
├────────────────────────────────┤
│ ┌─────────────────────────────┐│
│ │  Docker Desktop             ││
│ │  ┌────────────┐             ││
│ │  │ PostgreSQL │ (port 5432) ││
│ │  │ Container  │             ││
│ │  └────────────┘             ││
│ │  ┌────────────┐             ││
│ │  │ Backend    │ (port 8080) ││
│ │  │ Container  │             ││
│ │  │ Spring Boot│             ││
│ │  └────────────┘             ││
│ └─────────────────────────────┘│
│                                │
│ npm run dev (Frontend)         │
│ Browser: http://localhost:5173│
└────────────────────────────────┘
```

### Production (Google Cloud Run)

```
┌─────────────────────── Google Cloud Platform ────────────────────────┐
│                                                                        │
│  ┌── Cloud Load Balancer (HTTPS/TLS termination) ──┐                │
│  │ https://rideops-frontend.run.app                │                │
│  │ https://rideops-backend.run.app                 │                │
│  └──────────────────────────────────────────────┬──┘                │
│                                                  │                    │
│  ┌─────────────────────┐      ┌───────────────────────┐             │
│  │  Cloud Run:         │       │  Cloud Run:           │             │
│  │  Frontend Service   │       │  Backend Service      │             │
│  │  ┌───────────────┐  │       │  ┌─────────────────┐  │             │
│  │  │ Next.js App  │  │       │  │ Spring Boot App │  │             │
│  │  │ 4 instances  │  │       │  │ 2 instances     │  │             │
│  │  │ Auto-scale   │  │       │  │ Auto-scale      │  │             │
│  │  │ Concurrency:1│  │       │  │ Concurrency:100 │  │             │
│  │  └───────────────┘  │       │  └────────┬────────┘  │             │
│  └─────────────────────┘       └───────────┼───────────┘             │
│           ▲                                │                          │
│           │ (serves static)                │                          │
│           │                                ▼                          │
│  ┌────────────────────────────────────────────────────┐             │
│  │  Cloud SQL: PostgreSQL 15                         │             │
│  │  ├─ Managed database                             │             │
│  │  ├─ Automated backups                            │             │
│  │  ├─ Read replicas (optional)                     │             │
│  │  └─ High availability (multi-zone)               │             │
│  └────────────────────────────────────────────────────┘             │
│                                                                        │
│  ┌────────────────────────────────────────────────────┐             │
│  │ Artifact Registry                                 │             │
│  │ ├─ rideops/frontend:latest                        │             │
│  │ └─ rideops/backend:latest                         │             │
│  └────────────────────────────────────────────────────┘             │
│                                                                        │
│  ┌────────────────────────────────────────────────────┐             │
│  │ Cloud IAM: Workload Identity Federation           │             │
│  │ GitHub Actions OIDC token → GCP temporary token  │             │
│  │ (Zero secrets in GitHub)                          │             │
│  └────────────────────────────────────────────────────┘             │
└────────────────────────────────────────────────────────────────────┘
```

### Continuous Deployment Pipeline

```
1. Developer pushes to main
   │
   ▼
2. GitHub Actions triggered
   ├─ Runs tests (npm test:ci, mvn verify)
   ├─ Builds Docker images
   │  ├─ backend:main
   │  └─ frontend:main
   └─ Push to Artifact Registry
   │
   ▼
3. Deploy Frontend Service
   ├─ Update Cloud Run service
   ├─ Deploy new image revision
   └─ Run smoke tests
   │
   ▼
4. Deploy Backend Service
   ├─ Run database migrations (Flyway)
   ├─ Update Cloud Run service
   ├─ Deploy new image revision
   └─ Verify health check (/actuator/health)
   │
   ▼
5. Monitoring & Alerts
   ├─ Check error rates
   ├─ Monitor latency
   └─ Slack notification: "Deployed successfully"
```

---

## ADRs (Architecture Decision Records)

### ADR-001: Use Next.js App Router (not Pages Router)

**Decision:** Use Next.js 14 App Router for frontend.

**Rationale:**
- Async Server Components (reduce JS bundle)
- Built-in layout system (less prop drilling)
- Better TypeScript support
- Faster build times
- Modern React patterns (hooks, concurrent rendering)

**Consequences:**
- Steep learning curve for Pages Router developers
- Requires Node.js 18+
- Less third-party library support (some are Pages-only)

**Alternatives Considered:**
- Pages Router: Legacy, page-based routing
- Remix: Excellent But steeper learning curve
- Astro: Not ideal for SPA dashboard

---

### ADR-002: Spring Boot with JPA for Backend

**Decision:** Use Spring Boot 3 with Spring Data JPA.

**Rationale:**
- Mature ecosystem, extensive tooling
- Excellent security framework (Spring Security)
- Strong ORM (JPA/Hibernate) prevents SQL injection
- Easy testing with Testcontainers
- Industry standard for enterprise apps

**Consequences:**
- Heavy framework (slower cold start than Go/Rust)
- Requires understanding Spring concepts
- JVM startup time (Cloud Run's cold starts longer)

**Alternatives Considered:**
- Go: Faster, lighter, better for microservices
- Node.js: Simpler for full-stack teams
- Rust: Best performance but steeper learning curve

---

### ADR-003: JWT Tokens in httpOnly Cookies

**Decision:** Store JWT in httpOnly, Secure, SameSite cookies (not localStorage).

**Rationale:**
- httpOnly prevents XSS attacks (JS can't read token)
- Secure flag: Only sent over HTTPS
- SameSite=Strict prevents CSRF attacks
- Automatic cookie inclusion in requests (no header manipulation)

**Consequences:**
- CORS requirements (withCredentials=true)
- Cross-domain calls require special setup
- Token rotation on expiration required

**Alternatives Considered:**
- localStorage: Vulnerable to XSS attacks
- Authorization header: Manual management, easier for APIs

---

### ADR-004: Monorepo (Frontend + Backend in Same Repo)

**Decision:** Single Git repository for frontend and backend.

**Rationale:**
- Atomic commits (frontend + backend changes together)
- Easier testing of integrated features
- Simplified deployment orchestration
- Reduced ceremony for shared standards

**Consequences:**
- Larger repository
- Requires separate build/test scripts
- Different CI pipelines (frontend vs backend)
- Harder to scale to many teams

**Alternatives Considered:**
- Polyrepo: Separate repos, harder to keep in sync
- Monolith: Single app, less scalable

---

### ADR-005: Serverless (Cloud Run) over Kubernetes

**Decision:** Deploy to Google Cloud Run (serverless containers).

**Rationale:**
- Zero infrastructure management
- Auto-scaling (scale to zero when idle, save $$)
- Pay only for used resources
- Built-in security, monitoring, logging
- Simpler deployment pipeline

**Consequences:**
- 5 minute cold start on first request
- Stateless constraint (no in-memory session storage)
- Request timeout: 30 minutes max
- Limited to 4GB RAM per instance

**Alternatives Considered:**
- Kubernetes (GKE): More complex, better for high traffic
- VM instances (Compute Engine): More control, manual scaling

---

### ADR-006: PostgreSQL as Primary Database

**Decision:** Use PostgreSQL (Cloud SQL managed service).

**Rationale:**
- Open source, free
- Excellent reliability, ACID compliance
- Rich query language (JSON, arrays, full-text search)
- Easy to integrate with Spring Data JPA
- Good support for relationships, normalization

**Consequences:**
- Not ideal for unstructured data (use separate store)
- Scaling for huge datasets requires partitioning
- Relational model enforces structure

**Alternatives Considered:**
- MongoDB: Easier for rapid development, harder to join
- DynamoDB: Better for serverless, limited query flexibility
- Firestore: Google's managed, limited transactions

---

## Design Patterns

### Factories (Create Objects)

```java
// UserFactory: Encapsulate User creation logic
public class UserFactory {
  public static User createDriverUser(String email, String name) {
    User user = new User();
    user.setEmail(email);
    user.setName(name);
    user.setRole(Role.DRIVER);  // automatic
    user.setCreatedAt(LocalDateTime.now());  // automatic
    return user;
  }
}

// Usage
User driver = UserFactory.createDriverUser("john@example.com", "John Doe");
```

### Repository Pattern (Data Access)

```java
// Hide database implementation behind interface
public interface RideRepository extends JpaRepository<Ride, Long> {
  List<Ride> findByStatus(RideStatus status);
  List<Ride> findByDriverId(Long driverId);
}

// Controller doesn't care if using SQL, MongoDB, Elasticsearch
@RestController
public class RideController {
  public List<Ride> getAvailableRides() {
    return rideRepository.findByStatus(RideStatus.REQUESTED);
  }
}
```

### Service Locator Anti-Pattern (Avoid!)

```java
// ❌ Don't do this
public class AuthController {
  private AuthService authService = ServiceLocator.getAuthService();
}

// Instead use Dependency Injection:
// ✅ Do this
public class AuthController {
  private final AuthService authService;
  
  public AuthController(AuthService authService) {
    this.authService = authService;
  }
}
```

### Decorator Pattern (Add Behavior)

```java
// CachedRideRepository wraps RideRepository
public class CachedRideRepository implements RideRepository {
  private final RideRepository delegate;
  private final Cache<Long, Ride> cache;
  
  @Override
  public Optional<Ride> findById(Long id) {
    return cache.getOrElseUpdate(id, () -> delegate.findById(id));
  }
}

// Usage
RideRepository repository = new CachedRideRepository(new JpaRideRepository());
```

### Strategy Pattern (Different Algorithms)

```java
// Fare calculation can vary by city/region
public interface FareCalculator {
  BigDecimal calculate(Location origin, Location destination);
}

public class UrbanFareCalculator implements FareCalculator {
  // More expensive per km
  @Override
  public BigDecimal calculate(Location origin, Location destination) {
    return distance * 2.50;  // €2.50/km
  }
}

public class RuralFareCalculator implements FareCalculator {
  // Less expensive per km
  @Override
  public BigDecimal calculate(Location origin, Location destination) {
    return distance * 1.50;  // €1.50/km
  }
}

// Usage
FareCalculator calculator = isUrbanArea() 
  ? new UrbanFareCalculator() 
  : new RuralFareCalculator();
```

---

## Conventions & Best Practices

### Naming Conventions

**Classes:**
```java
// ✅ Nouns in PascalCase, descriptive
UserService, RideRequest, FinanceTransaction

// ❌ Don't abbreviate
UserSvc, RdRequest, FinTxn
```

**Methods:**
```java
// ✅ Verbs in camelCase
getUserById(), calculateFare(), isDriverAvailable()

// ❌ Don't use get/set prefix unless returning/setting single field
getCalculateFare() ❌
calculateFare() ✅
```

**Variables:**
```java
// ✅ Descriptive camelCase
Long userId, LocalDateTime createdAt, String driverName

// ❌ Single letters (except loop counters)
Long u, LocalDateTime ca, String dn
```

**Database Tables & Columns:**
```sql
-- ✅ snake_case, plural table names
CREATE TABLE users (id BIGINT, first_name VARCHAR);
CREATE TABLE rides (id BIGINT, driver_id BIGINT, passenger_id BIGINT);

-- ❌ Don't use camelCase
CREATE TABLE User (id BIGINT);  ❌
```

### Code Organization

**One class per file:**
```
src/main/java/com/rideops/
├── services/
│   ├── AuthService.java          # 1 class per file
│   ├── RideService.java
│   └── FinanceService.java
```

**Related tests alongside source:**
```
src/
├── main/java/com/rideops/services/AuthService.java
└── test/java/com/rideops/services/AuthServiceTest.java
```

---

**Last Updated:** 2024-01  
**Feedback?** Contribute improvements via PR!
