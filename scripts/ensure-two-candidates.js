// scripts/ensure-two-candidates.js
const { Client } = require('pg');

const CANDIDATE_NAMES = [
  'Asha Rao', 'Ravi Kumar', 'Meera Nair', 'Arjun Gowda',
  'Mohammed Zeeshan', 'Deepa Nayak', 'Suresh Patil', 'Kavitha Reddy',
  'Manjunath Prasad', 'Pooja Hegde', 'Sunil Kumar', 'Lakshmi Bai',
  'Dr. Rajeshwari', 'Venkatesh Murthy', 'Anand Kulkarni', 'Geetha Raman',
  'Basavaraj Bommai', 'Shreya Deshpande', 'Vijay Raghavan', 'Preethi Shenoy',
  'Giridhar Pai', 'Roopa Gangadhar', 'Chandrashekhar', 'Nandini Joshi'
];

async function main() {
  const client = new Client({ connectionString: process.env.PG_URL });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL database.');

    // 1. Ensure at least 3 parties exist
    const partyRes = await client.query('SELECT party_id, name, symbol FROM party ORDER BY party_id');
    let parties = partyRes.rows;

    if (parties.length < 3) {
      await client.query("INSERT INTO party (name, symbol) VALUES ('Party A', 'Lotus') ON CONFLICT (name) DO NOTHING");
      await client.query("INSERT INTO party (name, symbol) VALUES ('Party B', 'Hand') ON CONFLICT (name) DO NOTHING");
      await client.query("INSERT INTO party (name, symbol) VALUES ('Party C', 'Cycle') ON CONFLICT (name) DO NOTHING");
      const updatedParties = await client.query('SELECT party_id, name, symbol FROM party ORDER BY party_id');
      parties = updatedParties.rows;
    }

    // 2. Fetch all elections
    const electionRes = await client.query('SELECT election_id, title FROM election');
    const elections = electionRes.rows;

    // 3. Fetch all constituencies
    const constRes = await client.query('SELECT constituency_id, name FROM constituency ORDER BY constituency_id');
    const constituencies = constRes.rows;

    let nameIdx = 0;

    for (const el of elections) {
      console.log(`\nChecking Election #${el.election_id} ("${el.title}")...`);

      for (const c of constituencies) {
        // Count existing candidates in this constituency for this election
        const existingCandRes = await client.query(
          `SELECT c.candidate_id, c.name, p.name AS party, p.symbol, c.party_id
           FROM candidate c
           JOIN party p ON p.party_id = c.party_id
           WHERE c.election_id = $1 AND c.constituency_id = $2`,
          [el.election_id, c.constituency_id]
        );

        let existing = existingCandRes.rows;
        const usedPartyIds = new Set(existing.map((cand) => cand.party_id));

        // Ensure at least 2 candidates
        while (existing.length < 2) {
          // Find an unused party
          const availableParty = parties.find((p) => !usedPartyIds.has(p.party_id)) || parties[existing.length % parties.length];
          usedPartyIds.add(availableParty.party_id);

          const candidateName = CANDIDATE_NAMES[nameIdx % CANDIDATE_NAMES.length];
          nameIdx++;

          const insertRes = await client.query(
            `INSERT INTO candidate (name, party_id, constituency_id, election_id)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (election_id, constituency_id, party_id) DO NOTHING
             RETURNING candidate_id, name`,
            [`${candidateName} (${c.name})`, availableParty.party_id, c.constituency_id, el.election_id]
          );

          if (insertRes.rows.length > 0) {
            existing.push({
              candidate_id: insertRes.rows[0].candidate_id,
              name: insertRes.rows[0].name,
              party: availableParty.name,
              symbol: availableParty.symbol,
            });
          } else {
            break;
          }
        }

        console.log(`  Constituency [${c.name}]: ${existing.length} candidates contesting`);
        existing.forEach((cand, idx) => {
          console.log(`    ${idx + 1}. ${cand.name} - ${cand.party} [${cand.symbol}]`);
        });
      }
    }

    console.log('\nAll constituencies now have at least 2 contesting candidates!');
  } catch (err) {
    console.error('Failed to update candidates:', err);
  } finally {
    await client.end();
  }
}

main();

