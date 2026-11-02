# E-Vote Commission

**E-Vote Commission** is an enterprise-grade, secure election management and voter analytics platform designed for democratic integrity, complete ballot anonymity, real-time cryptographic auditability, and AI-powered grievance intelligence.

Built strictly on an existing PostgreSQL relational schema (with `pgvector`) and MongoDB document store, the application guarantees end-to-end anonymity by structurally separating voter identities from ballots, enforced at both the application and database trigger levels.

---

## 🏛️ System Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT BROWSERS                                   |
|   Voters (/voter)   |   Officers (/officer)   |   Admins (/admin)   |   Public    |
+-----------------------------------------------------------------------------------+
                                         │  (HTTPS / Cookie-based JWT)
                                         ▼
+-----------------------------------------------------------------------------------+
|                        NEXT.JS 15 APP ROUTER & MIDDLEWARE                         |
|   Edge Middleware (jose)  &  Node.js 20.6+ Route Handlers (/api/...)               |
|   - Lazy Environment Validation                                                   |
|   - Anonymity Enforcement (No Voter-Candidate Linkage)                            |
|   - Local Transformer Embeddings (Xenova/all-MiniLM-L6-v2)                        |
+----------------------------------------┬------------------------------------------+
                    ┌────────────────────┴────────────────────┐
                    ▼                                         ▼
+---------------------------------------+ +---------------------------------------+
|          POSTGRESQL + PGVECTOR        | |                MONGODB 7              |
| - Relational integrity (users, voter) | | - Flexible complaints (grievances)    |
| - Anonymous ballots (vote table)      | | - Application audit trail (audit_logs)|
| - Stored procedures (cast_vote, etc.) | | - Multi-stage Aggregations            |
| - Safety triggers (age, immutability) | | - Text search indexes                 |
| - Cosine vector search (384-dim HNSW) | |                                       |
+---------------------------------------+ +---------------------------------------+
```

---

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router, Node.js runtime for API handlers, Edge runtime for Middleware)
- **Language**: JavaScript (ESM + CommonJS CLI scripts)
- **Styling**: Tailwind CSS
- **Primary Relational DB**: PostgreSQL 16 with `pgvector` (via native `pg` driver, zero ORMs)
- **Document / Log DB**: MongoDB 7 (via official `mongodb` driver)
- **Authentication**: JWT via `jose` (HS256, HTTP-only secure cookies) & `bcryptjs`
- **Validation**: Zod (v3/v4 compatible `z.object` / `safeParse`)
- **Machine Learning**: `@xenova/transformers` (local `all-MiniLM-L6-v2` 384-dim feature extraction pipeline)
- **Data Visualization**: Recharts

---

## 🚀 Getting Started & Setup

### Prerequisites
- Node.js `20.6+` (for native `--env-file` support)
- Docker & Docker Compose
- Internet connection for the initial model download (`Xenova/all-MiniLM-L6-v2` is downloaded automatically on the first vector embedding call and cached locally).

### Setup Steps in Order

1. **Clone the repository and copy environment variables:**
   ```bash
   cp .env.example .env
   ```

2. **Start the database containers:**
   ```bash
   docker compose up -d
   ```
   > **Note on Database Initialization:** `schema.sql` is automatically mounted into `/docker-entrypoint-initdb.d/01-schema.sql` and only runs on an **empty** volume. If you need to re-initialize or reset the database cleanly, run:
   > ```bash
   > docker compose down -v
   > docker compose up -d
   > ```

3. **Install application dependencies:**
   ```bash
   npm install
   ```

4. **Initialize MongoDB collections and compound indexes:**
   ```bash
   npm run init:mongo
   ```

5. **Seed user password hashes:**
   Updates the placeholder hashes in PostgreSQL with valid bcrypt hashes:
   ```bash
   npm run seed:users
   ```

6. **(Optional) Seed sample citizen grievances and vector embeddings:**
   ```bash
   npm run seed:grievances
   ```

7. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Demo Credentials

| Role | Email | Password | Assigned Constituency | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | `admin@evote.test` | `Admin@123` | N/A | Full election governance, CRUD, analytics & audit oversight |
| **Officer** | `officer@evote.test` | `Officer@123` | All | Voter list verification, complaint triage, semantic search |
| **Voter 1** | `v1@evote.test` | `Voter@123` | Bengaluru South | Registered eligible citizen voter |
| **Voter 2** | `v2@evote.test` | `Voter@123` | Bengaluru South | Registered eligible citizen voter |

---

## 🧪 Testing

### Automated Test Suite
Ensure the server is running on `http://localhost:3000` (or set `TEST_BASE_URL`):
```bash
npm test
```
The test suite validates:
1. Voter login and session issuance
2. Unauthenticated route rejection (401)
3. Role authorization enforcement (403 on voter trying to read audit logs)
4. Underage voter registration rejection by trigger `trg_voter_age` (400)
5. Valid ballot submission via `cast_vote` (200)
6. Double voting prevention (409)
7. Cross-constituency voting prevention (409)
8. Mathematical ballot tally parity (`totalVotes === votedCount`)
9. Closed election voting window enforcement (409)

