# RideOps - Project Documentation Index

Documentazione completa del progetto RideOps. Leggi i file nell'ordine suggerito.

## 🚀 Quick Start (Leggi Prima!)

**Per iniziare subito:**
1. [QUICKSTART.md](QUICKSTART.md) - Setup locale in 5 minuti
2. [CONTRIBUTING.md](CONTRIBUTING.md) - Workflow development per team

## 📚 Architecture & Design

| File | Descrizione |
|------|-------------|
| [README.md](README.md) | Overview generale del monorepo |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Struttura (layers, DB schema, auth flow, deployment) |
| [BRANCHING_STRATEGY.md](BRANCHING_STRATEGY.md) | Git workflow e naming conventions |

## 🔧 Developer Guides

| File | Descrizione |
|------|-------------|
| [QUICKSTART.md](QUICKSTART.md) | Setup locale + primo deploy in 5 minuti |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Workflow per developer (branching, commits, PR, testing) |
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | Soluzioni a 40+ problemi comuni |

## 🧪 Testing

| File | Descrizione |
|------|-------------|
| [TESTING_STRATEGY.md](TESTING_STRATEGY.md) | Test pyramid, tools, roadmap (Unit/Integration/E2E) |
| [TESTING_GUIDE.md](docs/TESTING_GUIDE.md) | Manuale per testers (gestori, driver) |

## 🔄 CI/CD & DevOps

| File | Descrizione |
|------|-------------|
| [CI_CD_IMPLEMENTATION.md](CI_CD_IMPLEMENTATION.md) | Setup checklist per CI/CD (35 min) |
| [GITHUB_OIDC_SETUP.md](docs/GITHUB_OIDC_SETUP.md) | OIDC Workload Identity Federation setup |
| [GITHUB_ACTIONS_SETUP.md](docs/GITHUB_ACTIONS_SETUP.md) | GitHub Secrets & Variables configuration |

## 📋 Workflows GitHub Actions

**Ubicazione:** `.github/workflows/`

| Workflow | Trigger | Azione |
|----------|---------|--------|
| `backend-ci.yml` | PR/Push to backend/ | Maven test |
| `backend-cd.yml` | Merge to main / Manual | Build + Docker + Cloud Run |
| `frontend-cd.yml` | Merge to main / Manual | Build + Docker + Cloud Run |
| `docs-ci.yml` | PR to docs/ | Markdown validation |

## 🏗️ Project Structure

```
RideOps/
├── backend/                    # Spring Boot Java 21
│   ├── pom.xml                # Maven config + Testcontainers + JaCoCo
│   ├── src/main/java/         # Source code (modular architecture)
│   ├── src/test/java/         # Unit + Integration tests
│   └── script/                # Database seeds
│
├── frontend/                   # Next.js 14 + TypeScript
│   ├── package.json           # Jest + Playwright config
│   ├── jest.config.js         # Jest setup
│   ├── playwright.config.ts    # Playwright setup
│   ├── setupTests.ts          # Test utilities
│   ├── app/                   # Next.js app (protected routes)
│   ├── components/            # React components
│   │   └── __tests__/         # Component tests (Jest)
│   ├── lib/                   # Utilities (JWT, currency)
│   ├── e2e/                   # Playwright E2E tests
│   └── Dockerfile             # Multi-stage build
│
├── docs/                       # Documentation
│   ├── GITHUB_OIDC_SETUP.md
│   ├── GITHUB_ACTIONS_SETUP.md
│   ├── TESTING_GUIDE.md
│   └── google-cloud-deploy-beginner.md
│
├── .github/
│   └── workflows/             # GitHub Actions
│       ├── backend-ci.yml
│       ├── backend-cd.yml
│       ├── frontend-cd.yml
│       └── docs-ci.yml
│
└── [This file] Documentation index

```

## ✅ Current Progress (This Session)

### Strategy & Process (Completed)
- ✅ Git branching strategy (Trunk-based, OIDC Federation)
- ✅ Branch convergence (develop → main consolidation)
- ✅ Branching naming conventions
- ✅ PR workflow with squash commits

### CI/CD Pipeline (Completed)
- ✅ GitHub Actions workflows (3 new)
- ✅ OIDC Workload Identity setup guide
- ✅ Automatic deploy on merge to main
- ✅ Manual deploy via workflow dispatch
- ✅ Slack notifications (optional)
- ✅ Docker image tagging with commit SHA

### Testing Suite (Completed)
- ✅ Backend: JUnit 5, Mockito, Testcontainers, JaCoCo
- ✅ Frontend: Jest, React Testing Library, Playwright
- ✅ Sample test files (1 unit, 1 E2E backend, 1 component, 1 E2E frontend)
- ✅ Test configuration files
- ✅ Coverage thresholds (40%+ gradual)

