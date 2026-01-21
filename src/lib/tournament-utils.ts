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
 * Fisher-Yates shuffle for randomizing team order
 */
const shuffleTeams = (teams: Team[]): Team[] => {
    const shuffled = [...teams];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

/**
 * Generates Round Robin fixtures using the Berger Plate / Circle Method.
 * Teams are RANDOMIZED before generation.
 */
export const generateRoundRobinFixtures = (teams: Team[]): Fixture[] => {
    const fixtures: Fixture[] = [];
    const n = teams.length;
    const isOdd = n % 2 !== 0;

    // RANDOMIZE teams first
    const shuffledTeams = shuffleTeams(teams);
    const tempTeams = [...shuffledTeams];

    // If odd, add a dummy team for "bye" rounds
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
                    id: crypto.randomUUID(), // Add ID
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
 * Teams are RANDOMIZED before seeding.
 */
export const generateKnockoutFixtures = (teams: Team[]): Fixture[] => {
    // RANDOMIZE teams first
    const shuffledTeams = shuffleTeams(teams);
    const n = shuffledTeams.length;

    // Find next power of 2
    let nextPower = 1;
    while (nextPower < n) nextPower *= 2;

    const allMatches: Fixture[] = [];
    let currentPower = nextPower;
    let roundNum = 1;

    // Initialize Round 1 with teams or placeholders
    const r1Teams = [...shuffledTeams];
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

    // Populate Round 1 with the randomized teams
    const r1Matches = allMatches.filter(m => m.round_number === 1);
    for (let i = 0; i < r1Matches.length; i++) {
        const teamA = r1Teams[i * 2];
        const teamB = r1Teams[i * 2 + 1];

        r1Matches[i].team_a_id = teamA.id === 'BYE' ? null : teamA.id;
        r1Matches[i].team_b_id = teamB.id === 'BYE' ? null : teamB.id;
    }

    return allMatches;
};

/**
 * Generates League + Knockout fixtures.
 * Phase 1: Round Robin (all teams play each other)
 * Phase 2: Top 4 Knockout (added manually after league, or placeholder)
 */
export const generateLeaguePlusKnockoutFixtures = (teams: Team[]): Fixture[] => {
    // Phase 1: Round Robin
    const leagueFixtures = generateRoundRobinFixtures(teams);

    // Update round names to indicate "League Stage"
    leagueFixtures.forEach(f => {
        f.round_name = `League - ${f.round_name}`;
    });

    // Phase 2: Placeholder knockout (Semi Finals + Final)
    // These will be populated after league completes
    const knockoutFixtures: Fixture[] = [];
    const leagueRounds = Math.max(...leagueFixtures.map(f => f.round_number));

    // Semi Final 1
    const sf1Id = crypto.randomUUID();
    knockoutFixtures.push({
        id: sf1Id,
        team_a_id: null, // TBD - Rank 1
        team_b_id: null, // TBD - Rank 4
        round_number: leagueRounds + 1,
        match_number: leagueFixtures.length + 1,
        round_name: 'Semi Final'
    });

    // Semi Final 2
    const sf2Id = crypto.randomUUID();
    knockoutFixtures.push({
        id: sf2Id,
        team_a_id: null, // TBD - Rank 2
        team_b_id: null, // TBD - Rank 3
        round_number: leagueRounds + 1,
        match_number: leagueFixtures.length + 2,
        round_name: 'Semi Final'
    });

    // Final
    const finalId = crypto.randomUUID();
    knockoutFixtures.push({
        id: finalId,
        team_a_id: null, // Winner SF1
        team_b_id: null, // Winner SF2
        round_number: leagueRounds + 2,
        match_number: leagueFixtures.length + 3,
        round_name: 'Final',
        next_match_id: undefined
    });

    // Link semi finals to final
    knockoutFixtures[0].next_match_id = finalId;
    knockoutFixtures[0].is_team_a_winner_slot = true;
    knockoutFixtures[1].next_match_id = finalId;
    knockoutFixtures[1].is_team_a_winner_slot = false;

    return [...leagueFixtures, ...knockoutFixtures];
};

/**
 * Generates Group + Knockout fixtures.
 * Splits teams into groups, round robin within groups, then knockout.
 */
export const generateGroupPlusKnockoutFixtures = (teams: Team[]): Fixture[] => {
    const shuffledTeams = shuffleTeams(teams);
    const n = shuffledTeams.length;

    // Determine number of groups (2 or 4 based on team count)
    const numGroups = n >= 8 ? 4 : 2;
    const teamsPerGroup = Math.ceil(n / numGroups);

    const allFixtures: Fixture[] = [];
    const groups: Team[][] = [];

    // Split teams into groups
    for (let g = 0; g < numGroups; g++) {
        const start = g * teamsPerGroup;
        const end = Math.min(start + teamsPerGroup, n);
        groups.push(shuffledTeams.slice(start, end));
    }

    // Generate round robin within each group
    let matchCounter = 1;
    groups.forEach((groupTeams, groupIdx) => {
        const groupName = `Group ${String.fromCharCode(65 + groupIdx)}`; // A, B, C, D

        // Mini round robin for this group
        for (let i = 0; i < groupTeams.length; i++) {
            for (let j = i + 1; j < groupTeams.length; j++) {
                allFixtures.push({
                    id: crypto.randomUUID(),
                    team_a_id: groupTeams[i].id,
                    team_b_id: groupTeams[j].id,
                    round_number: 1,
                    match_number: matchCounter++,
                    round_name: groupName,
                    group_name: groupName
                });
            }
        }
    });

    // Add knockout placeholders
    const groupRound = 1;

    if (numGroups === 2) {
        // Semi finals: A1 vs B2, B1 vs A2
        const sf1Id = crypto.randomUUID();
        const sf2Id = crypto.randomUUID();
        const finalId = crypto.randomUUID();

        allFixtures.push({
            id: sf1Id,
            team_a_id: null, // Group A Winner
            team_b_id: null, // Group B Runner-up
            round_number: groupRound + 1,
            match_number: matchCounter++,
            round_name: 'Semi Final'
        });

        allFixtures.push({
            id: sf2Id,
            team_a_id: null, // Group B Winner
            team_b_id: null, // Group A Runner-up
            round_number: groupRound + 1,
            match_number: matchCounter++,
            round_name: 'Semi Final'
        });

        allFixtures.push({
            id: finalId,
            team_a_id: null,
            team_b_id: null,
            round_number: groupRound + 2,
            match_number: matchCounter++,
            round_name: 'Final'
        });

        // Link to final
        allFixtures[allFixtures.length - 3].next_match_id = finalId;
        allFixtures[allFixtures.length - 3].is_team_a_winner_slot = true;
        allFixtures[allFixtures.length - 2].next_match_id = finalId;
        allFixtures[allFixtures.length - 2].is_team_a_winner_slot = false;
    } else {
        // Quarter finals, Semi finals, Final for 4 groups
        const qfIds = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
        const sfIds = [crypto.randomUUID(), crypto.randomUUID()];
        const finalId = crypto.randomUUID();

        // QF matches
        qfIds.forEach((qfId, i) => {
            allFixtures.push({
                id: qfId,
                team_a_id: null,
                team_b_id: null,
                round_number: groupRound + 1,
                match_number: matchCounter++,
                round_name: 'Quarter Final'
            });
        });

        // SF matches
        sfIds.forEach((sfId, i) => {
            allFixtures.push({
                id: sfId,
                team_a_id: null,
                team_b_id: null,
                round_number: groupRound + 2,
                match_number: matchCounter++,
                round_name: 'Semi Final'
            });
        });

        // Final
        allFixtures.push({
            id: finalId,
            team_a_id: null,
            team_b_id: null,
            round_number: groupRound + 3,
            match_number: matchCounter++,
            round_name: 'Final'
        });
    }

    return allFixtures;
};

const getRoundName = (numTeams: number): string => {
    if (numTeams === 2) return 'Final';
    if (numTeams === 4) return 'Semi Final';
    if (numTeams === 8) return 'Quarter Final';
    return `Round of ${numTeams}`;
};
