# ── Stage 1: dependency cache ──────────────────────────────────────────────────
FROM maven:3.9.9-eclipse-temurin-21 AS deps
WORKDIR /app
COPY pom.xml .
RUN mvn -q dependency:go-offline -B

# ── Stage 2: build ─────────────────────────────────────────────────────────────
FROM deps AS build
COPY src ./src
RUN mvn -q -DskipTests clean package -B

# ── Stage 3: runtime ───────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre
WORKDIR /app
# Non-root user for security
RUN groupadd --system rideops && useradd --system --gid rideops rideops
COPY --from=build --chown=rideops:rideops /app/target/*.jar app.jar
USER rideops
EXPOSE 8080
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "/app/app.jar"]