### Documentation (Completed)
- ✅ BRANCHING_STRATEGY.md
- ✅ TESTING_STRATEGY.md
- ✅ CI_CD_IMPLEMENTATION.md
- ✅ GITHUB_OIDC_SETUP.md
- ✅ GITHUB_ACTIONS_SETUP.md
- ✅ TESTING_GUIDE.md (for testers)
- ✅ This documentation index

---

## 🎯 Immediate Next Steps

### Phase 1: Infrastructure Setup (Today - 36 min)
- [ ] Execute OIDC setup commands (GITHUB_OIDC_SETUP.md)
- [ ] Configure GitHub Secrets (GITHUB_ACTIONS_SETUP.md)
- [ ] Test CI/CD with sample PR

### Phase 2: Expand Test Suite (This Week)
- [ ] Add 15+ backend unit tests
- [ ] Add 10+ backend integration tests
- [ ] Add 15+ frontend unit tests
- [ ] Target: 70% backend, 60% frontend coverage

### Phase 3: Documentation & Monitoring (Next Week)
- [ ] Add API documentation (OpenAPI/Swagger)
- [ ] Add deployment runbook
- [ ] Add troubleshooting guide
- [ ] Add monitoring & logging setup
- [ ] Add security scan (OWASP, npm audit in CI)

---

## 📖 Reading Order (Recommended)

**For New Contributors:**
1. [QUICKSTART.md](QUICKSTART.md) - Get running locally
2. [CONTRIBUTING.md](CONTRIBUTING.md) - Development workflow
3. [BRANCHING_STRATEGY.md](BRANCHING_STRATEGY.md) - Git workflow

**For Troubleshooting:**
1. [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - 40+ solutions indexed by problem type
2. [ARCHITECTURE.md](ARCHITECTURE.md) - Understanding system layers

**For Ops/DevOps Team:**
1. [CI_CD_IMPLEMENTATION.md](CI_CD_IMPLEMENTATION.md) - High-level overview
2. [GITHUB_OIDC_SETUP.md](docs/GITHUB_OIDC_SETUP.md) - OIDC federation
3. [GITHUB_ACTIONS_SETUP.md](docs/GITHUB_ACTIONS_SETUP.md) - GitHub config

**For QA/Testers:**
1. [TESTING_GUIDE.md](docs/TESTING_GUIDE.md) - Manual testing guide
2. [TESTING_STRATEGY.md](TESTING_STRATEGY.md) - Automated tests

**For Architects:**
1. [ARCHITECTURE.md](ARCHITECTURE.md) - System design
2. [BRANCHING_STRATEGY.md](BRANCHING_STRATEGY.md) - Monorepo strategy
3. [TESTING_STRATEGY.md](TESTING_STRATEGY.md) - Test pyramid

---

## 🔑 Key Credentials

| Service | User | Password | Note |
|---------|------|----------|------|
| RideOps App | admin | ChangeMe123! | Default seed user |
| GCP Project | (OIDC) | (Token-based) | GitHub Actions auth |
| Database | postgres | (container) | Local dev only |

---

## 🌐 Production URLs

| Service | URL |
|---------|-----|
| Frontend | https://rideops-frontend-9867177203.europe-west1.run.app |
| Backend API | https://rideops-backend-fgnnhhq3va-ew.a.run.app |
| Actuator Health | https://rideops-backend-fgnnhhq3va-ew.a.run.app/actuator/health |

---

## 💻 Local Development URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8080 |
| Actuator | http://localhost:8080/actuator/health |

---

## 📊 Quick Reference: Commands

```bash
# Development
./dev.sh start              # Start all services locally
./dev.sh stop               # Stop all services
npm run dev                 # Frontend in dev mode
cd backend && mvn spring-boot:run  # Backend in dev mode

# Testing
npm test                    # Frontend unit tests
npm run test:ci             # Frontend tests (CI mode)
npm run test:e2e            # Frontend E2E tests
mvn clean test              # Backend unit + integration tests
mvn clean verify            # Backend tests + coverage

# Building
npm run build               # Frontend production build
mvn clean package           # Backend JAR
docker compose --profile dev up --build

# Deployment
gcloud run deploy           # Deploy manually (CLI)
# Or via GitHub UI: Actions → Workflow → Run workflow

# Git Workflow
git checkout -b feature/ISSUE-XXX-description
# ... make changes ...
git push -u origin feature/ISSUE-XXX-description
# Open PR on GitHub → merge with squash
```

---

## 🚨 Emergency Contacts & Escalation

| Issue | Channel | Priority |
|-------|---------|----------|
| Production Down | Slack #critical | P0 |
| Deploy Failure | GitHub Issues | P1 |
| Test Failure | PR Review | P2 |
| Documentation | GitHub Discussions | P3 |

---

## 📝 License & Contributing

- All code: License (specify if needed)
- All changes: Via Pull Requests
- Conventions: See [CONTRIBUTING.md](CONTRIBUTING.md)

---

**Last Updated:** March 12, 2026  
**Version:** 1.0  
**Maintained By:** Development Team
