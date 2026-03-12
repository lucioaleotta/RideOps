# CONTRIBUTING - Developer Workflow Guide

Guida completa per contribuire a RideOps: branching, commits, PRs, testing, deployment.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Branch Strategy](#branch-strategy)
3. [Commit Conventions](#commit-conventions)
4. [Testing Requirements](#testing-requirements)
5. [Pull Request Process](#pull-request-process)
6. [Code Review Checklist](#code-review-checklist)
7. [Deployment](#deployment)
8. [Emergency Procedures](#emergency-procedures)

---

## Getting Started

### 1. Setup Git Aliases (Optional but Recommended)

```bash
# Add to ~/.gitconfig
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.st status
git config --global alias.log1 "log --oneline -10"
```

### 2. Clone & Verify

```bash
git clone https://github.com/lucioaleotta/RideOps.git
cd RideOps

# Verify you can run tests
./dev.sh start
npm run test:ci -w frontend
mvn clean test -f backend/pom.xml
```

### 3. Set Upstream

```bash
git remote add upstream https://github.com/lucioaleotta/RideOps.git
git fetch upstream
```

---

## Branch Strategy

We use **Trunk-Based Development** with `main` as production-ready code.

### Branch Names

Format: `<type>/<description>`

**Types:**
- `feature/` - New functionality
- `fix/` - Bug fixes
- `refactor/` - Code restructuring
- `docs/` - Documentation
- `perf/` - Performance improvements
- `test/` - Test improvements

**Examples:**
```bash
# ✅ Good names
git checkout -b feature/ride-request-notifications
git checkout -b fix/logout-redirect-url
git checkout -b test/add-user-service-tests
git checkout -b docs/update-api-docs

# ❌ Bad names
git checkout -b feature/john-changes
git checkout -b fix/stuff
git checkout -b my-work
```

### Branch Workflow

```bash
# 1. Make sure main is up to date
git checkout main
git pull upstream main

# 2. Create feature branch
git checkout -b feature/my-feature

# 3. Make commits (small, focused)
git add src/feature.ts
git commit -m "feat: implement feature X"
git add tests/feature.test.ts
git commit -m "test: add feature X test cases"

# 4. Push to your fork
git push -u origin feature/my-feature

# 5. Open PR on GitHub

# 6. After merge, delete branch
git checkout main
git pull upstream main
git branch -d feature/my-feature
git push origin -d feature/my-feature
```

---

## Commit Conventions

We use **Conventional Commits** for clear, machine-readable history:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat` - New feature
- `fix` - Bug fix
- `test` - Test addition/modification
- `perf` - Performance improvement
- `refactor` - Code restructuring
- `docs` - Documentation
- `chore` - Maintenance tasks
- `ci` - CI/CD configuration

### Scope

Optional but recommended for clarity:

- `auth` - Authentication/authorization
- `services` - Ride services
- `finance` - Financial tracking
- `fleet` - Vehicle fleet management
- `driver` - Driver profile & management
- `admin` - Admin panel
- `db` - Database/migrations
- `docker` - Docker/deployment
- `tests` - Test infrastructure

### Examples

```bash
# Feature commit
git commit -m "feat(auth): add two-factor authentication"

# Bug fix
git commit -m "fix(login): resolve middleware HTML interception bug"

# Test addition
git commit -m "test(services): add RideService integration tests with Testcontainers"

# Documentation
git commit -m "docs(contributing): add contributor guidelines"

# Performance
git commit -m "perf(query): add database index on user_id"

# With body (optional, for complex changes)
git commit -m "fix(logout): resolve redirect vulnerability

- Updated buildPublicUrl() to use x-forwarded headers
- Added cookie clearing with maxAge=0
- Verified with integration tests

Fixes #123"
```

### Commit Best Practices

```bash
# ✅ Good: Small, focused commits
git commit -m "feat(auth): add login form validation"
git commit -m "test(auth): add validation test cases"
git commit -m "docs(auth): update API documentation"

# ❌ Bad: Large, unclear commits
git commit -m "update stuff all over the place"
git commit -m "WIP: multiple things"
git commit -m "fix everything"

# ✅ Good: Use -p for interactive staging
git add -p
# Review and stage individual changes

# ✅ Good: Amend last commit (before push)
git commit --amend --no-edit  # Adds staged changes to last commit
```

---

## Testing Requirements

### Before Committing

```bash
# 1. Backend tests
cd backend
mvn clean test       # Unit tests
mvn verify          # Unit + Integration

# 2. Frontend tests
cd frontend
npm test            # Watch mode
npm run test:ci     # Single run with coverage

# 3. Linting
mvn verify          # Backend (spotless auto-format)
npm run lint        # Frontend (eslint)

# 4. Build locally
mvn clean package -DskipTests
npm run build
```

### Test Requirements by Change Type

| Change Type | Unit | Integration | E2E | Coverage |
|:---|:---|:---|:---|:---|
| Auth logic | ✅ Required | ✅ Required | ➖ N/A | 80%+ |
| DB queries | ✅ Required | ✅ Required | ➖ N/A | 80%+ |
| UI component | ✅ Required | ➖ Optional | ✅ Critical | 70%+ |
| API endpoint | ✅ Required | ✅ Required | ✅ E2E flow | 80%+ |
| Utilities | ✅ Required | ➖ N/A | ➖ N/A | 90%+ |
| Config changes | ➖ N/A | ✅ Required | ➖ N/A | N/A |

### Example: Test a New Feature

```bash
# 1. Write tests first (TDD)
git add src/services/NewFeature.test.ts
git commit -m "test(services): add NewFeature test cases"

# 2. Implement feature
git add src/services/NewFeature.ts
git commit -m "feat(services): implement NewFeature"

# 3. Run tests
npm run test:ci
# Expected: All tests pass, coverage 70%+

# 4. Add integration test if needed
git add backend/src/test/java/com/rideops/services/NewFeatureIntegrationTest.java
git commit -m "test(services): add NewFeature integration test"

# 5. Verify coverage
mvn clean jacoco:report
# Check target/site/jacoco/index.html
```

---

## Pull Request Process

### Before Opening PR

```bash
# 1. Verify tests pass
npm run test:ci
mvn clean verify

# 2. Verify lint passes
npm run lint
mvn spotless:check

# 3. Up to date with main
git fetch upstream
git rebase upstream/main  # Don't merge!

# 4. Verify build works
npm run build
mvn clean package -DskipTests

# 5. Push to your branch
git push origin feature/my-feature
```

### PR Title Format

Follow conventional commits:

```
feat(auth): add two-factor authentication
fix(login): resolve middleware HTML interception
test(services): add integration tests
docs(api): update endpoint documentation
```

### PR Description Template

```markdown
## 🎯 What does this PR do?

Clear, concise description. Link to issue: Closes #123

## 🔍 Changes Made

- Change 1
- Change 2
- Change 3

## ✅ Verification

- [ ] All tests pass (`npm run test:ci`, `mvn verify`)
- [ ] Coverage maintained/improved
- [ ] No linting errors (`npm run lint`)
- [ ] Builds successfully
- [ ] Manual testing completed

## 📸 Screenshots (if UI changes)

Add screenshots before/after

## 🚨 Breaking Changes

List any breaking changes or migration steps needed

## 📝 Notes

Any deployment notes, env variables, or manual steps needed?
```

### PR Checklist for Reviewers

See [Code Review Checklist](#code-review-checklist) below.

### Merging PR

```bash
# GitHub UI: Use "Squash and merge"
# This creates one clean commit with PR title

# Never use regular "Merge pull request"
# (keeps messy commit history)
```

After merge:
```bash
git checkout main
git pull upstream main
git branch -d feature/my-feature
git push origin -d feature/my-feature
```

---

## Code Review Checklist

Use this when reviewing PRs.

### Functional Correctness

- [ ] Code does what PR description says
- [ ] No unnecessary code
- [ ] Error handling is appropriate
- [ ] Edge cases are handled
- [ ] Database migrations (if applicable) are safe

### Testing

- [ ] New tests added for new code
- [ ] All tests pass
- [ ] Coverage maintained or improved
- [ ] Mocks/fixtures appropriate
- [ ] No skipped tests (`skip()`, `x()`)

### Code Quality

- [ ] Follows team conventions
- [ ] No hardcoded values (use env vars, config)
- [ ] Comments explain "why", not "what"
- [ ] Variable names are clear
- [ ] No unnecessary imports
- [ ] No console.log/system.out (use logger)

### Security

- [ ] No secrets in code
- [ ] SQL queries parameterized (no string concat)
- [ ] Authentication/authorization checks present
- [ ] Input validation present
- [ ] HTTPS/TLS where applicable

### Documentation

- [ ] READMEs updated if needed
- [ ] API docs updated if endpoints changed
- [ ] Comments explain complex logic
- [ ] Commit messages are clear

### Performance

- [ ] No obvious N+1 queries
- [ ] No unnecessary loops
- [ ] Database indexes considered
- [ ] No sync operations in async contexts

### Devops

- [ ] Environment variables documented
- [ ] Docker/build files updated if needed
- [ ] Configuration changes logged
- [ ] Backwards compatibility checked

### Decision

- [ ] Approve (ready to merge)
- [ ] Request changes (blocking)
- [ ] Comment (suggestions, non-blocking)

---

## Deployment

### Automatic Deployment (Recommended)

```bash
# 1. Merge PR to main
git checkout main
git merge --squash origin/feature/my-feature
git push upstream main

# 2. GitHub Actions auto-runs
# → Runs tests
# → Builds Docker images
# → Deploys to Cloud Run
# → Runs smoke tests

# 3. Monitor deployment
# GitHub repo → Actions tab → Click workflow
# Click "frontend-cd" or "backend-cd"
# Wait 3-5 minutes for completion

# 4. Verify in production
curl https://rideops-frontend-9867177203.europe-west1.run.app/login
curl https://rideops-backend-9867177203.europe-west1.run.app/actuator/health
```

### Manual Deployment (If Needed)

```bash
# Backend
gcloud run deploy rideops-backend \
  --image europe-west1-docker.pkg.dev/rideops-489909/rideops/backend:main \
  --platform managed \
  --region europe-west1 \
  --set-env-vars="SPRING_DATASOURCE_URL=<URL>,SPRING_DATASOURCE_PASSWORD=<PASSWORD>"

# Frontend
gcloud run deploy rideops-frontend \
  --image europe-west1-docker.pkg.dev/rideops-489909/rideops/frontend:main \
  --platform managed \
  --region europe-west1 \
  --set-env-vars="NEXT_PUBLIC_API_URL=<URL>"
```

---

## Emergency Procedures

### Rollback Deployment

```bash
# 1. Find previous working revision
gcloud run revisions list --service=rideops-backend --region=europe-west1

# 2. Identify safe revision (check timing)
# 2. Restore to previous revision
gcloud run services update-traffic rideops-backend \
  --to-revisions REVISION_NAME=100 \
  --region=europe-west1

# 3. Verify it works
curl https://rideops-backend-9867177203.europe-west1.run.app/actuator/health

# 4. Fix code
git revert <bad-commit>
git push upstream main
# CI/CD redeploys automatically
```

### Hotfix for Production Bug

```bash
# 1. Create hotfix branch from main
git checkout main
git pull upstream main
git checkout -b fix/production-bug-123

# 2. Fix and test
# ... make minimal changes only
npm run test:ci
mvn verify

# 3. Commit with clear message
git commit -m "fix: resolve production bug #123

Critical issue affecting all users.
Root cause: [brief technical description]
Solution: [brief fix description]

Fixes #123"

# 4. Push and create PR
git push -u origin fix/production-bug-123
# Create PR with HIGH PRIORITY label

# 5. After approval, merge to main
# Automatic deploy will push to production immediately
```

### Database Migration Issues

If migration fails in production:

```bash
# 1. Check migration status
./dev.sh db-check

# 2. Rollback to previous migration (if needed)
./dev.sh db-rollback

# 3. Fix migration script locally
# Test thoroughly first!

# 4. Re-run migration
./dev.sh db-migrate
```

---

## Common Workflows

### Fix Someone Else's PR

```bash
# 1. Check out their branch
git fetch upstream
git checkout -b fix/review-feedback upstream/main

# 2. Make fixes
# 3. Commit with clear message
git commit -m "review: address feedback - improve error handling"

# 4. Push
git push -u origin fix/review-feedback

# 5. Tag original author
# Comment on PR: "Added fixes in <your-PR-link>"
```

### Squash Commits Before Merging

```bash
# 1. After making several commits
git log --oneline | head -5
# abc1234 feat: add feature part 3
# def5678 feat: add feature part 2
# ghi9012 feat: add feature part 1
# main >> jkl3456

# 2. Interactive rebase to squash last 3 commits
git rebase -i HEAD~3

# 3. In editor: keep first "pick", change others to "squash" (s)
# pick abc1234 feat: add feature part 1
# s   def5678 feat: add feature part 2
# s   ghi9012 feat: add feature part 3

# 4. Save file, combine commit messages

# 5. Force push to your branch
git push -f origin feature/my-feature

# 6. Open/update PR
```

### Keep Branch Updated With Main

```bash
# Option 1: Rebase (cleaner history)
git fetch upstream
git rebase upstream/main
git push -f origin feature/my-feature

# Option 2: Merge (if rebase would cause conflicts)
git fetch upstream
git merge upstream/main
# Resolve conflicts
git add .
git commit -m "merge: resolve conflicts with main"
git push origin feature/my-feature
```

### See What PR Will Change

```bash
# Before opening PR
git diff upstream/main..origin/feature/my-feature

# Or see commits in your branch
git log upstream/main..origin/feature/my-feature --oneline
```

---

## Tools & Resources

### Local Development

- `./dev.sh` - Development automation script
- `docker compose` - Local database + services
- `npm run dev` - Frontend dev server with hot reload
- `mvn spring-boot:run` - Backend dev server

### Testing

- `npm test` - Frontend unit tests (watch)
- `npm run test:ci` - Frontend tests (CI mode)
- `npm run test:e2e` - Frontend E2E tests
- `mvn verify` - Backend unit + integration tests
- `mvn clean jacoco:report` - Backend coverage report

### Code Quality

- `npm run lint` - Frontend linting
- `mvn spotless:check` - Backend formatting check
- `mvn spotless:apply` - Backend auto-format

### Documentation

- [QUICKSTART.md](QUICKSTART.md) - 5-minute setup
- [BRANCHING_STRATEGY.md](BRANCHING_STRATEGY.md) - Git workflow details
- [TESTING_STRATEGY.md](TESTING_STRATEGY.md) - Testing philosophy & patterns
- [CI_CD_IMPLEMENTATION.md](CI_CD_IMPLEMENTATION.md) - Deployment process

---

## FAQ

**Q: I made a commit to wrong branch. How do I fix it?**
```bash
git reset HEAD~1            # Undo last commit
git stash                   # Save changes
git checkout correct-branch
git stash pop               # Apply changes
git commit -m "..."
```

**Q: How do I update my PR after requested changes?**
```bash
# Make changes to your branch
git add .
git commit -m "review: address feedback"
git push origin feature/my-feature
# PR automatically updates
```

**Q: Can I work on multiple features at once?**
```bash
# Create separate branches for each
git checkout -b feature/task-1
# ... work on task 1

git checkout -b feature/task-2 main
# ... work on task 2

# Switch between them with git checkout
git checkout feature/task-1
```

**Q: What if I accidentally pushed to main?**
```bash
# Contact maintainer immediately!
# They can force reset: git reset --hard <safe-commit>
# Then push: git push -f origin main
# Recovery: Ask them to restore from backup
```

**Q: How do I test my code with production database?**
```bash
# Use your local dev database only
# Never connect to production DB

# To test with real data:
./dev.sh seed-prod-data
# This safely creates test data
```

---

## Support

- **Questions?** Ask in #development Slack channel
- **Found a bug?** Open issue on GitHub
- **Need help?** Check [DOCUMENTATION.md](DOCUMENTATION.md)
- **Stuck?** Reach out to maintainers

---

**Last updated:** 2024-01  
**Questions or improvements?** Open a PR to this file!
