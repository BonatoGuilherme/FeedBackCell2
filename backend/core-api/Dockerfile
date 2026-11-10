# Build: compila com o Maven Wrapper (Java 21) e gera o jar executável.
FROM eclipse-temurin:21-jdk AS build
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
# Jar extraído (lib/ separada) carrega mais rápido que o fat jar e permite o cache de classes.
COPY --from=build /src/target/core-api.jar /tmp/core-api.jar
RUN java -Djarmode=tools -jar /tmp/core-api.jar extract --destination /app && rm /tmp/core-api.jar
# Execução de treino (sobe o contexto e sai, sem banco/Redis) que grava o cache AppCDS das
# classes carregadas: a JVM sobe ~40% mais rápido. Se o arquivo não servir, a JVM só o ignora.
RUN APP_ENV_FILE=/nao-existe FLYWAY_ENABLED=false RATE_LIMIT_REDIS_URL= \
    java -XX:ArchiveClassesAtExit=/app/app.jsa -Xlog:cds=off -Xlog:cds+dynamic=off \
         -Dspring.context.exit=onRefresh -jar /app/core-api.jar > /dev/null \
    && test -s /app/app.jsa
USER app
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-XX:+ExitOnOutOfMemoryError", "-XX:SharedArchiveFile=/app/app.jsa", "-Xlog:cds=off", "-jar", "/app/core-api.jar"]
