-- =====================================================================
-- E-Vote Commission: Secure Election Management with Grievance Analytics
-- PostgreSQL schema  (run: psql "$PG_URL" -f schema.sql)
-- Sections: 1 Tables | 2 Indexes | 3 Triggers | 4 Procedures
--           5 Views  | 6 pgvector | 7 DDL demo | 8 Seed | 9 Demo queries | 10 Tests
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS vector;   -- pgvector (optional, section 6)

-- ---------------------------------------------------------------------
-- 1. TABLES (DDL: CREATE, PK, FK, constraints)
-- ---------------------------------------------------------------------
CREATE TABLE users (
    user_id        SERIAL PRIMARY KEY,
    email          VARCHAR(120) NOT NULL UNIQUE,
    password_hash  TEXT         NOT NULL,                -- bcrypt hash, never plain text
    role           VARCHAR(10)  NOT NULL
                   CHECK (role IN ('admin','officer','voter')),
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE constituency (
    constituency_id SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE,
    state           VARCHAR(60)  NOT NULL
);

CREATE TABLE election (
    election_id SERIAL PRIMARY KEY,
    title       VARCHAR(150) NOT NULL,
    start_date  TIMESTAMPTZ  NOT NULL,
    end_date    TIMESTAMPTZ  NOT NULL,
    status      VARCHAR(10)  NOT NULL DEFAULT 'UPCOMING'
                CHECK (status IN ('UPCOMING','ONGOING','CLOSED')),
    CONSTRAINT chk_election_dates CHECK (end_date > start_date)
);

CREATE TABLE party (
    party_id SERIAL PRIMARY KEY,
    name     VARCHAR(100) NOT NULL UNIQUE,
    symbol   VARCHAR(60)  NOT NULL
);

CREATE TABLE voter (
    voter_id        SERIAL PRIMARY KEY,
    user_id         INT  NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    dob             DATE NOT NULL,                        -- age >= 18 enforced by trigger
    constituency_id INT  NOT NULL REFERENCES constituency(constituency_id)
);

CREATE TABLE candidate (
    candidate_id    SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    party_id        INT NOT NULL REFERENCES party(party_id),
    constituency_id INT NOT NULL REFERENCES constituency(constituency_id),
    election_id     INT NOT NULL REFERENCES election(election_id) ON DELETE CASCADE,
    CONSTRAINT uq_candidate UNIQUE (election_id, constituency_id, party_id)
);

CREATE TABLE polling_booth (
    booth_id        SERIAL PRIMARY KEY,
    constituency_id INT NOT NULL REFERENCES constituency(constituency_id),
    location        VARCHAR(200) NOT NULL,
    capacity        INT NOT NULL CHECK (capacity > 0)     -- registered voters assigned
);

-- WHO voted (identity) - kept separate from WHAT was voted, to keep ballots secret
CREATE TABLE voter_status (
    voter_id    INT NOT NULL REFERENCES voter(voter_id),
    election_id INT NOT NULL REFERENCES election(election_id),
    has_voted   BOOLEAN NOT NULL DEFAULT FALSE,
    booth_id    INT REFERENCES polling_booth(booth_id),
    voted_at    DATE,                                     -- date only, not exact time
    PRIMARY KEY (voter_id, election_id)
);

-- WHAT was voted (no voter_id => anonymous ballot)
CREATE TABLE vote (
    vote_id      BIGSERIAL PRIMARY KEY,
    election_id  INT NOT NULL REFERENCES election(election_id),
    candidate_id INT NOT NULL REFERENCES candidate(candidate_id),
    booth_id     INT NOT NULL REFERENCES polling_booth(booth_id),
    cast_time    TIMESTAMPTZ NOT NULL                     -- truncated to the hour
);

CREATE TABLE result_summary (
    election_id  INT NOT NULL REFERENCES election(election_id),
    candidate_id INT NOT NULL REFERENCES candidate(candidate_id),
    total_votes  INT NOT NULL CHECK (total_votes >= 0),
    PRIMARY KEY (election_id, candidate_id)
);

CREATE TABLE audit_log (
    log_id     BIGSERIAL PRIMARY KEY,
    user_id    INT REFERENCES users(user_id) ON DELETE SET NULL,
    action     VARCHAR(60) NOT NULL,
    details    JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 2. INDEXES
-- ---------------------------------------------------------------------
CREATE INDEX idx_vote_election_candidate ON vote (election_id, candidate_id);
CREATE INDEX idx_vote_booth              ON vote (booth_id);
CREATE INDEX idx_voter_constituency      ON voter (constituency_id);
CREATE INDEX idx_candidate_election      ON candidate (election_id, constituency_id);
-- Full-text search on candidate / party names
CREATE INDEX idx_candidate_fts ON candidate USING GIN (to_tsvector('simple', name));
CREATE INDEX idx_party_fts     ON party     USING GIN (to_tsvector('simple', name));

-- ---------------------------------------------------------------------
-- 3. TRIGGERS
-- ---------------------------------------------------------------------

-- 3a. Voter must be 18+
CREATE OR REPLACE FUNCTION fn_check_voter_age() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.dob > (CURRENT_DATE - INTERVAL '18 years') THEN
        RAISE EXCEPTION 'Voter must be at least 18 years old (dob=%)', NEW.dob;
    END IF;
    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_voter_age
BEFORE INSERT OR UPDATE OF dob ON voter
FOR EACH ROW EXECUTE FUNCTION fn_check_voter_age();

-- 3b. Hard stop on double voting / un-voting (safety net behind cast_vote)
CREATE OR REPLACE FUNCTION fn_block_double_vote() RETURNS TRIGGER AS $$
BEGIN
    IF OLD.has_voted = TRUE THEN
        RAISE EXCEPTION 'Double vote blocked: voter % already voted in election %',
                        OLD.voter_id, OLD.election_id;
    END IF;
    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_block_double_vote
BEFORE UPDATE ON voter_status
FOR EACH ROW EXECUTE FUNCTION fn_block_double_vote();

-- 3c. Votes only inside the election window and only while ONGOING
CREATE OR REPLACE FUNCTION fn_check_election_window() RETURNS TRIGGER AS $$
DECLARE e election%ROWTYPE;
BEGIN
    SELECT * INTO e FROM election WHERE election_id = NEW.election_id;
    IF now() < e.start_date OR now() > e.end_date OR e.status <> 'ONGOING' THEN
        RAISE EXCEPTION 'Election % is not open for voting', NEW.election_id;
    END IF;
    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_vote_window
BEFORE INSERT ON vote
FOR EACH ROW EXECUTE FUNCTION fn_check_election_window();

-- 3d. Votes are immutable (no UPDATE / DELETE)
CREATE OR REPLACE FUNCTION fn_vote_immutable() RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Votes cannot be modified or deleted';
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_vote_immutable
BEFORE UPDATE OR DELETE ON vote
FOR EACH ROW EXECUTE FUNCTION fn_vote_immutable();

-- ---------------------------------------------------------------------
-- 4. STORED FUNCTIONS / PROCEDURES
-- ---------------------------------------------------------------------

-- 4a. cast_vote: one atomic transaction (function body runs in the caller's tx).
-- Rejections are RETURNED (not raised) so the audit_log row is kept;
-- a RAISE would roll the audit insert back too.
CREATE OR REPLACE FUNCTION cast_vote(
    p_voter_id INT, p_election_id INT, p_candidate_id INT, p_booth_id INT
) RETURNS TEXT AS $$
DECLARE
    v_const  INT;
    v_user   INT;
    v_voted  BOOLEAN;
    v_el     election%ROWTYPE;
BEGIN
    SELECT constituency_id, user_id INTO v_const, v_user
      FROM voter WHERE voter_id = p_voter_id;
    IF NOT FOUND THEN
        RETURN 'REJECTED: voter not found';
    END IF;

    SELECT * INTO v_el FROM election WHERE election_id = p_election_id;
    IF NOT FOUND OR v_el.status <> 'ONGOING'
       OR now() < v_el.start_date OR now() > v_el.end_date THEN
        INSERT INTO audit_log(user_id, action, details)
        VALUES (v_user, 'VOTE_REJECTED_WINDOW', jsonb_build_object('election', p_election_id));
        RETURN 'REJECTED: election not open';
    END IF;

    -- candidate must stand in this election AND in the voter's constituency
    PERFORM 1 FROM candidate
     WHERE candidate_id = p_candidate_id AND election_id = p_election_id
       AND constituency_id = v_const;
    IF NOT FOUND THEN
        RETURN 'REJECTED: invalid candidate for this voter';
    END IF;

    -- booth must be in the voter's constituency
    PERFORM 1 FROM polling_booth
     WHERE booth_id = p_booth_id AND constituency_id = v_const;
    IF NOT FOUND THEN
        RETURN 'REJECTED: invalid booth';
    END IF;

    -- lock the voter's status row so two concurrent requests cannot both pass
    INSERT INTO voter_status(voter_id, election_id)
    VALUES (p_voter_id, p_election_id)
    ON CONFLICT DO NOTHING;

    SELECT has_voted INTO v_voted FROM voter_status
     WHERE voter_id = p_voter_id AND election_id = p_election_id
     FOR UPDATE;

    IF v_voted THEN
        INSERT INTO audit_log(user_id, action, details)
        VALUES (v_user, 'DOUBLE_VOTE_ATTEMPT',
                jsonb_build_object('election', p_election_id, 'voter', p_voter_id));
        RETURN 'REJECTED: already voted';
    END IF;

    INSERT INTO vote(election_id, candidate_id, booth_id, cast_time)
    VALUES (p_election_id, p_candidate_id, p_booth_id, date_trunc('hour', now()));

    UPDATE voter_status
       SET has_voted = TRUE, booth_id = p_booth_id, voted_at = CURRENT_DATE
     WHERE voter_id = p_voter_id AND election_id = p_election_id;

    RETURN 'OK';
END; $$ LANGUAGE plpgsql;

-- 4b. Rebuild result_summary for an election
CREATE OR REPLACE PROCEDURE refresh_results(p_election_id INT)
LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM result_summary WHERE election_id = p_election_id;
    INSERT INTO result_summary(election_id, candidate_id, total_votes)
    SELECT c.election_id, c.candidate_id, COUNT(v.vote_id)
      FROM candidate c
      LEFT JOIN vote v ON v.candidate_id = c.candidate_id
     WHERE c.election_id = p_election_id
     GROUP BY c.election_id, c.candidate_id;
END; $$;

-- ---------------------------------------------------------------------
-- 5. VIEWS
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW v_live_results AS
SELECT c.election_id, k.name AS constituency, c.candidate_id, c.name AS candidate,
       p.name AS party, COUNT(v.vote_id) AS votes
  FROM candidate c
  JOIN party p        ON p.party_id = c.party_id
  JOIN constituency k ON k.constituency_id = c.constituency_id
  LEFT JOIN vote v    ON v.candidate_id = c.candidate_id
 GROUP BY c.election_id, k.name, c.candidate_id, c.name, p.name;

CREATE OR REPLACE VIEW v_booth_turnout AS
SELECT e.election_id, b.booth_id, b.location, b.capacity,
       COUNT(v.vote_id) AS votes_cast,
       ROUND(100.0 * COUNT(v.vote_id) / b.capacity, 2) AS turnout_pct
  FROM election e
  CROSS JOIN polling_booth b
  LEFT JOIN vote v ON v.booth_id = b.booth_id AND v.election_id = e.election_id
 GROUP BY e.election_id, b.booth_id, b.location, b.capacity;

CREATE OR REPLACE VIEW v_constituency_winner AS
SELECT election_id, constituency, candidate, party, votes,
       votes - COALESCE(runner_up, 0) AS margin
  FROM (
        SELECT r.election_id, r.constituency, r.candidate, r.party, r.votes,
               RANK() OVER (PARTITION BY r.election_id, r.constituency
                            ORDER BY r.votes DESC) AS rnk,
               LEAD(r.votes) OVER (PARTITION BY r.election_id, r.constituency
                                   ORDER BY r.votes DESC) AS runner_up
          FROM v_live_results r
       ) t
 WHERE rnk = 1;

-- ---------------------------------------------------------------------
-- 6. VECTOR SEARCH (grievance text lives in MongoDB; embeddings live here)
-- ---------------------------------------------------------------------
CREATE TABLE grievance_embedding (
    grievance_id    TEXT PRIMARY KEY,                 -- MongoDB _id as string
    constituency_id INT  NOT NULL REFERENCES constituency(constituency_id),
    embedding       vector(384) NOT NULL,             -- all-MiniLM-L6-v2
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_grievance_hnsw
    ON grievance_embedding USING hnsw (embedding vector_cosine_ops);

-- Retrieval (top 5 similar complaints in one constituency); $1 = query embedding
-- SELECT grievance_id, 1 - (embedding <=> $1) AS similarity
--   FROM grievance_embedding
--  WHERE constituency_id = $2
--  ORDER BY embedding <=> $1
--  LIMIT 5;

-- ---------------------------------------------------------------------
-- 7. DDL DEMO: ALTER and DROP
-- ---------------------------------------------------------------------
ALTER TABLE voter ADD COLUMN phone VARCHAR(15);
ALTER TABLE voter ADD CONSTRAINT chk_phone CHECK (phone IS NULL OR phone ~ '^[0-9]{10,15}$');

CREATE INDEX idx_tmp_booth_location ON polling_booth (location);
DROP INDEX idx_tmp_booth_location;                   -- DROP demo

-- ---------------------------------------------------------------------
-- 8. SEED DATA (small, for demo/testing)
-- ---------------------------------------------------------------------
INSERT INTO users(email, password_hash, role) VALUES
 ('admin@evote.test',  '$2b$10$REPLACE_WITH_REAL_BCRYPT_HASH', 'admin'),
 ('officer@evote.test','$2b$10$REPLACE_WITH_REAL_BCRYPT_HASH', 'officer'),
 ('v1@evote.test',     '$2b$10$REPLACE_WITH_REAL_BCRYPT_HASH', 'voter'),
 ('v2@evote.test',     '$2b$10$REPLACE_WITH_REAL_BCRYPT_HASH', 'voter');

INSERT INTO constituency(name, state) VALUES ('Bengaluru South','Karnataka'), ('Mysuru','Karnataka');
INSERT INTO party(name, symbol) VALUES ('Party A','Lotus'), ('Party B','Hand'), ('Party C','Cycle');
INSERT INTO election(title, start_date, end_date, status)
VALUES ('General Election 2026', now() - INTERVAL '1 day', now() + INTERVAL '7 days', 'ONGOING');

INSERT INTO polling_booth(constituency_id, location, capacity) VALUES (1,'Govt School, Jayanagar',500), (2,'Town Hall, Mysuru',400);
INSERT INTO candidate(name, party_id, constituency_id, election_id) VALUES
 ('Asha Rao',1,1,1), ('Ravi Kumar',2,1,1), ('Meera Nair',3,2,1);
INSERT INTO voter(user_id, name, dob, constituency_id) VALUES
 (3,'Voter One','1998-05-10',1), (4,'Voter Two','1995-02-20',1);

-- ---------------------------------------------------------------------
-- 9. DEMO QUERIES (JOIN, GROUP BY, HAVING, ORDER BY, subquery, FTS)
-- ---------------------------------------------------------------------
-- Q1 votes per candidate per constituency, highest first
-- SELECT constituency, candidate, votes FROM v_live_results ORDER BY constituency, votes DESC;

-- Q2 booths with turnout below 50%  (HAVING)
-- SELECT b.booth_id, b.location, COUNT(v.vote_id)*100.0/b.capacity AS pct
--   FROM polling_booth b LEFT JOIN vote v ON v.booth_id = b.booth_id
--  GROUP BY b.booth_id, b.location, b.capacity
-- HAVING COUNT(v.vote_id)*100.0/b.capacity < 50;

-- Q3 registered voters who have not voted  (subquery)
-- SELECT vr.voter_id, vr.name FROM voter vr
--  WHERE vr.voter_id NOT IN (SELECT voter_id FROM voter_status
--                             WHERE election_id = 1 AND has_voted);

-- Q4 close races: constituencies where top-two margin < 1000
-- SELECT * FROM v_constituency_winner WHERE margin < 1000;

-- Q5 full-text search on candidates
-- SELECT * FROM candidate WHERE to_tsvector('simple', name) @@ to_tsquery('simple', 'asha');

-- ---------------------------------------------------------------------
-- 10. QUICK TESTS (run manually)
-- ---------------------------------------------------------------------
-- SELECT cast_vote(1, 1, 1, 1);   -- 'OK'
-- SELECT cast_vote(1, 1, 2, 1);   -- 'REJECTED: already voted'  (+ audit_log row)
-- SELECT cast_vote(2, 1, 3, 1);   -- 'REJECTED: invalid candidate for this voter'
-- INSERT INTO voter(user_id,name,dob,constituency_id) VALUES (3,'Minor','2015-01-01',1); -- fails: age
-- UPDATE vote SET candidate_id = 2;                                                       -- fails: immutable
-- UPDATE voter_status SET has_voted = FALSE WHERE voter_id = 1;                           -- fails: blocked
-- CALL refresh_results(1);  SELECT * FROM result_summary;
