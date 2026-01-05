export interface Team {
    id: string;
    name: string;
}

export interface Fixture {
    id?: string;
    team_a_id: string | null;
    team_b_id: string | null;
    round_number: number;
    match_number: number;
    round_name: string;
    group_name?: string;
    next_match_id?: string;
    is_team_a_winner_slot?: boolean;
}

/**
 * Generates Round Robin fixtures using the Berger Plate / Circle Method.
 * Ensures every team plays every other team once.
 */
export const generateRoundRobinFixtures = (teams: Team[]): Fixture[] => {
    const fixtures: Fixture[] = [];
    const n = teams.length;
    const isOdd = n % 2 !== 0;

    // If odd, add a dummy team for "bye" rounds
    const tempTeams = [...teams];
    if (isOdd) tempTeams.push({ id: 'BYE', name: 'BYE' });

    const numTeams = tempTeams.length;
    const rounds = numTeams - 1;
    const matchesPerRound = numTeams / 2;

    for (let round = 0; round < rounds; round++) {
        for (let match = 0; match < matchesPerRound; match++) {
            const home = (round + match) % (numTeams - 1);
            let away = (numTeams - 1 - match + round) % (numTeams - 1);

            if (match === 0) away = numTeams - 1;

            const teamA = tempTeams[home];
            const teamB = tempTeams[away];

            if (teamA.id !== 'BYE' && teamB.id !== 'BYE') {
                fixtures.push({
                    team_a_id: teamA.id,
                    team_b_id: teamB.id,
                    round_number: round + 1,
                    match_number: fixtures.length + 1,
                    round_name: `Round ${round + 1}`
                });
            }
        }
    }

    return fixtures;
};

/**
 * Generates initial Knockout fixtures (Round 1) and all subsequent placeholders.
 * Supports any number of teams by filling in BYEs to reach nearest power of 2.
 */
export const generateKnockoutFixtures = (teams: Team[]): Fixture[] => {
    const n = teams.length;

    // Find next power of 2
    let nextPower = 1;
    while (nextPower < n) nextPower *= 2;

    // We generate the entire tree as placeholders
    // This allows us to have a "Roadmap" as requested

    const allMatches: Fixture[] = [];
    let currentPower = nextPower;
    let roundNum = 1;

    // Initialize Round 1 with teams or placeholders
    const r1Teams = [...teams];
    const byes = nextPower - n;
    for (let i = 0; i < byes; i++) r1Teams.push({ id: 'BYE', name: 'BYE' });

    let previousRoundMatches: Fixture[] = [];

    while (currentPower >= 2) {
        const matchesInRound = currentPower / 2;
        const roundName = getRoundName(currentPower);
        const currentRoundMatches: Fixture[] = [];

        for (let i = 0; i < matchesInRound; i++) {
            const matchId = crypto.randomUUID();
            const match: Fixture = {
                id: matchId,
                team_a_id: null,
                team_b_id: null,
                round_number: roundNum,
                match_number: allMatches.length + 1,
                round_name: roundName,
            };

            currentRoundMatches.push(match);
            allMatches.push(match);
        }

        // Link previous round to this round
        if (previousRoundMatches.length > 0) {
            for (let i = 0; i < previousRoundMatches.length; i++) {
                const prevMatch = previousRoundMatches[i];
                const nextMatchIdx = Math.floor(i / 2);
                prevMatch.next_match_id = currentRoundMatches[nextMatchIdx].id;
                prevMatch.is_team_a_winner_slot = i % 2 === 0;
            }
        }

        previousRoundMatches = currentRoundMatches;
        currentPower /= 2;
        roundNum++;
    }

    // Now populate Round 1 specifically with the teams
    const r1Matches = allMatches.filter(m => m.round_number === 1);
    for (let i = 0; i < r1Matches.length; i++) {
        const teamA = r1Teams[i * 2];
        const teamB = r1Teams[i * 2 + 1];

        r1Matches[i].team_a_id = teamA.id === 'BYE' ? null : teamA.id;
        r1Matches[i].team_b_id = teamB.id === 'BYE' ? null : teamB.id;
    }

    return allMatches;
};

const getRoundName = (numTeams: number): string => {
    if (numTeams === 2) return 'Final';
    if (numTeams === 4) return 'Semi Final';
    if (numTeams === 8) return 'Quarter Final';
    return `Round of ${numTeams}`;
};
