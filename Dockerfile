# Use a base image with Maven 4 and Java 17
FROM maven:3.9-eclipse-temurin-17-alpine AS build

# Set the working directory inside the container
WORKDIR /app

# Copy the root `pom.xml` for the parent project
COPY pom.xml ./

# Copy the Maven project files
COPY back-end/pom.xml ./back-end/pom.xml
COPY back-end/src ./back-end/src

# Run Maven install to build the project
RUN mvn clean install -DskipTests

# Use a smaller runtime image for the final build
FROM eclipse-temurin:17-jdk


# Set the working directory inside the container
WORKDIR /app

# Copy the built JAR file from the previous stage
COPY --from=build /app/back-end/target/*.jar app.jar

# Expose the port your Spring Boot app runs on
EXPOSE 8080

# Add a delay to ensure MongoDB is ready
CMD ["/bin/sh", "-c", "sleep 10 && java -jar app.jar"]
