# pephamine-api

Express.js REST API server for the Pephamine platform. Built with TypeScript, Drizzle ORM, and PostgreSQL.

## Features

- **Authentication**: JWT-based auth with httpOnly cookies
- **Core Resources**: Peptides, Protocols, Research Bonds, Data Listings
- **Input Validation**: Zod schemas for all endpoints
- **Error Handling**: Consistent error responses
- **Database**: PostgreSQL with Drizzle ORM
- **Logging**: Structured logging without console.log

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

1. **Clone the repository and install dependencies**

```bash
cd pephamine-api
npm install
```

2. **Set up environment variables**

```bash
cp .env.example .env
```

Edit `.env` with your PostgreSQL connection and JWT settings:

```bash
DATABASE_URL=postgresql://username:password@localhost:5432/pephamine
JWT_SECRET=your_super_secret_key_min_32_chars_recommended
JWT_EXPIRY=7d
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

3. **Set up PostgreSQL database**

```bash
# Option A: Using Docker (recommended for dev)
docker-compose up -d

# Option B: Using local PostgreSQL
createdb pephamine
```

Database will be ready at `postgresql://pephamine:pephamine_dev_password@localhost:5432/pephamine`

4. **Generate and run database migrations**

```bash
npm run db:generate
npm run db:migrate
```

5. **Start development server**

```bash
npm run dev
```

The API will be available at `http://localhost:3000`

### Verify Installation

```bash
# Check health endpoint
curl http://localhost:3000/health

# Should return:
# {"status":"ok","timestamp":"2026-05-05T10:00:00.000Z"}
```

## Project Structure

```
src/
├── index.ts                # Express app setup and route registration
├── db/
│   ├── schema.ts          # Drizzle ORM schema definitions
│   └── index.ts           # Database connection
├── routes/
│   ├── auth.ts            # Authentication endpoints
│   ├── peptides.ts        # Peptide management
│   ├── protocols.ts       # Protocol management
│   ├── researchBonds.ts   # Research collaboration
│   └── dataListings.ts    # Data marketplace
├── utils/
│   ├── logger.ts          # Singleton logger
│   ├── auth.ts            # JWT utilities
│   └── errors.ts          # Error handling
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user (requires auth)

### Peptides

- `GET /api/peptides` - List peptides
- `GET /api/peptides/:id` - Get peptide
- `POST /api/peptides` - Create peptide (requires auth)
- `PATCH /api/peptides/:id` - Update peptide (requires auth + ownership)
- `DELETE /api/peptides/:id` - Delete peptide (requires auth + ownership)

### Protocols

- `GET /api/protocols` - List protocols
- `POST /api/protocols` - Create protocol (requires auth)
- `GET /api/protocols/:id` - Get protocol
- `PATCH /api/protocols/:id` - Update protocol (requires auth)
- `DELETE /api/protocols/:id` - Delete protocol (requires auth)

### Research Bonds

- `GET /api/research-bonds` - List user's bonds (requires auth)
- `POST /api/research-bonds` - Create bond (requires auth)
- `GET /api/research-bonds/:id` - Get bond (requires auth)
- `PATCH /api/research-bonds/:id` - Update bond status (requires auth)

### Data Listings

- `GET /api/data-listings` - List listings
- `POST /api/data-listings` - Create listing (requires auth)
- `GET /api/data-listings/:id` - Get listing
- `PATCH /api/data-listings/:id` - Update listing (requires auth + ownership)
- `DELETE /api/data-listings/:id` - Delete listing (requires auth + ownership)

## Development

### Build

```bash
npm run build
```

### Type checking

```bash
npm run type-check
```

### Lint

```bash
npm run lint
```

### Database studio (Drizzle kit UI)

```bash
npm run db:studio
```

### Running tests (when added)

```bash
npm test
```

## Standards & Best Practices

### 1. Logging

**Never use `console.log`** — use structured logging instead.

In **route handlers**, use `req.log`:

```typescript
router.post('/', asyncHandler(async (req, res) => {
  req.log.info('User action', { userId: req.user.id, action: 'signup' });
  req.log.warn('Invalid attempt', { reason: 'duplicate_email' });
  req.log.error('Database error', error, { userId: req.user.id });
}));
```

**Elsewhere** (utilities, services), import the logger singleton:

```typescript
import { logger } from '@/utils/logger';

