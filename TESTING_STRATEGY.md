# Testing Strategy - RideOps

Strategia completa di testing per Backend + Frontend con strumenti e configurazione.

## 📋 Obiettivi

- ✅ **Coverage minimo**: 70% backend, 60% frontend
- ✅ **Test automatici su PR** (CI pipeline)
- ✅ **Test types**: Unit, Integration, E2E
- ✅ **Fast feedback**: < 5 min per PR
- ✅ **Deterministic**: No flaky tests

---

## 🏗️ Test Pyramid

```
        📊 E2E Tests (10%)           ← API + UI integration
         ├─ Playwright: critical flows
         └─ ~30 test cases

     Integration Tests (20%)         ← DB + Service layer
      ├─ Spring Boot Test Container
      ├─ @SpringBootTest + Testcontainers
      └─ ~60 test cases

   Unit Tests (70%)                  ← Functions, logic
    ├─ JUnit 5 + Mockito (backend)
    ├─ Jest (frontend)
    └─ ~200 test cases
```

---

# BACKEND TESTING STRATEGY

## 1. Unit Tests (70% coverage)

### Current State
- 6 test files exist
- Basic Controller + UseCase tests
- Uses: JUnit 5, Mockito, MockMvc

### What We Need

#### 1a. Controller Tests (10 files)
```java
// Pattern example
@WebMvcTest(UserController.class)
class UserControllerTest {
  @MockBean private UserService userService;
  @Autowired private MockMvc mockMvc;
  
  @Test void testCreateUser_Success() { ... }
  @Test void testCreateUser_Validation_Error() { ... }
  @Test void testGetUser_NotFound() { ... }
}
```

**Controllers to test:**
- AuthController
- UserController
- FinanceController (partial)
- VehicleManagementController (partial)
- ServicesController
- AdminController

#### 1b. Service/UseCase Tests (15 files)
```java
// Pattern example
class UserServiceTest {
  private UserService service;
  @Mock private UserRepository repo;
  
  @BeforeEach void setup() {
    service = new UserService(repo);
  }
  
  @Test void testCreateUser_ValidData() { ... }
  @Test void testUpdateUser_EmailConflict() { ... }
}
```

**Services to test:**
- AuthenticationService
- UserService
- FinanceService
- VehicleService
- ServiceAssignmentService
- DeadlineService

#### 1c. Repository/Adapter Tests (8 files)
```java
class UserRepositoryTest {
  @Test void testFindByEmail_NotFound() { ... }
  @Test void testFindByEmail_Found() { ... }
  @Test void testSave_Success() { ... }
}
```

### Tools: Backend Unit Tests
```xml
<!-- pom.xml additions -->
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-test</artifactId> <!-- ✅ Already present -->
</dependency>
```

**Run:** `mvn test`

---

## 2. Integration Tests (20% coverage)

### Current State
- Minimal integration tests
- No Testcontainers

### What We Need

#### 2a. Service Integration Tests (10 files)
```java
@SpringBootTest
@Testcontainers
class FinanceServiceIntegrationTest {
  @Container static PostgreSQLContainer<?> db = 
    new PostgreSQLContainer<>("postgres:15")
    .withDatabaseName("rideops_test")
    .withUsername("postgres");
    
  @Autowired private FinanceService service;
  @Autowired private FinancialTransactionRepository repo;
  
  @Test
  @Rollback
  void testCreateTransaction_SavesAndAffectsBalance() {
    // Crea transazione vera
    // Verifica sia salvata che il saldo sia aggiornato
  }
}
```

#### 2b. Controller Integration Tests (8 files)
```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class FinanceControllerIntegrationTest {
  @Autowired private TestRestTemplate restTemplate;
  
  @Test
  void testCreateTransaction_EndToEnd() {
    // POST /api/finance/transactions with real DB
  }
}
```

#### 2c. Database Migration Tests (2 files)
```java
@SpringBootTest
@Testcontainers
class FlywayMigrationTest {
  @Autowired private DataSource dataSource;
  
  @Test
  void testAllMigrationsExecute() {
    // Verifica che tutte le migration di Flyway si eseguano
  }
}
```

### Tools: Backend Integration Tests
```xml
<!-- pom.xml additions -->
<dependency>
  <groupId>org.testcontainers</groupId>
  <artifactId>testcontainers</artifactId>
  <version>1.19.8</version>
  <scope>test</scope>
</dependency>
<dependency>
  <groupId>org.testcontainers</groupId>
  <artifactId>postgresql</artifactId>
  <version>1.19.8</version>
  <scope>test</scope>
</dependency>
<dependency>
  <groupId>org.testcontainers</groupId>
  <artifactId>junit-jupiter</artifactId>
  <version>1.19.8</version>
  <scope>test</scope>
</dependency>
```

**Run:** `mvn verify`

---

## 3. E2E Tests (10% coverage)

### Current State
- No E2E tests
- No automation framework

### What We Need

