# E-Vote Commission: Comprehensive Verification & QA Checklist

This manual and automated test guide verifies all functional, security, procedural, and database integrity requirements of the **E-Vote Commission** web application.

---

## 1. Automated Test Suite Execution

Run the automated test suite against a running instance:

```bash
# Ensure containers and Next.js server are active
docker compose up -d
npm run init:mongo
npm run seed:users
npm run dev

# In another terminal window:
npm test
```

---

## 2. Verification Checklist & Manual Test Cases

| Test ID | Test Scenario | Steps to Reproduce | Expected Result | Pass / Fail |
| :--- | :--- | :--- | :--- | :---: |
| **AUTH-01** | **Voter 1 Login** | 1. Navigate to `/login`<br>2. Click &quot;Voter 1&quot; demo button (`v1@evote.test` / `Voter@123`)<br>3. Submit form | HTTP 200; `token` cookie set; redirected to `/voter` dashboard | [x] PASS |
| **AUTH-02** | **Unauthenticated Route Rejection** | 1. Clear browser cookies<br>2. Direct GET request to `/api/voter/dashboard` | HTTP 401 `{ error: "Not authenticated" }` | [x] PASS |
| **AUTH-03** | **Role Authorization Gate** | 1. Sign in as voter (`v1@evote.test`)<br>2. Attempt GET `/api/audit-logs` or visit `/admin` | HTTP 403 `{ error: "Forbidden" }` on API; middleware redirects to `/voter` | [x] PASS |
| **AUTH-04** | **Underage Voter Trigger Gate** | 1. Navigate to `/register`<br>2. Enter birth date `2015-01-01` (under 18)<br>3. Submit registration | HTTP 400 from PostgreSQL trigger `trg_voter_age`; transaction rolled back; error banner displayed | [x] PASS |
| **VOTE-01** | **Authorized Ballot Cast** | 1. Sign in as Voter 1 (`v1@evote.test`)<br>2. Go to `/voter/vote`<br>3. Select Booth 1 and Candidate 1<br>4. Click &quot;Cast Vote&quot; and confirm dialog | HTTP 200 `{ message: "Vote cast successfully" }`; redirect to dashboard with &quot;Voted&quot; badge | [x] PASS |
| **VOTE-02** | **Double Voting Prevention** | 1. As Voter 1 (already voted in VOTE-01), attempt to call `POST /api/vote` again with identical or different candidate | HTTP 409 `{ error: "already voted" }`; atomic lock blocks second vote; audit entry logged | [x] PASS |
| **VOTE-03** | **Cross-Constituency Candidate Block** | 1. Sign in as Voter 2 (`v2@evote.test`, Bengaluru South)<br>2. Attempt to cast ballot for Candidate 3 (Mysuru constituency) | HTTP 409 `{ error: "invalid candidate for this voter" }` | [x] PASS |
| **VOTE-04** | **Election Window & Status Enforcement** | 1. Sign in as Admin (`admin@evote.test`)<br>2. Edit election status to `CLOSED`<br>3. As Voter 2, attempt to cast vote | HTTP 409 `{ error: "election not open" }`; database trigger `trg_vote_window` prevents ballot insertion | [x] PASS |
| **VOTE-05** | **Ballot Anonymity Preservation** | 1. Inspect table `vote`<br>2. Inspect table `voter_status`<br>3. Inspect MongoDB `audit_logs` | Table `vote` has NO `voter_id`; `voter_status` has NO `candidate_id`; audit logs NEVER include candidate choices | [x] PASS |
| **GRIEV-01** | **Grievance Filing & Vector Embed** | 1. Sign in as Voter (`v1@evote.test`)<br>2. Go to `/voter/grievance`<br>3. Submit category `technical` and text describing an EVM malfunction | Grievance stored in MongoDB; 384-dim vector stored in `grievance_embedding`; status &quot;Indexed&quot; | [x] PASS |
| **GRIEV-02** | **Officer Grievance Status Triage** | 1. Sign in as Officer (`officer@evote.test`)<br>2. Go to `/officer`<br>3. On Grievances tab, switch status to `in_progress` | HTTP 200 PATCH request; Mongo document updated; audit log `GRIEVANCE_UPDATED` created | [x] PASS |
| **SEARCH-01** | **pgvector Semantic Search Relevance** | 1. In Officer Console, open &quot;AI Semantic Search&quot;<br>2. Search query: &quot;voting machine error broken screen&quot; | Returns complaints matching machine/technical faults with high cosine similarity percentage (&gt;65%) | [x] PASS |
| **ANLYT-01** | **Summary KPI & Integrity Parity** | 1. Sign in as Admin (`admin@evote.test`)<br>2. Open `/admin`<br>3. Compare `totalVotes` vs `votedCount` | `totalVotes === votedCount` verified across database tables | [x] PASS |
| **ANLYT-02** | **Booth Turnout Warning Highlight** | 1. Open `/admin/analytics`<br>2. Inspect Chart B (Polling Booth Turnout) | Booths with turnout under 50% are automatically styled with red bars | [x] PASS |
| **ANLYT-03** | **Official Stored Procedure Refresh** | 1. In `/admin/analytics`, click &quot;Refresh Official Results&quot; | Procedure `CALL refresh_results(election_id)` runs; official tally displayed from `result_summary` | [x] PASS |
| **RSLT-01** | **Public Live Results Auto-Refresh** | 1. Open `/results` in a public/incognito window<br>2. Wait 10 seconds | Background interval refreshes live tally without full page reload; unmounts cleanly | [x] PASS |
| **AUDIT-01** | **Dual Audit Log Inspection** | 1. Open `/admin/audit-logs`<br>2. Toggle between PostgreSQL and MongoDB | Renders latest 200 database logs and application events with timestamp and user email | [x] PASS |

