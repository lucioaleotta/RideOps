# QUICKSTART - Get RideOps Running in 5 Minutes

Guida rapida per setup locale e primo deploy.

## ⚡ Prerequisites

- macOS/Linux (or WSL on Windows)
- Docker Desktop installed
- Git installed
- Node.js 20+ (for frontend)
- Java 21 + Maven (for backend)
- GCP CLI (for Cloud deployments)

```bash
# Verify installations
node --version        # v20+
docker --version      # 20+
mvn --version        # 3.9+
java -version        # 21+
```

---

## 🚀 Step 1: Clone & Setup (2 min)

```bash
# Clone repository
git clone https://github.com/lucioaleotta/RideOps.git
cd RideOps

# Verify directory structure
ls -la backend frontend .github/workflows docker-compose.yml
```

---

## 🚀 Step 2: Start Services Locally (2 min)

### Option A: Quick Script (Recommended)
```bash
./dev.sh start
# Wait ~30 seconds for services to start
./dev.sh status
```

### Option B: Docker Compose
```bash
docker compose --profile dev up --build
# Wait for "Application started" in logs
```

### Option C: Individual Services
```bash
# Terminal 1: Database
./dev.sh db-start

# Terminal 2: Backend
./dev.sh backend-start

# Terminal 3: Frontend
./dev.sh frontend-start
```

---

## ✅ Quick Verification (1 min)

```bash
# Test backend health
curl http://localhost:8080/actuator/health

# Test frontend loads
curl -s http://localhost:5173/login | head -n 20

# Test login endpoint
./dev.sh login admin ChangeMe123!
```

You should see:
- ✅ Backend health: `{"status":"UP"}`
- ✅ Frontend: Login page HTML
- ✅ Login: JWT token response

---

## 🔓 Access the Application

1. **Frontend:** Open browser → http://localhost:5173
2. **Login:**
   - User: `admin`
   - Password: `ChangeMe123!`
3. **Explore:**
   - Services area: http://localhost:5173/app/services
   - Admin panel: http://localhost:5173/app/admin
   - Finance: http://localhost:5173/app/finance

---

## 🧪 Run Tests

```bash
# Backend tests (unit + integration)
cd backend
mvn clean test

# Frontend tests (unit + component)
cd frontend
npm install  # First time only
npm test     # Watch mode
npm run test:ci  # Single run

# Frontend E2E
npm run test:e2e
```

Expected output: ✅ All tests pass

---

## 📝 Make Your First Change

```bash
# 1. Create feature branch
git checkout -b feature/my-first-change

# 2. Make a change (e.g., modify README)
echo "# Test Change" >> README.md

# 3. Commit with conventional commit
git add README.md
git commit -m "docs: update README test"

# 4. Push to GitHub
git push -u origin feature/my-first-change

# 5. Open PR on GitHub
# → CI checks run automatically
# → After approval, merge with squash

# 6. Back to main (new version auto-deploys)
git checkout main
git pull origin main
```

---

## 🚀 Deploy to Production

### Option A: Automatic (Recommended)
- Merge PR to `main` branch
- CI/CD pipeline auto-deploys
- Watch: GitHub Actions tab

### Option B: Manual Deploy
```bash
# Backend
gcloud run deploy rideops-backend \
  --image europe-west1-docker.pkg.dev/rideops-489909/rideops/backend:latest \
  --platform managed \
  --region europe-west1

# Frontend
gcloud run deploy rideops-frontend \
  --image europe-west1-docker.pkg.dev/rideops-489909/rideops/frontend:latest \
  --platform managed \
  --region europe-west1
```

---

## 📚 Next Steps

1. **Read full documentation:** [DOCUMENTATION.md](DOCUMENTATION.md)
2. **Understand workflow:** [CONTRIBUTING.md](CONTRIBUTING.md)
3. **Learn testing:** [TESTING_STRATEGY.md](TESTING_STRATEGY.md)
4. **Setup CI/CD:** [CI_CD_IMPLEMENTATION.md](CI_CD_IMPLEMENTATION.md)

---

## 🆘 Troubleshooting

### Backend won't start
```bash
# Check if port 8080 is free
lsof -i :8080
# Kill if needed: kill -9 <PID>

# Check logs
./dev.sh backend-logs

# Reset database
./dev.sh db-restart
```

### Frontend won't load
```bash
# Clear next cache
rm -rf frontend/.next node_modules

# Reinstall
cd frontend
npm install
npm run dev
```

### Docker issues
```bash
# Reset everything
docker compose down -v
docker system prune -a

# Start fresh
./dev.sh start
```

### Tests failing
```bash
# Make sure Java 21 + Node 20 + Maven 3.9+
java -version
node --version
mvn --version

# Clear caches
rm -rf backend/target frontend/node_modules
mvn clean
npm cache clean --force
```

---

## 💡 Pro Tips

- Use `./dev.sh help` to see all available commands
- Set IDE to auto-format on save (prettier for frontend, spotless for backend)
- Keep commits small and focused
- Write tests BEFORE implementation (TDD)
- Check test coverage: `mvn clean jacoco:report` → open `target/site/jacoco/index.html`

---

## 🎯 You're Ready!

You now have:
- ✅ Local dev environment running
- ✅ Known how to run tests
- ✅ Know how to make changes & deploy
- ✅ Access to application in production

**Next:** Read [CONTRIBUTING.md](CONTRIBUTING.md) to understand the team's workflow!

---

**Time to first deploy:** ~5 minutes ⚡  
**Time to first PR:** ~15 minutes 📝  
**Questions?** Check [DOCUMENTATION.md](DOCUMENTATION.md) or open an issue
