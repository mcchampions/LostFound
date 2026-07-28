FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /build
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src/ src/
RUN mvn package -DskipTests -B

FROM eclipse-temurin:21-jre
WORKDIR /app
RUN mkdir -p /app/uploads

COPY --from=builder /build/target/*.jar app.jar

EXPOSE 8080

ENV APP_UPLOAD_PATH=/app/uploads

ENTRYPOINT ["java", "-Dfile.encoding=UTF-8", "-jar", "app.jar"]
