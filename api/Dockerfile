# Stage 1: Build
FROM mcr.microsoft.com/dotnet/sdk:9.0-alpine AS build
WORKDIR /src

# Copy solution-level files for central package management
COPY Directory.Packages.props ./
COPY Directory.Build.props ./
COPY Dodostays.sln ./

# Copy project files for layered restore caching
COPY src/Dodostays.Api/Dodostays.Api.csproj src/Dodostays.Api/
COPY src/Dodostays.Api.Contracts/Dodostays.Api.Contracts.csproj src/Dodostays.Api.Contracts/

# Restore dependencies (this layer is cached unless csproj/props change)
RUN dotnet restore src/Dodostays.Api/Dodostays.Api.csproj

# Copy all source code
COPY src/ ./src/

# Publish the application
RUN dotnet publish src/Dodostays.Api/Dodostays.Api.csproj \
    -c Release \
    -o /app/publish \
    --no-restore \
    /p:UseAppHost=false

# Stage 2: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:9.0-alpine AS runtime
WORKDIR /app

# Copy published application from build stage
COPY --from=build /app/publish .

# Create required wwwroot subdirectories
RUN mkdir -p /app/wwwroot/photos \
             /app/wwwroot/invoices \
             /app/wwwroot/emails \
             /app/wwwroot/sms

# Add non-root user for security
RUN adduser -D -u 1001 dodostays && \
    chown -R dodostays:dodostays /app
USER dodostays

# Configure ASP.NET Core
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 8080

# Health check (alpine includes wget by default)
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:8080/health/live || exit 1

ENTRYPOINT ["dotnet", "Dodostays.Api.dll"]
