# NEO MLM — Production-Grade MLM Backend

A production-ready MLM (Multi-Level Marketing) backend application with binary tree network structure, built with Node.js, Express, and MongoDB.

## Features

- **JWT Authentication** — Register, login, token validation
- **Binary Tree Network** — Left/right placement, downline tree, level calculation
- **Admin Panel** — User management, block/unblock, network statistics
- **Repository Pattern** — Clean separation of data access layer
- **Request Validation** — Joi schema validation on all endpoints
- **Rate Limiting** — Express rate limiter with configurable window
- **Security** — Helmet, CORS, bcrypt password hashing
- **Structured Logging** — Pino logger with pretty-print in dev
- **Centralized Error Handling** — Custom ApiError class with global handler
- **Test Suite** — Jest unit tests + Supertest integration tests

## Tech Stack

| Technology | Purpose |
|---|---|
| Node.js | Runtime |
| Express | HTTP framework |
| MongoDB + Mongoose | Database |
| JWT | Authentication |
| Joi | Validation |
| Pino | Logging |
| Jest + Supertest | Testing |
| ESLint + Prettier | Code quality |

## Project Structure

```
mlm-app/
├── src/
│   ├── modules/
│   │   ├── auth/          # Register, login, JWT
│   │   ├── user/          # Profile, user lookup
│   │   ├── network/       # Binary tree, downline, stats
│   │   └── admin/         # User management, network stats
│   ├── models/            # Mongoose schemas (User, Network)
│   ├── middlewares/        # Auth, authorize, error handler, rate limiter, validate
│   ├── config/            # DB, env, logger
│   └── utils/             # ApiError, ApiResponse, catchAsync, helpers
├── tests/
│   ├── unit/              # Service layer unit tests
│   ├── integration/       # API integration tests
│   └── fixtures/          # Mock data
├── app.js                 # Express app setup
├── server.js              # Server entry point
└── package.json
```

## Setup Instructions

### Prerequisites
- Node.js >= 18.0.0
- MongoDB (local or Atlas)

### Installation

```bash
# Clone and navigate to project
cd mlm-app

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
# MONGO_URI=mongodb://localhost:27017/neo_mlm
# JWT_SECRET=your_secure_random_string
```

### Running

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

### Testing

```bash
# Run all tests with coverage
npm test

# Unit tests only
npm run test:unit

# Integration tests only (requires test MongoDB)
npm run test:integration
```

## API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |

### User (🔒 Auth Required)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/users/me` | Get own profile |
| PATCH | `/api/users/me` | Update own profile |
| GET | `/api/users/list` | List users (paginated) |
| GET | `/api/users/:userId` | Get user by userId |

### Network (🔒 Auth Required)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/network/place` | Place user in binary tree (Admin) |
| GET | `/api/network/downline/:userId` | Get downline tree |
| GET | `/api/network/stats/:userId` | Get user network stats |
| GET | `/api/network/stats` | Get overall stats (Admin) |

### Admin (🔒 Admin Only)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/users` | List all users (paginated, searchable) |
| PATCH | `/api/admin/users/:id/block` | Block a user |
| PATCH | `/api/admin/users/:id/unblock` | Unblock a user |
| GET | `/api/admin/network/stats` | Get network statistics |

### Health
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health check |

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment | `development` |
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/neo_mlm` |
| `JWT_SECRET` | JWT signing secret | — |
| `JWT_EXPIRES_IN` | JWT expiration | `7d` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `900000` (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |

## Architecture Principles

- **SOLID Principles** — Single responsibility across modules
- **Service Layer Pattern** — Controllers are thin; business logic lives in services
- **Repository Pattern** — Data access abstracted behind repositories
- **Centralized Error Handling** — Custom `ApiError` + global handler
- **Consistent Response Format** — `ApiResponse` wrapper for all endpoints
- **No Business Logic in Controllers** — Controllers only parse request and send response
