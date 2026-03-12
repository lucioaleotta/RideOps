# TROUBLESHOOTING - Solutions to Common Issues

Guida per diagnosticare e risolvere problemi comuni durante sviluppo, testing, e deployment.

---

## Table of Contents

1. [Local Development](#local-development)
2. [Testing Issues](#testing-issues)
3. [Docker & Deployment](#docker--deployment)
4. [Database Issues](#database-issues)
5. [Authentication & Authorization](#authentication--authorization)
6. [Frontend Issues](#frontend-issues)
7. [Backend Issues](#backend-issues)
8. [Cloud Deployment](#cloud-deployment)
9. [Git & CI/CD](#git--cicd)
10. [Performance Issues](#performance-issues)

---

## Local Development

### Problem: `./dev.sh: command not found`

**Symptoms:** Script doesn't exist or not executable.

**Solution:**
```bash
# 1. Make script executable
chmod +x ./dev.sh

# 2. Verify it exists
ls -la dev.sh

# 3. Run with explicit path
./dev.sh start
```

### Problem: `Address already in use: 0.0.0.0:8080`

**Symptoms:** Backend won't start on port 8080.

**Solution:**
```bash
# 1. Find process using port 8080
lsof -i :8080
# Output: node/java PID 12345

# 2. Kill the process
kill -9 12345

# 3. Try again
./dev.sh backend-start

# Alternative: Use different port
export SPRING_SERVER_PORT=8081
mvn spring-boot:run
```

### Problem: `Port 5173 already in use`

**Symptoms:** Frontend won't start on port 5173.

**Solution:**
```bash
# 1. Check what's using it
lsof -i :5173

# 2. Kill process
kill -9 <PID>

# 3. Start frontend
cd frontend
npm run dev

# Alternative: Use different port
npm run dev -- --port 5174
```

### Problem: `docker: Cannot connect to Docker daemon`

**Symptoms:** Docker compose fails, says "Cannot connect".

**Solution:**
```bash
# 1. Start Docker Desktop (macOS)
open -a Docker

# 2. Wait 30 seconds for Docker to initialize

# 3. Verify Docker works
docker ps

# 4. Try dev.sh again
./dev.sh start
```

### Problem: Services won't communicate locally

**Symptoms:** Frontend can't reach backend API on localhost:8080.

**Troubleshoot:**
```bash
# 1. Verify backend is running
curl http://localhost:8080/actuator/health

# 2. Check frontend env vars
cat frontend/.env.local
# Should have: NEXT_PUBLIC_API_URL=http://localhost:8080

# 3. Verify network in docker-compose.yml
# Services should be on same network

# 4. Try from inside container
docker exec -it rideops-backend curl http://rideops-backend:8080/actuator/health

# 5. Rebuild and restart
docker compose down -v
docker compose --profile dev up --build
```

### Problem: Database connection refused

**Symptoms:** Backend logs: `PSQLException: Connection to localhost:5432 refused`

**Solution:**
```bash
# 1. Check if PostgreSQL is running
./dev.sh db-status

# 2. Start database
./dev.sh db-start

# 3. Verify connection
psql -h localhost -U rideops -d rideops -c "SELECT 1"
# Password: ChangeMe123!

# 4. If still failing, reset database
./dev.sh db-restart

# 5. Check database logs
docker logs rideops-db
```

---

## Testing Issues

### Problem: `Jest tests timeout`

**Symptoms:** Jest hangs when running tests, then timeout.

**Solution:**
```bash
# 1. Increase timeout
npm test -- --testTimeout=10000

# 2. Check for infinite loops
# Look for: while(true), setInterval without clearInterval

# 3. Check for unmocked API calls
# Look for: fetch(), axios() without mock

# 4. Run single test file
npm test -- auth-flow.spec.ts

# 5. Clear Jest cache
npm test -- --clearCache
```

### Problem: `Test passes locally but fails in CI`

**Symptoms:** `npm run test:ci` passes locally, fails in GitHub Actions.

**Root Causes:**
1. Race conditions (tests dependent on timing)
2. Environment variables not set
3. Different Node/npm versions

**Solution:**
```bash
# 1. Run tests exactly like CI
npm run test:ci

# 2. Check for hardcoded URLs
grep -r "localhost:8080" src/

# 3. Use environment variables
export DATABASE_URL="postgresql://user:pass@host:5432/db"

# 4. Check Node version
node --version  # Should be v20+
npm --version   # Should be 10+

# 5. Run in CI environment
docker run -it node:20 npm run test:ci
```

### Problem: `Cannot find module '@testing-library/react'`

**Symptoms:** Import error when running tests.

**Solution:**
```bash
# 1. Install dev dependencies
cd frontend
npm install --save-dev @testing-library/react @testing-library/jest-dom

# 2. Verify package.json has it
grep -A 10 "devDependencies" package.json

# 3. Clear cache
rm -rf node_modules
npm install

# 4. Try again
npm test
```

### Problem: `Testcontainers fails to start PostgreSQL`

**Symptoms:** Backend integration test fails: `Container failed to start`

**Solution:**
```bash
# 1. Check Docker is running
docker ps

# 2. Check Docker can pull postgres image
docker pull postgres:15

# 3. Check disk space
df -h  # Need at least 5GB free

# 4. Check Docker logs
docker logs <container_id>

# 5. Use explicit image timeout
mvn verify -Darguments="-DtestcontainersSpringBootTestContext"

# 6. Run test with debug output
mvn test -Dorg.slf4j.simpleLogger.defaultLogLevel=debug
```

### Problem: `No tests found`

**Symptoms:** Jest finds no tests, or test file found but empty.

**Solution:**
```bash
# 1. Verify test file exists
find . -name "*.test.ts" -o -name "*.spec.ts"

# 2. Check test file has test cases
grep -n "describe\|it(" frontend/components/__tests__/login-form.test.tsx

# 3. Verify jest config
cat frontend/jest.config.js
# Should have: testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.spec.ts"]

# 4. Run with verbose output
npm test -- --verbose

# 5. Run specific test
npm test -- login-form
```

### Problem: `Coverage threshold not met`

**Symptoms:** PR fails because coverage is below 40%.

**Solution:**
```bash
# 1. Check current coverage
npm run test:ci
# Look for: FAIL: coverage below 40%

# 2. See coverage report
open coverage/lcov-report/index.html

# 3. Identify uncovered files/lines
# Red/yellow = uncovered
# Green = covered

# 4. Add tests for uncovered code
# Usually: edge cases, error handling, branches

# 5. Verify coverage improved
npm run test:ci
```

---

## Docker & Deployment

### Problem: `Docker build fails with: no such file or directory`

**Symptoms:** Docker build fails during COPY or RUN step.

**Troubleshoot:**
```bash
# 1. Check Dockerfile
cat backend/Dockerfile
cat frontend/Dockerfile

# 2. Verify file exists on host
ls -la backend/pom.xml
ls -la frontend/package.json

# 3. Build with debug
docker build -f backend/Dockerfile -t rideops-backend-debug --progress=plain .

# 4. Check build context
# Docker runs from root, not inside backend/
docker build -f backend/Dockerfile -t rideops-backend .

# 5. If still fails, check Dockerfile paths
# Should use: COPY backend/pom.xml ./
# Not: COPY pom.xml ./
```

### Problem: `Docker image too large (> 1GB)`

**Symptoms:** Image size unusually large.

**Solution:**
```bash
# 1. Check image size
docker images | grep rideops

# 2. Check layers
docker history rideops-backend | head -20

# 3. Find what's large
# Look for RUN commands that don't clean up

# Quick fixes in Dockerfile:
# ❌ Bad:
RUN apt-get update
RUN apt-get install java-21-sdk

# ✅ Good:
RUN apt-get update && apt-get install java-21-sdk && apt-get clean

# 4. Use multi-stage build
# First stage: build
# Second stage: only runtime deps
# See: backend/Dockerfile (should have 2 FROM statements)

# 5. Rebuild
docker build -f backend/Dockerfile -t rideops-backend .
```

### Problem: `Container exits immediately`

**Symptoms:** `docker run <image>` starts container but exits.

**Solution:**
```bash
# 1. Check logs
docker logs <container_id>

# 2. Run with interactive terminal
docker run -it rideops-backend /bin/bash

# 3. Check for errors
# Look for: java.lang.ExceptionInInitializerError
# Look for: ClassNotFoundException

# 4. Verify environment variables
docker run -e SPRING_DATASOURCE_URL=... rideops-backend

# 5. Check entrypoint
docker inspect rideops-backend | grep -A 5 "Entrypoint"
```

### Problem: `Docker compose service stuck in restarting`

**Symptoms:** `docker compose ps` shows service restarting repeatedly.

**Solution:**
```bash
# 1. Check service logs
docker compose logs rideops-backend

# 2. Stop and view
docker compose stop
docker logs rideops-backend

# 3. Debug step by step
docker compose up -d rideops-db  # Just database
sleep 5
docker compose up -d rideops-backend  # Connect manually

# 4. Test database connection
docker compose exec rideops-backend psql -h rideops-db -U rideops

# 5. Check environment
docker compose config | grep environment
```

---

## Database Issues

### Problem: `Migrations fail: Column already exists`

**Symptoms:** Migration error: "column 'xxx' already exists"

**Solution:**
```bash
# 1. Check migration status
./dev.sh db-check

# 2. View last applied migration
psql -h localhost -U rideops -d rideops -c "SELECT * FROM flyway_schema_history ORDER BY installed_rank DESC LIMIT 5;"

# 3. Options:

# Option A: Migration already applied (safe)
# Do nothing, migration system will skip it on retry

# Option B: Someone manually added column
# Create migration that only runs if column doesn't exist:
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN;

# Option C: Rollback and redo
./dev.sh db-rollback  # Undo last N migrations
./dev.sh db-migrate   # Re-apply from start
```

### Problem: `Database connection pool exhausted`

**Symptoms:** Error: "Could not get a resource from the pool"

**Solution:**
```bash
# 1. Check active connections
psql -h localhost -U rideops -d rideops -c "SELECT count(*) FROM pg_stat_activity;"

# 2. Kill idle connections
psql -h localhost -U rideops -d rideops -c "
  SELECT pg_terminate_backend(pid) 
  FROM pg_stat_activity 
  WHERE state = 'idle' AND state_change < now() - interval '10 min';"

# 3. Check connection pool config
# backend/src/main/resources/application-local.yml
# Look for database connection pool settings

# 4. Increase connection pool
spring:
  datasource:
    hikari:
      maximum-pool-size: 20  # Increase from default 10

# 5. Restart backend
./dev.sh backend-restart
```

### Problem: `Data inconsistency after migration`

**Symptoms:** Migrated data looks wrong or incomplete.

**Solution:**
```bash
# 1. Verify migration ran correctly
psql -h localhost -U rideops -d rideops -c "
  SELECT version, description, execution_time 
  FROM flyway_schema_history 
  ORDER BY installed_rank DESC LIMIT 1;"

# 2. Count records before/after
psql -h localhost -U rideops -d rideops -c "SELECT COUNT(*) FROM rides;"

# 3. Check for transformation errors
# In migration file (V*.sql), check:
# - WHERE conditions are correct
# - Data type conversions won't truncate
# - All NULL handling is explicit

# 4. Rebuild from backup
# Restore database from backup
# Re-run migrations from start
./dev.sh db-restore-backup
./dev.sh db-migrate
```

### Problem: `Cannot log in to database locally`

**Symptoms:** `psql: FATAL: role 'rideops' does not exist`

**Solution:**
```bash
# 1. Check database is running
docker ps | grep postgres

# 2. Connect as admin
psql -h localhost -U postgres

# 3. Create user if missing
CREATE USER rideops WITH PASSWORD 'ChangeMe123!';
GRANT ALL PRIVILEGES ON DATABASE rideops TO rideops;

# 4. Or reset database
./dev.sh db-restart

# 5. Verify connection
psql -h localhost -U rideops -d rideops -c "SELECT 1;"
```

---

## Authentication & Authorization

### Problem: `401 Unauthorized: Invalid JWT token`

**Symptoms:** API returns 401 on authenticated request.

**Solution:**
```bash
# 1. Verify token in request
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/services

# 2. Check token format
# Token should be in header: Authorization: Bearer <token>
# Not: Authorization: <token>

# 3. Verify token is valid
# Token should be JWT (3 parts separated by .)

# 4. Check token expiration
# Go to jwt.io, paste token
# Check "exp" claim - is it in future?

# 5. Regenerate token
# Login again:
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "ChangeMe123!"}'

# 6. Use token from response
TOKEN=$(curl ... | jq -r '.token')
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/services
```

### Problem: `403 Forbidden: Insufficient permissions`

**Symptoms:** User logged in but getting 403.

**Solution:**
```bash
# 1. Check user role
# Login and check token contents
curl http://localhost:8080/api/auth/profile

# 2. Verify endpoint requires expected role
# Check Spring Security config
cat backend/src/main/java/com/rideops/security/SecurityConfig.java

# 3. Example:
# .antMatchers("/api/admin/**").hasRole("ADMIN")

# 4. Check user role matches endpoint requirement
# If endpoint requires ADMIN and user is DRIVER, access denied

# 5. Create admin user or endpoint for user role
# Either:
# - Promote user to ADMIN role
# - Create duplicate endpoint with DRIVER role

# 6. Test with correct user
./dev.sh login admin ChangeMe123!  # Should work
```

### Problem: `Session expires unexpectedly`

**Symptoms:** User logged in but gets redirected to login after short time.

**Solution:**
```bash
# 1. Check JWT expiration time
# In application.yml:
jwt:
  expiration: 3600  # seconds = 1 hour

# 2. Increase if needed
jwt:
  expiration: 86400  # 24 hours

# 3. Check cookie expiration
# Frontend middleware should set cookie with same expiration

# 4. Verify middleware checks expiration
# cat frontend/middleware.ts
# Should calculate: (token_exp_time - current_time) > 0

# 5. Test with fresh login
./dev.sh logout
./dev.sh login admin ChangeMe123!
```

### Problem: `CORS errors when calling API from frontend`

**Symptoms:** Browser console: `Access-Control-Allow-Origin header missing`

**Solution:**
```bash
# 1. Check backend CORS config
# Should have:
@Configuration
public class CorsConfig {
  @Bean
  public WebMvcConfigurer corsConfigurer() {
    return new WebMvcConfigurer() {
      @Override
      public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
          .allowedOrigins("http://localhost:5173", "https://rideops-*.run.app")
          .allowedMethods("GET", "POST", "PUT", "DELETE")
          .allowCredentials(true);
      }
    };
  }
}

# 2. If missing, add CORS config

# 3. Verify frontend API URL
# cat frontend/.env.local
# NEXT_PUBLIC_API_URL should match CORS allowedOrigins

# 4. Test from frontend
curl https://localhost:8080/api/services -H "Origin: http://localhost:5173"
# Should include: Access-Control-Allow-Origin: http://localhost:5173
```

---

## Frontend Issues

### Problem: `npm: command not found`

**Symptoms:** Shell says npm not found.

**Solution:**
```bash
# 1. Check Node is installed
node --version

# 2. If Node exists, npm should too
which npm

# 3. If missing, install Node
# macOS:
brew install node

# Linux:
sudo apt-get install nodejs npm

# Windows:
choco install nodejs

# 4. Verify
npm --version
```

### Problem: `next build fails with Out of Memory`

**Symptoms:** Build error: `JavaScript heap out of memory`

**Solution:**
```bash
# 1. Increase Node memory
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build

# 2. Or use node directly
node --max-old-space-size=4096 ./node_modules/.bin/next build

# 3. Or in package.json:
"build": "NODE_OPTIONS=--max-old-space-size=4096 next build"

# 4. Check for memory leaks
# Look for: infinite arrays, circular references, all data in memory

# 5. Split bundle
# Use dynamic imports:
const Component = dynamic(() => import('./Component'), { ssr: false });
```

### Problem: `CSS/styles not loading`

**Symptoms:** Page loads but no styles applied.

**Troubleshoot:**
```bash
# 1. Check CSS file exists and is imported
grep -r "globals.css" frontend/app/

# 2. Verify CSS import in layout.tsx
cat frontend/app/layout.tsx | grep "globals.css"

# 3. Clear next cache
rm -rf frontend/.next

# 4. Rebuild
npm run build

# 5. If using Tailwind, verify setup
cat frontend/tailwind.config.js  # Should exist
cat frontend/postcss.config.js   # Should exist

# 6. Test with inline style
# In component: style={{ color: 'red' }}
# If red text appears, CSS issue confirmed
```

### Problem: `Cannot find module error after npm install`

**Symptoms:** `Module not found: '@foo/bar'`

**Solution:**
```bash
# 1. Clear cache
rm -rf node_modules package-lock.json
npm cache clean --force

# 2. Reinstall fresh
npm install

# 3. Verify package installed
ls node_modules/@foo/bar

# 4. Check package.json has dependency
grep "@foo/bar" package.json

# 5. If still missing, install explicitly
npm install @foo/bar

# 6. Restart dev server
npm run dev
```

### Problem: `Hot reload not working`

**Symptoms:** Changes to code don't refresh in browser.

**Solution:**
```bash
# 1. Kill dev server
# Press Ctrl+C in terminal

# 2. Clear cache
rm -rf frontend/.next node_modules

# 3. Restart
npm install
npm run dev

# 4. Check file watchdog limit (Linux)
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# 5. Edit file, save, wait 2-3 seconds
# Browser should auto-refresh
```

### Problem: `TypeError: Cannot read property 'xxx' of undefined`

**Symptoms:** Runtime error in browser console.

**Solution:**
```bash
# 1. Check browser console (F12 → Console tab)
# Look for: TypeError at which line?

# 2. Review code at that line
# Example: user.profile.name
# Check: Is user null? Is profile null?

# 3. Add null checks
// ❌ Bad
<p>{user.profile.name}</p>

// ✅ Good
<p>{user?.profile?.name || 'Unknown'}</p>

# 4. Or use fallback component
{user && user.profile ? (
  <p>{user.profile.name}</p>
) : (
  <p>User data loading...</p>
)}

# 5. Check data fetch completes
// In component:
console.log('user:', user);  // Verify exists
```

---

## Backend Issues

### Problem: `Spring Boot application won't start`

**Symptoms:** `mvn spring-boot:run` exits with error.

**Solution:**
```bash
# 1. Check Java version
java -version  # Should be 21

# 2. Clear Maven cache
rm -rf ~/.m2/repository
mvn clean

# 3. Rebuild
mvn clean install -DskipTests

# 4. Check for compilation errors
mvn compile
# Look for: [ERROR] failed to compile

# 5. Review error messages fully
# Copy full error → search GitHub issues

# 6. Start with verbose logging
mvn spring-boot:run -X

# 7. Check dependencies conflict
mvn dependency:tree
# Look for duplicate versions
```

### Problem: `Port 8080 returns error page instead of API response`

**Symptoms:** Curl shows HTML error page, not JSON.

**Solution:**
```bash
# 1. Check endpoint exists
curl http://localhost:8080/api/services
# If 404 page, route not found

# 2. Verify route in controller
grep -r "@GetMapping" backend/src/main/java/

# 3. Check for controller exception handler
# Should intercept errors and return JSON

# 4. Add exception handler if missing
@RestControllerAdvice
public class GlobalExceptionHandler {
  @ExceptionHandler(Exception.class)
  public ResponseEntity<?> handleException(Exception e) {
    return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
  }
}

# 5. Restart backend
./dev.sh backend-restart

# 6. Test again
curl http://localhost:8080/api/services
```

### Problem: `SQL query takes too long`

**Symptoms:** API response slow (>1 second).

**Solution:**
```bash
# 1. Enable SQL logging
# application.yml:
spring.jpa.show-sql: true
spring.jpa.properties.hibernate.format_sql: true
spring.jpa.properties.hibernate.use_sql_comments: true

# 2. View backend logs
./dev.sh backend-logs

# 3. Look for slow queries
# Save query to a .sql file

# 4. Test query performance
time psql -h localhost -U rideops -d rideops < slow_query.sql

# 5. Add index if missing
CREATE INDEX idx_rides_driver_id ON rides(driver_id);

# 6. Analyze query plan
EXPLAIN ANALYZE SELECT * FROM rides WHERE driver_id = 123;
# Look for: Seq Scan (bad, should be Index Scan)

# 7. Verify code uses index
// In repository
@Query("SELECT r FROM Ride r WHERE r.driverId = ?1 ORDER BY r.createdAt DESC")
List<Ride> findByDriverIdOrderByCreatedAtDesc(Long driverId);
```

### Problem: `NullPointerException in service layer`

**Symptoms:** Request returns 500, logs show NullPointerException.

**Solution:**
```bash
# 1. View full stack trace
./dev.sh backend-logs | grep -A 10 "NullPointerException"

# 2. Review the line mentioned in stack trace
# Example: RideService.java:45

# 3. Add null check
// ❌ Bad
User user = userService.findById(userId);
String name = user.getName();  // NPE if user is null

// ✅ Good
User user = userService.findById(userId);
if (user == null) {
  throw new UserNotFoundException("User not found");
}
String name = user.getName();

# 4. Or use Optional
User user = userService.findByIdOptional(userId)
  .orElseThrow(() -> new UserNotFoundException("User not found"));

# 5. Add detailed logging
log.error("User not found for ID: {}", userId);

# 6. Test edge cases
// Test:
- User doesn't exist
- Service returns null
- Database record deleted between queries
```

---

## Cloud Deployment

### Problem: `gcloud: command not found`

**Symptoms:** Shell says gcloud not installed.

**Solution:**
```bash
# 1. Install Google Cloud CLI
# macOS:
brew install --cask google-cloud-sdk

# Linux:
curl https://sdk.cloud.google.com | bash

# 2. Initialize
gcloud init

# 3. Verify
gcloud --version
```

### Problem: `Permission denied: googleapis.com`

**Symptoms:** `gcloud run deploy` says "User does not have 'run.admin' permission"

**Solution:**
```bash
# 1. Verify you're authenticated
gcloud auth list

# 2. Set correct project
gcloud config set project rideops-489909

# 3. Verify your role
gcloud projects get-iam-policy rideops-489909 \
  --flatten="bindings[].members" \
  --filter="bindings.members:user:your-email@"

# 4. If missing role, ask admin to grant:
# - Cloud Run Admin
# - Service Account User

# 5. Reauth
gcloud auth login
gcloud auth application-default login
```

### Problem: `Deployment timeout or fails silently`

**Symptoms:** `gcloud run deploy` hangs or exits without error.

**Solution:**
```bash
# 1. Check deployment status
gcloud run describe rideops-backend --region europe-west1

# 2. View recent revisions
gcloud run revisions list --service rideops-backend --region europe-west1

# 3. Check image exists in Artifact Registry
gcloud artifacts docker images list europe-west1-docker.pkg.dev/rideops-489909/rideops/

# 4. Deploy with more verbose output
gcloud run deploy rideops-backend \
  --image ... \
  --verbosity=debug

# 5. Check Cloud Run quotas
gcloud compute project-info describe --project rideops-489909 | grep -A 5 "limits"

# 6. Check deployment service limits
# Cloud Run → Services → rideops-backend → View details
```

### Problem: `Image not found in Artifact Registry`

**Symptoms:** Deploy fails: "image not found"

**Solution:**
```bash
# 1. Verify image built and pushed
gcloud artifacts docker images list \
  europe-west1-docker.pkg.dev/rideops-489909/rideops/

# 2. List tags for specific image
gcloud artifacts docker images list \
  europe-west1-docker.pkg.dev/rideops-489909/rideops/backend

# 3. Build and push manually
docker build -t europe-west1-docker.pkg.dev/rideops-489909/rideops/backend:latest .
docker push europe-west1-docker.pkg.dev/rideops-489909/rideops/backend:latest

# 4. Verify push succeeded
# Check Artifact Registry UI
# Or: gcloud artifacts ... list

# 5. Use full image path in deploy
gcloud run deploy rideops-backend \
  --image europe-west1-docker.pkg.dev/rideops-489909/rideops/backend:latest
```

### Problem: `Service returns 503 Service Unavailable`

**Symptoms:** `https://rideops-backend-*.run.app/actuator/health` returns 503.

**Solution:**
```bash
# 1. Check service status
gcloud run describe rideops-backend --region europe-west1 | grep -i status

# 2. View recent logs
gcloud run logs read rideops-backend --region europe-west1 --limit 50

# 3. Look for error messages
# Common: database connection failed, missing env vars
# Look for: DatabaseException, ClassNotFoundException

# 4. Check environment variables
gcloud run services describe rideops-backend --region europe-west1

# 5. Verify required env vars are set
# SPRING_DATASOURCE_URL, SPRING_DATASOURCE_PASSWORD, etc.

# 6. Update env vars if needed
gcloud run services update rideops-backend \
  --set-env-vars SPRING_DATASOURCE_URL=... \
  --region europe-west1

# 7. Wait for new revision to deploy
# Monitor: gcloud run services describe ... --region=...
```

---

## Git & CI/CD

### Problem: `GitHub Actions workflow fails without clear error`

**Symptoms:** PR shows red X but log is unclear.

**Solution:**
```bash
# 1. Click workflow name in GitHub UI
# Actions tab → Click failed workflow

# 2. Expand steps to find which failed
# Usually last step before "Failed"

# 3. Common failures:
# - Tests failed (scroll to test output)
# - Docker build failed (look for build error)
# - Deploy failed (check gcloud error)

# 4. Run locally to reproduce
npm run test:ci  # Frontend tests
mvn verify       # Backend tests

# 5. If test passes locally but fails in CI:
# Check environment variables
# CI might have different DB, NODE_VERSION, etc.
```

### Problem: `Cannot push to repository: Permission denied`

**Symptoms:** `git push` returns "fatal: could not create work tree dir"

**Solution:**
```bash
# 1. Verify you have write access
# Check on GitHub: Settings → Collaborators
# You should be listed

# 2. Re-authenticate
# If using HTTPS:
git config --global credential.helper osxkeychain  # macOS
# Then: git push
# Enter GitHub personal access token in password prompt

# 3. If using SSH:
ssh-keygen -t ed25519 -C "your-email@example.com"
# Add public key to GitHub Settings → SSH and GPG keys

# 4. Verify remote URL
git remote -v
# Should show: (fetch) and (push)

# 5. Test connection
ssh -T git@github.com
# Should respond: "Hi <username>! You've successfully authenticated"
```

### Problem: `GitHub Actions secrets not available to workflow`

**Symptoms:** Workflow fails with: `undefined variable ${{ secrets.DATABASE_URL }}`

**Solution:**
```bash
# 1. Verify secrets are created
# GitHub → Settings → Secrets and variables → Actions

# 2. Check secret name matches
# In workflow: ${{ secrets.DATABASE_URL }}
# In Settings: DATABASE_URL (exact match, case-sensitive)

# 3. Verify workflow syntax
# Should be: ${{ secrets.DATABASE_URL }}
# Not: $secrets.DATABASE_URL or ${DATABASE_URL}

# 4. Restart workflow after adding secret
# Secret might not be available to currently running job
# Wait for next push or manually trigger

# 5. Debug: print available secrets (don't print actual value!)
- name: Debug secrets
  run: |
    echo "Available environment variables:"
    env | grep -v PASSWORD | grep -v TOKEN
```

---

## Performance Issues

### Problem: `Frontend build takes > 5 minutes`

**Symptoms:** `npm run build` slower than expected.

**Solution:**
```bash
# 1. Check Node version
node --version  # Should be recent

# 2. Analyze build time
npm run build -- --analyze

# 3. Large bundles to optimize:
# - Images (use <Image> component, lazy load)
# - Libraries (swap for lighter alternatives)
# - Code splitting (use dynamic imports)

# 4. Add build cache in CI
- uses: actions/cache@v3
  with:
    path: frontend/.next/cache
    key: ${{ runner.os }}-nextjs-${{ hashFiles('**/package-lock.json') }}

# 5. Parallel builds in CI
# Use multiple runners for frontend + backend at same time
```

### Problem: `Database queries getting progressively slower`

**Symptoms:** API was fast, now consistently slow.

**Solution:**
```bash
# 1. Check disk space (tables getting huge)
psql -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables WHERE schemaname != 'pg_catalog' ORDER BY pg_total_relation_size DESC;"

# 2. Analyze table statistics
ANALYZE rides;

# 3. Rebuild indexes
REINDEX TABLE rides;

# 4. Archive old data if table huge
BEGIN;
CREATE TABLE rides_archive AS SELECT * FROM rides WHERE created_at < NOW() - INTERVAL '1 year';
DELETE FROM rides WHERE created_at < NOW() - INTERVAL '1 year';
COMMIT;

# 5. Monitor connections
# Too many connections = slow queries queue up
psql -c "SELECT * FROM pg_stat_activity;" | wc -l
```

### Problem: `Docker image or container takes too long to start`

**Symptoms:** Container startup: 30+ seconds.

**Solution:**
```bash
# 1. Check startup logs
docker logs --tail 50 --follow <container>

# 2. Look for:
# - Spring Boot scanning packages
# - Database migrations running
# - Large files copying

# 3. Optimize Spring Boot startup
# application.yml:
spring:
  jpa:
    hibernate:
      ddl-auto: validate  # Don't recreate schema
  web:
    resources:
      cache:
        period: 3600  # Cache static resources

# 4. Optimize Dockerfile
# Multi-stage build (separate build + runtime)
# Only copy necessary files

# 5. Pre-warm JVM in container entrypoint
# Pre-compile hot classes before starting app

# 6. Measure startup time
time docker run --rm alpine sleep 1  # Should be ~0.2s
```

---

## Unable to Find Solution?

If your issue isn't here:

1. **Check the main docs:** [DOCUMENTATION.md](DOCUMENTATION.md)
2. **Read strategy guides:**
   - Testing: [TESTING_STRATEGY.md](TESTING_STRATEGY.md)
   - CI/CD: [CI_CD_IMPLEMENTATION.md](CI_CD_IMPLEMENTATION.md)
   - Branching: [BRANCHING_STRATEGY.md](BRANCHING_STRATEGY.md)
3. **Search GitHub issues:** github.com/lucioaleotta/RideOps/issues
4. **Ask team in Slack:** #development channel
5. **Open new issue with details:**
   - Error message (full copy)
   - Steps to reproduce
   - Environment (Node version, Java version, OS, Docker version)
   - What you tried to fix

---

**Last updated:** 2024-01  
**Feedback?** Improve this guide by editing and opening a PR!