### Manual QA Checklist
Refer to [`tests/TESTING.md`](tests/TESTING.md) for the complete scenario-by-scenario verification matrix.

---

## 📂 Project Structure

```
election_commite/
├── app/
│   ├── admin/               # Admin dashboard, elections, candidates, booths, analytics, audit-logs
│   ├── api/                 # Node.js route handlers
│   │   ├── analytics/       # Summary, booth turnout, winners, grievances, audit actions, refresh
│   │   ├── auth/            # Register, login, logout, me
│   │   ├── booths/          # Booth listing and CRUD
│   │   ├── candidates/      # Candidate listing, search, and CRUD
│   │   ├── constituencies/  # Constituency list
│   │   ├── elections/       # Election listing, creation, and lifecycle transitions
│   │   ├── grievances/      # Citizen complaints and status updates
│   │   ├── results/         # Public live returns
│   │   ├── search/          # Semantic vector similarity search
│   │   ├── vote/            # Atomic ballot casting
│   │   └── voters/          # Electorate verification list
│   ├── login/               # Sign-in portal with quick-fill demo buttons
│   ├── officer/             # Officer console (Voters roster, Grievances, Semantic Search)
│   ├── register/            # Voter registration form with trigger validation
│   ├── results/             # Auto-refreshing public tally board
│   ├── voter/               # Voter dashboard, ballot casting, and grievance filing
│   ├── globals.css          # Tailwind CSS styling
│   ├── layout.js            # Offline-safe root layout
│   └── page.js              # Role-aware root redirector
├── components/              # Reusable UI primitives (Navbar, Banner, KPI, DataTable, ConfirmDialog, etc.)
├── lib/
│   ├── api.js               # Client fetch wrapper
│   ├── audit.js             # Mongo audit logging helper
│   ├── auth.js              # Jose JWT sign/verify, cookies, withAuth wrapper
│   ├── db-mongo.js          # Cached MongoClient singleton
│   ├── db-postgres.js       # Cached pg.Pool singleton with type parsers & transaction helper
│   ├── embeddings.js        # HuggingFace Xenova/all-MiniLM-L6-v2 vector extractor
│   ├── errors.js            # Centralized Postgres, Zod, and trigger error mapper
│   └── validators.js        # Zod validation schemas
├── scripts/                 # Standalone CommonJS setup scripts
│   ├── init-mongo.js        # Compound & text indexes
│   ├── seed-users.js        # Bcrypt password hashing
│   └── seed-grievances.js   # Sample grievances & vector embeddings
├── sql/
│   └── schema.sql           # Canonical PostgreSQL schema
├── tests/
│   ├── api.test.mjs         # Native node:test suite
│   └── TESTING.md           # QA manual verification guide
├── docker-compose.yml       # PostgreSQL (pgvector) and MongoDB services
├── middleware.js            # Edge route protection & role redirection
├── next.config.mjs          # Server external packages configuration
└── README.md
```

---

## 🗄️ Database Design Summary

