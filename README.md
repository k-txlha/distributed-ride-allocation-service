# Real-Time Driver Allocation System

A lightweight NestJS backend for managing ride requests and assigning them to nearby drivers under high-concurrency conditions. The system uses PostgreSQL for persistent ride state and Valkey/Redis for fast geospatial lookup and race-safe ride acceptance.

## Overview

This project demonstrates a practical approach to:

- tracking driver locations in real time
- finding nearby drivers using geographic coordinates
- creating ride requests and broadcasting them to candidate drivers
- ensuring that only one driver can successfully accept a ride through atomic locking

## Features

- Fast driver location updates via Redis geospatial indexing
- Proximity-based ride matching using radius search
- Durable ride lifecycle tracking in PostgreSQL
- Concurrency protection using Redis `SET NX EX` locking
- Simple HTTP API for integration and testing

## Tech Stack

- NestJS
- TypeScript
- TypeORM
- PostgreSQL
- Valkey/Redis
- Docker Compose

## Architecture

The application is organized around three main responsibilities:

1. API layer
   - Exposes endpoints for driver location updates, ride creation, and ride acceptance.

2. Persistence layer
   - Stores ride records in PostgreSQL.

3. In-memory and coordination layer
   - Uses Redis/Valkey to store driver coordinates and enforce atomic acceptance.

### Architecture Diagram

```text
  [Passenger]                 [NestJS API Gateway]               [Active Drivers]
       |                               |                                |
       |--- 1. POST /api/rides ------->|                                |
       |    (Create Request)           |                                |
       |                               |--- 2. POST /drivers/location ->|
       |                               |    (Stream Coordinates)        |
       |                               |                                |
       |                               +---------------+                |
       |                               |               |                |
       |                               v               v                |
       |                        +------------+  +------------+          |
       |                        | PostgreSQL |  |Redis/Valkey|          |
       |                        +------------+  +------------+          |
       |                        | Persistent |  | Spatial    |          |
       |                        | Source of  |  | Indexes &  |          |
       |                        | Truth      |  | Distributed|          |
       |                        +------------+  | Locks      |          |
       |                                        +------------+          |
       |                                               |                |
       |                                               |                |
       |<-- 3. Broadcast to Match Set (Simulated Log) -+                |
       |                                                                |
       |                                                                |
       |                               |<-- 4. Parallel /accept Calls --|
       |                               |    (Nanosecond Race Condition) |
       |                               |                                |
       |                               +---------------+                |
       |                               | Atomic SETNX  |                |
       |                               | Filter Gate   |                |
       |                               +---------------+                |
       |                               |                                |
       |                               |--- 5. First-arrival Wins ----->|
       |                               |    (Status: 201 Assigned)      |
       |                               |                                |
       |                               |--- 6. Stragglers Rejected ---->|
       |                                    (Status: 409 Conflict)      |
```

## Project Structure

```text
src/
  app.module.ts
  main.ts
  ride.controller.ts
  ride.service.ts
compose.yaml
schema.sql
package.json
test.ts
```

## Prerequisites

Make sure you have the following installed:

- Node.js 18+
- npm
- Docker Desktop

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Start PostgreSQL and Valkey

```bash
docker compose up -d --build
```

### 3. Initialize the database schema

```bash
docker exec -i driver_allocation_system-postgres-1 psql -U admin -d vcabs < schema.sql
```

### 4. Start the NestJS server

```bash
npm start
```

The API will be available at:

```text
http://localhost:3000/api
```

### 5. Run the concurrency test

```bash
npm run test
```

This simulates multiple drivers attempting to accept the same ride at the same time and verifies that only one succeeds.

## API Endpoints

### Update driver location

```bash
curl -X POST http://localhost:3000/api/drivers/location \
  -H "Content-Type: application/json" \
  -d '{"driverId":"driver_alpha","lon":72.8777,"lat":19.0760}'
```

### Create a ride request

```bash
curl -X POST http://localhost:3000/api/rides \
  -H "Content-Type: application/json" \
  -d '{"lon":72.8777,"lat":19.0760}'
```

### Accept a ride

```bash
curl -X POST http://localhost:3000/api/rides/REPLACE_WITH_RIDE_UUID/accept \
  -H "Content-Type: application/json" \
  -d '{"driverId":"driver_alpha"}'
```

## Core Component Justifications

- **Notification Layer Choice:** For this implementation, a simulated notification engine log was chosen. This keeps the system decoupled and makes standalone verification straightforward without introducing unnecessary connection overhead from idle WebSocket or SSE connections.
- **Concurrency Protection:** The system leverages Redis's single-threaded network loop through the atomic `SET` command with `NX` (Not Exists) and `EX` (Expiration) parameters. This provides strong protection against data races before any PostgreSQL row is modified.

## Requirements & Engineering Coverage

1. **Geo-based Driver Search:** Built around Redis `GEOADD` sorted sets and efficient `GEOSEARCH` radius filtering. It tracks coordinates on the fly and avoids stale cache scans.
2. **Concurrency Handling:** Implements distributed locking. When a driver triggers ride acceptance, an exclusive lock key such as `lock:ride:<uuid>` is evaluated.
3. **Timeout & Safety Gates:** Distributed locks use a 30-second TTL via `EX 30`. If a node or process fails mid-flight, the lock expires automatically to prevent deadlocks.
4. **State Management:** The ride lifecycle is tracked across the main stages:
   - `REQUESTED` / `SEARCHING`: initial validation and proximity matching
   - `ASSIGNED`: the lock is acquired and the database record is updated with the winning `driver_id`
5. **Idempotency:** The Redis lock stores the winning `driverId`. If a driver retries after a successful acceptance, the system recognizes the ownership and returns a consistent, idempotent success response.

## Configuration

The app uses the following local defaults:

- PostgreSQL host: localhost
- PostgreSQL port: 5433
- PostgreSQL user: **set in .env file**
- PostgreSQL password: **set in .env file**
- PostgreSQL database: **set in .env file**
- Valkey host: localhost
- Valkey port: 6379
- Valkey password: **set in .env file**

## Notes

- The project is intentionally simple and focused on demonstrating the core mechanics of geospatial matching and concurrency handling.
- The notification layer is currently simulated in the service logic for clarity and deterministic verification.

## License

This project is for demonstration and educational purposes.