#### 3a. API Flow Tests (5 scenarios)
```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class AuthFlowE2ETest {
  @LocalServerPort private int port;
  @Autowired private TestRestTemplate rest;
  
  @Test
  void testFullAuthFlow_Register_Login_AccessProtected() {
    // 1. POST /auth/register
    // 2. POST /auth/login
    // 3. GET /app/user (with token)
    // 4. Verify all steps succeed
  }
}
```

#### 3b. Business Flow Tests (8 scenarios)
- Service creation → Assignment → Completion → Finance tracking
- Vehicle maintenance deadline → Notification → Completion
- User role-based access control

### Tools: Backend E2E Tests
```xml
<!-- No additional dependencies needed, use TestRestTemplate -->
```

---

## Coverage & Reporting

### JaCoCo Configuration (for code coverage)
```xml
<!-- pom.xml -->
<plugin>
  <groupId>org.jacoco</groupId>
  <artifactId>jacoco-maven-plugin</artifactId>
  <version>0.8.11</version>
  <executions>
    <execution>
      <goals>
        <goal>prepare-agent</goal>
      </goals>
    </execution>
    <execution>
      <id>report</id>
      <phase>test</phase>
      <goals>
        <goal>report</goal>
      </goals>
    </execution>
  </executions>
</plugin>
```

**Run:** `mvn clean test`
**Report:** `target/site/jacoco/index.html`

---

---

# FRONTEND TESTING STRATEGY

## 1. Unit Tests (60% coverage)

### What We Need

#### 1a. Component Tests (15 files)
```typescript
// Example: frontend/components/__tests__/login-form.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import LoginForm from '../login-form';

describe('LoginForm', () => {
  it('renders email input', () => {
    render(<LoginForm />);
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
  });

  it('submits form with valid credentials', async () => {
    const handleSubmit = jest.fn();
    render(<LoginForm onSubmit={handleSubmit} />);
    
    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: 'test@example.com' }
    });
    fireEvent.click(screen.getByRole('button', /login/i));
    
    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalled();
    });
  });

  it('shows validation error on invalid email', () => {
    render(<LoginForm />);
    fireEvent.click(screen.getByRole('button', /login/i));
    expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
  });
});
```

**Components to test:**
- LoginForm
- ForgotPasswordForm
- ResetPasswordForm
- AppShell
- AdminUsersPanel
- DriverProfilePanel
- FleetVehiclesPanel
- ServicesPanel
- FinancePanel

#### 1b. Hook Tests (5 files)
```typescript
// frontend/lib/__tests__/jwt.test.ts
import { parseJWT } from '../jwt';

describe('JWT Utils', () => {
  it('parses valid JWT token', () => {
    const token = '...valid.jwt.token...';
    const parsed = parseJWT(token);
    expect(parsed.exp).toBeDefined();
  });
});
```

**Hooks/Utils to test:**
- JWT parsing
- Currency formatting
- API error handling
- Auth context

#### 1c. Page Tests (8 files)
```typescript
// frontend/app/__tests__/page.test.tsx
import { render, screen } from '@testing-library/react';
import HomePage from '../page';

describe('HomePage', () => {
  it('renders home page', () => {
    render(<HomePage />);
    expect(screen.getByText(/welcome/i)).toBeInTheDocument();
  });
});
```

**Pages to test:**
- HomePage
- LoginPage
- ForgotPasswordPage
- ResetPasswordPage
- AppPage (protected)
- AdminPage
- DriverPage
- GestionaleePage

### Tools: Frontend Unit Tests

```json
// frontend/package.json additions
{
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.1.0",
    "@testing-library/user-event": "^14.5.0",
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0",
    "@types/jest": "^29.5.0",
    "ts-jest": "^29.1.0"
  }
}
```

**Jest Configuration:**
```javascript
// frontend/jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>'],
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
};
```

**Run:** `npm test`

---

## 2. Integration Tests (20% coverage)

### What We Need

#### 2a. API Integration Tests (5 files)
```typescript
// frontend/app/api/__tests__/auth.integration.test.ts
import { POST as login } from '../auth/login-web/route';

describe('Auth API', () => {
  it('login endpoint returns JWT token', async () => {
    const request = new Request('http://localhost/api/auth/login-web', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'admin',
        password: 'ChangeMe123!'
      })
    });

    const response = await login(request);
    expect(response.status).toBe(303); // Redirect
    expect(response.headers.get('set-cookie')).toContain('access_token');
  });
});
```

**APIs to test:**
- Authentication flow
- Protected routes (middleware)
- Error handling

#### 2b. Middleware Tests (3 files)
```typescript
// frontend/__tests__/middleware.test.ts
import { middleware } from '../middleware';

describe('Middleware', () => {
  it('redirects unauthenticated user to login', () => {
    const request = new NextRequest('http://localhost/app/user');
    // No token in cookies
    const response = middleware(request);
    expect(response.status).toBe(307); // Temporary redirect
  });

  it('allows authenticated user to access protected route', () => {
    const request = new NextRequest('http://localhost/app/user');
    // Set auth cookie
    request.cookies.set('access_token', 'valid-token');
    const response = middleware(request);
    expect(response.status).not.toBe(307);
  });
});
```

### Tools: Frontend Integration Tests