### PostgreSQL Tables & Structures
- `users`: Core authentication table (`email`, `password_hash`, `role`).
- `constituency`: Electoral districts (`name`, `state`).
- `election`: Election events with timeframe validation (`chk_election_dates`).
- `party`: Political parties and approved symbols.
- `voter`: Registered electors with date of birth and phone number constraint.
- `candidate`: Contestants uniquely keyed by `(election_id, constituency_id, party_id)`.
- `polling_booth`: Physical polling stations with assigned voter capacities.
- `voter_status`: Tracks **who** voted per election (`has_voted`, `booth_id`, `voted_at`). Completely separated from the ballot choices.
- `vote`: Stores **what** was voted (`election_id`, `candidate_id`, `booth_id`, `cast_time`). Contains **no** `voter_id` link.
- `result_summary`: Official certified totals refreshed by stored procedure.
- `audit_log`: Database-level event log.
- `grievance_embedding`: Vector table storing 384-dimensional cosine embeddings with HNSW index (`idx_grievance_hnsw`).

### Database Views
- `v_live_results`: Real-time vote counts grouped by election, constituency, and candidate.
- `v_booth_turnout`: Turnout percentage per polling booth (`ROUND(100.0 * votes / capacity, 2)`).
- `v_constituency_winner`: Window function `RANK()` and `LEAD()` calculating constituency winners and victory margins over the runner-up.

### MongoDB Collections
- `grievances`: Citizen complaints with category, text, status (`open`, `in_progress`, `resolved`), and vector indexing flag.
- `audit_logs`: Application-level event trail recording action, IP address, user ID, details, and timestamp.

---

## 🌟 Advanced Features Implemented

1. **Strict Ballot Anonymity**:
   Neither database schemas nor API route handlers ever link a voter's identity to their candidate choice. The `vote` table records candidate selections without voter identifiers, while `voter_status` flags voting completion without candidate references.
2. **Atomic Ballot Casting (`cast_vote`)**:
   Stored PostgreSQL function executes ballot submission in an isolated transaction. Uses `FOR UPDATE` row locking to prevent race conditions or concurrent double-voting attempts.
3. **Trigger-Enforced Guardrails**:
   - `trg_voter_age`: Rejects voter registration if age is under 18 years.
   - `trg_block_double_vote`: Prohibits altering `has_voted = TRUE` back to false.
   - `trg_vote_window`: Rejects vote insertion outside the active election timeframe or if status is not `ONGOING`.
   - `trg_vote_immutable`: Blocks any `UPDATE` or `DELETE` operations on cast ballots.
4. **AI-Powered Vector Similarity Search**:
   Grievance complaints are embedded using `Xenova/all-MiniLM-L6-v2` into 384-dimensional dense vectors and queried using pgvector cosine distance (`1 - (embedding <=> query::vector)`). Results are matched back to MongoDB documents preserving relevance rank.
5. **Full-Text Search (FTS)**:
   Candidate searches utilize PostgreSQL GIN indexes and `to_tsvector('simple', name) @@ plainto_tsquery('simple', query)`.
6. **MongoDB Multi-Stage Aggregation Pipelines**:
   Real-time aggregation pipelines calculate grievance distributions grouped by category and constituency, as well as day-by-day security audit frequency.
7. **Stored Procedure Certified Tally**:
   Admin command executes `CALL refresh_results(p_election_id)` to re-populate the official certification table `result_summary`.

---

## 📝 Design Decisions & Assumptions

- **Constituency Scope**: Candidate and booth selections for voters are strictly scoped to the constituency assigned to their profile.
- **Forward-Only Election Status**: Elections progress forward along `UPCOMING -> ONGOING -> CLOSED`. Closed elections cannot be edited or reopened.
- **Number Type Parsing**: PostgreSQL `bigint` (type 20) and `numeric` (type 1700) are parsed natively as JavaScript numbers to prevent serialization as strings in charts.
- **Offline / Isolated Layout**: Root fonts utilize system font stacks (`system-ui, -apple-system, sans-serif`) to ensure production builds run cleanly without external Google Fonts CDN dependencies.

---

## 👥 Team Contributions

| Team Member | Contributions |
| :--- | :--- |
| *(Name)* | |
| *(Name)* | |
