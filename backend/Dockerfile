FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /build
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src/ src/
RUN mvn package -DskipTests -B

FROM eclipse-temurin:21-jre
WORKDIR /app

# Install Node.js for postgen2 cover generation
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    rm -rf /var/lib/apt/lists/*

# Install postgen2 (satori + resvg-js) — native binaries auto-selected for linux
RUN npm install postgen2 --prefix /app/postgen-dir && \
    ln -s /app/postgen-dir/node_modules/postgen2 /app/postgen

RUN mkdir -p /app/uploads /app/postgen-work

COPY --from=builder /build/target/*.jar app.jar

EXPOSE 8080

ENV APP_UPLOAD_PATH=/app/uploads
ENV POSTGEN_CLI_PATH=/app/postgen/dist/cli.js
ENV POSTGEN_FONT_REGULAR=/app/postgen/fonts/custom/LXGWWenKaiLite-Regular.ttf
ENV POSTGEN_FONT_BOLD=/app/postgen/fonts/custom/LXGWMarkerGothic-Regular.ttf

ENTRYPOINT ["java", "-Dfile.encoding=UTF-8", "-jar", "app.jar"]
