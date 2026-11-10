# Build: compila com o Maven Wrapper (Java 21) no formato fast-jar do Quarkus.
FROM eclipse-temurin:21-jdk AS build
# unzip: o mvnw só baixa o .zip (cujo SHA-256 está fixado no wrapper) quando ele existe
RUN apt-get update && apt-get install -y --no-install-recommends unzip && rm -rf /var/lib/apt/lists/*
WORKDIR /src
COPY .mvn .mvn
COPY mvnw pom.xml ./
# mvnw e o properties do wrapper podem chegar com CRLF de um checkout no Windows
RUN sed -i 's/\r$//' mvnw .mvn/wrapper/maven-wrapper.properties && chmod +x mvnw && ./mvnw -B -q dependency:go-offline
COPY src src
RUN ./mvnw -B -q -DskipTests package

FROM eclipse-temurin:21-jre
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --uid 10001 --home /app app
WORKDIR /app
COPY --from=build --chown=app /src/target/quarkus-app/lib/ lib/
COPY --from=build --chown=app /src/target/quarkus-app/*.jar ./
COPY --from=build --chown=app /src/target/quarkus-app/app/ app/
COPY --from=build --chown=app /src/target/quarkus-app/quarkus/ quarkus/
USER app
EXPOSE 8081
ENV QUARKUS_HTTP_HOST=0.0.0.0
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-XX:+ExitOnOutOfMemoryError", "-Djava.util.logging.manager=org.jboss.logmanager.LogManager", "-jar", "/app/quarkus-run.jar"]