logger.info('Server started', { port: 3000 });
logger.error('Critical failure', err);
```

### 2. Input/Output Validation

All routes must validate inputs and outputs with Zod schemas. Validation happens automatically before business logic:

```typescript
import { z } from 'zod';

const CreateUserSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 chars'),
  firstName: z.string().optional(),
});

router.post('/', asyncHandler(async (req, res) => {
  // This throws automatically if validation fails
  const body = CreateUserSchema.parse(req.body);
  
  // body is now properly typed
  res.json({ user: { email: body.email } });
}));
```

### 3. Authentication

Use the `verifyJwt` middleware to protect routes. JWT tokens are stored in **httpOnly cookies** for security:

```typescript
router.get('/protected',
  verifyJwt,  // Middleware checks JWT and attaches req.user
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;  // Type-safe
    res.json({ user: userId });
  })
);
```

**JWT utilities:**

```typescript
import { 
  generateToken, 
  setAuthCookie, 
  clearAuthCookie,
  verifyJwt 
} from '@/utils/auth';

// Generate and set token
const token = generateToken({
  userId: user.id,
  email: user.email,
  role: user.role,
});
setAuthCookie(res, token);

// Clear on logout
clearAuthCookie(res);
```

### 4. Error Handling

Wrap async handlers with `asyncHandler` — errors are automatically caught:

```typescript
import { asyncHandler, ApiError } from '@/utils/errors';

router.post('/',
  asyncHandler(async (req, res) => {
    const user = await db.query.users.findFirst(...);
    
    if (!user) {
      // Throws automatically to error handler
      throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
    }
    
    // Any async error is caught and formatted
    res.json({ user });
  })
);
```

**Error Types:**
- `ApiError(statusCode, message, code)` — Custom API errors
- `ZodError` — Validation errors (caught automatically)
- Unknown errors → 500 Internal Server Error

**Error Response Format:**

```json
{
  "error": "User not found",
  "code": "USER_NOT_FOUND"
}
```

Validation errors:

```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "path": "email",
      "message": "Invalid email",
      "code": "invalid_string"
    }
  ]
}
```

### 5. Database Queries

Use Drizzle ORM with proper type safety:

```typescript
import { eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { users, peptides } from '@/db/schema';

// Select
const [user] = await db
  .select()
  .from(users)
  .where(eq(users.id, userId))
  .limit(1);

// Insert
const [newUser] = await db
  .insert(users)
  .values({ email: 'test@example.com' })
  .returning();

// Update
await db
  .update(users)
  .set({ firstName: 'John' })
  .where(eq(users.id, userId));

// Delete
await db
  .delete(users)
  .where(eq(users.id, userId));

// Complex queries
const results = await db
  .select()
  .from(peptides)
  .where(
    sql`${peptides.isPublic} = true OR ${peptides.userId} = ${userId}`
  );
```

### 6. Route Structure

Each feature gets its own file in `src/routes/`:

```
src/routes/
├── auth.ts               # Auth endpoints
├── peptides.ts          # Peptide CRUD
├── protocols.ts         # Protocol CRUD
├── researchBonds.ts     # Collaboration
└── dataListings.ts      # Marketplace
```

Register in `src/index.ts`:

```typescript
app.use('/api/auth', authRoutes);
app.use('/api/peptides', peptidesRoutes);
// ...
```

### 7. Request/Response Pattern

Standard pattern for all endpoints:

```typescript
// Validation
const body = SchemaName.parse(req.body);

// Authorization (if needed)
if (resource.userId !== req.user!.userId) {
  throw new ApiError(403, 'Access denied', 'ACCESS_DENIED');
}

// Database operation
const result = await db.query...;

// Logging
req.log.info('Action completed', { resource: result.id });

// Response
res.status(statusCode).json({ data: result });
```

## Troubleshooting

### "Cannot find module" errors

Run `npm install` to ensure all dependencies are installed.

### Database connection fails

- Verify `DATABASE_URL` in `.env`
- Ensure PostgreSQL is running: `psql -U postgres`
- Check credentials and database exists: `\l` in psql

### PORT already in use

Change `PORT` in `.env` or kill existing process:

```bash
# Find process on port 3000
lsof -i :3000

# Kill it
kill -9 <PID>
```

### JWT token validation fails

- Check `JWT_SECRET` matches between `.env` and production
- Ensure cookie was set with `setAuthCookie()`
- Cookie must be httpOnly for security

## License

MIT
