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
COPY --from=build /src/target/core-api.jar app.jar
USER app
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "/app/app.jar"]
