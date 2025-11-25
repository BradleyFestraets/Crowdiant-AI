# Crowdiant Restaurant OS

A cloud-native, multi-tenant SaaS platform for restaurant operations built on the T3 Stack (Next.js, TypeScript, tRPC, Prisma, NextAuth, Tailwind CSS).

## Prerequisites

Before you begin, ensure you have the following installed on your development machine:

- **Node.js 20.x LTS** (recommended: use [nvm](https://github.com/nvm-sh/nvm) or [nvm-windows](https://github.com/coreybutler/nvm-windows))
- **pnpm** (latest) - Fast, disk space efficient package manager
- **PostgreSQL 16** (or managed service like PlanetScale/Supabase)
- **Git** for version control

### Installing Prerequisites

#### Node.js
```bash
# Using nvm (recommended)
nvm install 20
nvm use 20

# Verify installation
node --version  # Should show v20.x.x
```

#### pnpm
```bash
# Install globally via npm
npm install -g pnpm

# Verify installation
pnpm --version
```

#### PostgreSQL
- **Local:** Download from [postgresql.org](https://www.postgresql.org/download/)
- **Docker:** `docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password postgres:16`
- **Managed:** [PlanetScale](https://planetscale.com/) or [Supabase](https://supabase.com/)

---

## Getting Started

Follow these steps to set up your local development environment:

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/crowdiant-os.git
cd crowdiant-os
```

### 2. Install Dependencies

```bash
pnpm install
```

This will install all required packages (~378 dependencies) and run Prisma code generation.

### 3. Configure Environment Variables

Copy the environment template and fill in your values:

```bash
cp .env.example .env
```

Open `.env` and update the following **required** variables:

```bash
# Database connection
DATABASE_URL="postgresql://postgres:password@localhost:5432/crowdiant_dev"

# Authentication secret (generate with: npx auth secret)
AUTH_SECRET="your-generated-secret-here"

# Discord OAuth (optional for dev, but required fields must have placeholder values)
AUTH_DISCORD_ID="placeholder"
AUTH_DISCORD_SECRET="placeholder"
```

**Generate a secure auth secret:**
```bash
npx auth secret
# OR
openssl rand -base64 32
```

### 4. Set Up the Database

#### Option A: Start Local PostgreSQL (using included script)
```bash
# On macOS/Linux
./start-database.sh

# On Windows (PowerShell)
# Use Docker or install PostgreSQL manually
```

#### Option B: Use PlanetScale (Recommended for MVP)
1. Create account at [planetscale.com](https://planetscale.com/)
2. Create database: `crowdiant-os-dev`
3. Copy connection string to `DATABASE_URL` in `.env`

### 5. Initialize the Database Schema

```bash
# Push Prisma schema to database (development)
pnpm db:push

# Or create and apply a migration (production-ready)
pnpm db:generate
```

### 6. Open Prisma Studio (Optional)

Verify database setup with Prisma's GUI:

```bash
pnpm db:studio
```

Opens at `http://localhost:5555`

### 7. Start the Development Server

```bash
pnpm dev
```

The application will start at:
- **App:** [http://localhost:3000](http://localhost:3000)
- **Health Check:** [http://localhost:3000/api/health](http://localhost:3000/api/health)
- **tRPC API:** [http://localhost:3000/api/trpc](http://localhost:3000/api/trpc)

---

## Development

### Available Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server with Turbo |
| `pnpm build` | Build production bundle |
| `pnpm start` | Start production server |
| `pnpm check` | Run ESLint and TypeScript checks |
| `pnpm format:write` | Format all files with Prettier |
| `pnpm format:check` | Check code formatting |
| `pnpm db:push` | Push Prisma schema to DB (dev only) |
| `pnpm db:generate` | Create and apply migrations |
| `pnpm db:studio` | Open Prisma Studio GUI |

### Project Structure

```
crowdiant-os/
├── prisma/               # Database schema and migrations
│   └── schema.prisma     # Prisma schema definition
├── public/               # Static assets (fonts, images)
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── api/          # API routes
│   │   │   ├── auth/     # NextAuth endpoints
│   │   │   ├── health/   # Health check endpoint
│   │   │   └── trpc/     # tRPC handler
│   │   ├── layout.tsx    # Root layout
│   │   └── page.tsx      # Home page
│   ├── server/           # Server-side code
│   │   ├── api/          # tRPC routers
│   │   │   ├── root.ts   # Root router
│   │   │   └── routers/  # Feature routers
│   │   ├── auth/         # NextAuth configuration
│   │   └── db.ts         # Prisma client singleton
│   ├── trpc/             # tRPC client setup
│   ├── styles/           # Global styles
│   └── env.js            # Environment variable validation
├── .env                  # Local environment (gitignored)
├── .env.example          # Environment template (committed)
├── next.config.js        # Next.js configuration
├── tailwind.config.ts    # Tailwind CSS configuration
├── tsconfig.json         # TypeScript configuration
└── package.json          # Dependencies and scripts
```

### Hot Reload

The development server supports hot module replacement (HMR). Edit any file in `src/` and see changes instantly without restarting the server.

---

## Architecture

### Tech Stack

- **Framework:** Next.js 15 with App Router
- **Language:** TypeScript (strict mode)
- **API:** tRPC 11 for end-to-end type safety
- **Database:** PostgreSQL 16 via Prisma ORM
- **Auth:** NextAuth.js 5
- **Styling:** Tailwind CSS 4
- **Linting:** ESLint + Prettier

### Key Design Patterns

- **Multi-Tenant Architecture:** All data scoped by `venueId`
- **Type-Safe APIs:** tRPC eliminates API contract bugs
- **Server Components:** Leverage Next.js App Router for performance
- **Modular Monolith:** Clear boundaries for future microservice extraction

---

## Troubleshooting

### Common Issues

#### Port 3000 Already in Use

```bash
# Find and kill the process using port 3000

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3000 | xargs kill -9
```

#### pnpm Not Found After Installation

```bash
# Refresh your PATH or restart terminal

# Windows PowerShell
refreshenv

# Or add to PATH manually:
$env:Path += ";C:\\Users\\<YourUser>\\AppData\\Roaming\\npm"
```

#### Node Version Mismatch

```bash
# Use Node.js 20.x LTS
nvm use 20

# Or install it
nvm install 20
nvm use 20
```

#### Database Connection Errors

- Verify PostgreSQL is running: `pg_isready`
- Check DATABASE_URL format in `.env`
- Ensure database `crowdiant_dev` exists
- Test connection: `pnpm db:push` should succeed

#### AUTH_SECRET Missing

If you see environment validation errors:

```bash
# Generate a new secret
npx auth secret

# Or with OpenSSL
openssl rand -base64 32

# Add to .env
AUTH_SECRET="<paste-generated-secret>"
```

#### Prisma Client Not Generated

```bash
# Regenerate Prisma Client
npx prisma generate

# Or reinstall dependencies
rm -rf node_modules generated
pnpm install
```

---

## Additional Resources

- **T3 Stack Documentation:** [create.t3.gg](https://create.t3.gg/)
- **Next.js 15 Docs:** [nextjs.org/docs](https://nextjs.org/docs)
- **tRPC Docs:** [trpc.io](https://trpc.io/)
- **Prisma Docs:** [prisma.io/docs](https://www.prisma.io/docs)
- **NextAuth.js Docs:** [next-auth.js.org](https://next-auth.js.org/)
- **Tailwind CSS:** [tailwindcss.com](https://tailwindcss.com/)

---

## License

MIT License - See LICENSE file for details

---

## Contributing

This is a private repository. For questions or issues, contact the development team.

---

**Built with the T3 Stack** 💙