```json
{
  "devDependencies": {
    "node-mocks-http": "^1.13.0",
    "next": "^14.2.15" // Already present
  }
}
```

**Run:** `npm run test:integration`

---

## 3. E2E Tests (10% coverage)

### What We Need

#### 3a. Critical User Flows (8 scenarios)
```typescript
// frontend/e2e/auth-flow.spec.ts
import { test, expect } from '@playwright/test';

test('User can register, login, and access app', async ({ page }) => {
  // 1. Go to login page
  await page.goto('http://localhost:3000/login');
  
  // 2. Fill login form
  await page.fill('input[name="userId"]', 'admin');
  await page.fill('input[name="password"]', 'ChangeMe123!');
  
  // 3. Submit
  await page.click('button[type="submit"]');
  
  // 4. Verify redirect to app
  await page.waitForURL('http://localhost:3000/app/**');
  expect(page.url()).toContain('/app');
});
```

**Flows to test:**
- Login flow
- Forgot password flow
- Create service
- Assign service to driver
- View service status
- Logout

### Tools: Frontend E2E Tests

```json
{
  "devDependencies": {
    "@playwright/test": "^1.40.0"
  }
}
```

**Playwright Configuration:**
```typescript
// frontend/playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  webServer: {
    command: 'npm run dev',
    port: 3000,
  },
  use: {
    baseURL: 'http://localhost:3000',
  },
  fullyParallel: true,
  retries: 1, // Retry failed tests once
});
```

**Run:** `npx playwright test`

---

---

## 📦 Summary: What To Add

### Backend Dependencies
```xml
<!-- pom.xml -->
<dependency>
  <groupId>org.testcontainers</groupId>
  <artifactId>testcontainers</artifactId>
  <version>1.19.8</version>
  <scope>test</scope>
</dependency>
<dependency>
  <groupId>org.testcontainers</groupId>
  <artifactId>postgresql</artifactId>
  <version>1.19.8</version>
  <scope>test</scope>
</dependency>
<dependency>
  <groupId>org.jacoco</groupId>
  <artifactId>jacoco-maven-plugin</artifactId>
  <version>0.8.11</version>
</dependency>
```

### Frontend Dependencies
```json
// package.json
{
  "devDependencies": {
    "jest": "^29.7.0",
    "ts-jest": "^29.1.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.1.0",
    "@testing-library/user-event": "^14.5.0",
    "@playwright/test": "^1.40.0",
    "jest-environment-jsdom": "^29.7.0"
  }
}
```

---

## 🚀 Implementation Plan

### Phase 1 (Week 1): Backend Unit Tests
- Add 15 service/usecase test files
- Add 10 controller test files
- Target: 50% coverage

### Phase 2 (Week 2): Backend Integration + Frontend Unit
- Add 10 integration test files (Testcontainers)
- Setup Jest + Testing Library for frontend
- Add 15 component tests
- Target: Backend 70%, Frontend 40%

### Phase 3 (Week 3): Frontend Integration + E2E
- Add 5 frontend integration tests
- Add 8 Playwright E2E tests
- Add critical business flow tests
- Target: All 60%+ coverage

---

## 📊 Coverage Goals (by end)

| Module | Current | Target | Tools |
|--------|---------|--------|-------|
| **Backend** | ~10% | 70% | JUnit, Mockito, Testcontainers, JaCoCo |
| **Frontend** | 0% | 60% | Jest, React Testing Library, Playwright |
| **E2E** | 0% | 10% paths | Playwright |

---

## CI Integration

### GitHub Actions Update
```yaml
# In .github/workflows/backend-cd.yml
- name: Run tests with coverage
  run: mvn clean test jacoco:report

- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    files: ./backend/target/site/jacoco/jacoco.xml

# In .github/workflows/frontend-cd.yml
- name: Run Jest tests
  run: npm test -- --coverage

- name: Run Playwright E2E tests
  run: npx playwright test

- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    files: ./frontend/coverage/coverage-final.json
```

---

## 📚 File Structure

```
backend/
├── src/test/java/com/rideops/
│   ├── auth/
│   │   ├── adapters/in/AuthControllerTest.java (NEW)
│   │   └── application/AuthServiceTest.java (NEW)
│   ├── fleet/
│   ├── services/
│   ├── users/
│   ├── finance/
│   └── integration/
│       ├── AuthFlowE2ETest.java (NEW)
│       └── ServiceFlowE2ETest.java (NEW)

frontend/
├── components/__tests__/
│   ├── login-form.test.tsx (NEW)
│   ├── app-shell.test.tsx (NEW)
│   └── ... (13 more)
├── app/__tests__/
│   ├── page.test.tsx (NEW)
│   ├── login/page.test.tsx (NEW)
│   └── ... (6 more)
├── lib/__tests__/
│   ├── jwt.test.ts (NEW)
│   └── currency.test.ts (NEW)
├── e2e/
│   ├── auth-flow.spec.ts (NEW)
│   ├── service-flow.spec.ts (NEW)
│   └── ... (6 more)
├── jest.config.js (NEW)
├── playwright.config.ts (NEW)
└── setupTests.ts (NEW)
```

