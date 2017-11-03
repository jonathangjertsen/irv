/**
 * Simulate a set of IRV elections based on YouTube videos and check that the algorithm gives the correct result
 */
function runIrvTests() {
    let testsPassed = 0;
    let testsFailed = 0;

    const scenario = (numAlternatives, summarizedVotes, expectedWinner, threshold) => {
        // Set the default IRV threshold to 50%
        if (typeof threshold === 'undefined') {
            threshold = 0.5;
        }

        // Create a list of numAlternatives alternatives + BLANK
        const alternatives = [
            {
                _id: '0',
                description: 'BLANK'
            }
        ];
        for (let i = 0; i < numAlternatives; i++) {
            alternatives.push({
                _id: (i + 1).toString(),
                description: String.fromCharCode('A'.charCodeAt() + i)
            });
        }

        // Create a list of votes based on the summarized votes
        const votes = [];
        summarizedVotes.forEach(function(vote) {
            for (let i = 0; i < vote.num; i++) {
                votes.push(vote);
            }
        });

        // Calculate the IRV winner
        const data = getIrvWinner(alternatives, votes, threshold);

        // Check if the winner is the one we expect
        if (data.winner !== expectedWinner) {
            testsFailed++;
            console.error(`Expected winner to be ${expectedWinner}, got ${data.winner}`);
        } else {
            testsPassed++;
        }
    };

    // Empty
    scenario(
        0,
        [],
        undefined
    );

    scenario(
        1,
        [
            { alternatives: [], num: 5 }
        ],
        undefined
    );

    scenario(
        2,
        [
            { alternatives: ['1'], num: 1 },
            { alternatives: [], num: 5 }
        ],
        '1'
    );

    // Two alternatives, one vote
    scenario(
        2,
        [
            { alternatives: ['1'], num: 1 }
        ],
        '1'
    );

    // Same as previous, but different vote
    scenario(
        2,
        [
                { alternatives: ['2'], num: 1 }
        ],
        '2'
    );

    // Tie between two candidates
    scenario(
        3,
        [
            { alternatives: ['2'], num: 1 },
            { alternatives: ['1'], num: 1 }
        ],
        undefined
    );

    // One candidate has more than 50%
    scenario(
        3,
        [
            { alternatives: ['2', '1'], num: 1 },
            { alternatives: ['1', '2'], num: 1 },
            { alternatives: ['1', '3'], num: 1 }
        ],
        '1'
    );

    // Tie
    scenario(
        3,
        [
            { alternatives: ['2', '1'], num: 1 },
            { alternatives: ['1', '2'], num: 1 }
        ],
        undefined
    );

    // Duplicate voting should not have any effect
    scenario(
        3,
        [
            { alternatives: ['1', '1', '1', '1'], num: 2 },
            { alternatives: ['2'], num: 3 },
            { alternatives: ['3'], num: 1 }
        ],
        '2'
    );

    // A small election
    scenario(
        4,
        [
            { alternatives: ['1', '2', '3'], num: 1 },
            { alternatives: ['3', '1', '2'], num: 1 },
            { alternatives: ['1', '2'], num: 1 },
            { alternatives: ['2', '3', '1'], num: 1 },
            { alternatives: ['4'], num: 1 }
        ],
        '1'
    );

    // https://www.youtube.com/watch?v=6axH6pcuyhQ, first example
    scenario(
        5,
        [
            { alternatives: ['4', '3', '1', '5', '2'], num: 9 },
            { alternatives: ['2', '5', '1', '3', '4'], num: 5 },
            { alternatives: ['5', '1', '4', '2', '3'], num: 2 },
            { alternatives: ['2', '3', '1', '4', '5'], num: 5 },
            { alternatives: ['3', '1', '4', '2', '5'], num: 8 },
            { alternatives: ['2', '4', '3', '1', '5'], num: 6 }
        ],
        '4'
    );

    // https://www.youtube.com/watch?v=6axH6pcuyhQ, second example (Condorcet violation)
    scenario(
        3,
        [
            { alternatives: ['1', '2', '3'], num: 358 },
            { alternatives: ['2', '3', '1'], num: 278 },
            { alternatives: ['3', '2', '1'], num: 214 }
        ],
        '2'
    );

    // https://www.youtube.com/watch?v=RsT1NYsPn2o
    scenario(
        4,
        [
            { alternatives: ['1', '2', '4', '3'], num: 13 },
            { alternatives: ['2', '1', '3', '4'], num: 15 },
            { alternatives: ['3', '4', '1', '2'], num: 7 },
            { alternatives: ['2', '4', '3', '1'], num: 2 },
            { alternatives: ['4', '3', '1', '2'], num: 1 },
            { alternatives: ['1', '2', '3', '4'], num: 4 },
            { alternatives: ['1', '3', '2', '4'], num: 5 },
            { alternatives: ['2', '1', '4', '3'], num: 3 },
            { alternatives: ['3', '1', '2', '4'], num: 1 }
        ],
        '1'
    );

    // https://www.youtube.com/watch?v=C-X-6Lo_xUQ
    scenario(
        5,
        [
            { alternatives: ['2', '3', '1', '4', '5'], num: 3 },
            { alternatives: ['3', '1', '4', '2', '5'], num: 4 },
            { alternatives: ['2', '4', '3', '1', '5'], num: 4 },
            { alternatives: ['4', '3', '1', '5', '2'], num: 6 },
            { alternatives: ['2', '5', '1', '3', '4'], num: 2 },
            { alternatives: ['5', '1', '4', '2', '3'], num: 1 }
        ],
        '4'
    );

    // https://www.youtube.com/watch?v=JIfIxlLaGCo, example 1
    scenario(
        4,
        [
            { alternatives: ['3', '1', '2', '4'], num: 10 },
            { alternatives: ['2', '4', '3', '1'], num: 8 },
            { alternatives: ['1', '3', '4', '2'], num: 7 },
            { alternatives: ['4', '1', '2', '3'], num: 5 },
            { alternatives: ['2', '1', '4', '3'], num: 3 }
        ],
        '1'
    );

    // https://www.youtube.com/watch?v=JIfIxlLaGCo, example 2
    scenario(
        4,
        [
            { alternatives: ['3', '2', '1', '4'], num: 10 },
            { alternatives: ['2', '4', '3', '1'], num: 9 },
            { alternatives: ['1', '3', '4', '2'], num: 6 },
            { alternatives: ['4', '1', '2', '3'], num: 3 },
            { alternatives: ['3', '1', '4', '2'], num: 2 }
        ],
        '3'
    );

    // https://www.youtube.com/watch?v=FdWMMQINIt4
    scenario(
        4,
        [
            { alternatives: ['1', '4', '2', '3'], num: 3 },
            { alternatives: ['1', '2', '3', '4'], num: 1 },
            { alternatives: ['2', '3', '4', '1'], num: 1 },
            { alternatives: ['2', '3', '1', '4'], num: 1 },
            { alternatives: ['3', '2', '4', '1'], num: 1 },
            { alternatives: ['3', '4', '2', '1'], num: 1 },
            { alternatives: ['4', '3', '2', '1'], num: 1 }
        ],
        '3'
    );

    // https://www.youtube.com/watch?v=OI232JSDwDg, example 1
    scenario(
        3,
        [
            { alternatives: ['1', '2', '3'], num: 74 },
            { alternatives: ['2', '3', '1'], num: 48 },
            { alternatives: ['2', '1', '3'], num: 24 },
            { alternatives: ['3', '1', '2'], num: 54 }
        ],
        '1'
    );

    // https://www.youtube.com/watch?v=OI232JSDwDg, example 2 (monotonicity violation)
    scenario(
        3,
        [
            { alternatives: ['1', '2', '3'], num: 93 },
            { alternatives: ['2', '3', '1'], num: 48 },
            { alternatives: ['2', '1', '3'], num: 5 },
            { alternatives: ['3', '1', '2'], num: 54 }
        ],
        '3'
    );

    // https://www.youtube.com/watch?v=01QT3e3sXiY, example 1
    scenario(
        3,
        [
            { alternatives: ['1', '2', '3'], num: 3 },
            { alternatives: ['1', '3', '2'], num: 3 },
            { alternatives: ['3', '2', '1'], num: 5 },
            { alternatives: ['2', '3', '1'], num: 4 }
        ],
        '3'
    );

    // https://www.youtube.com/watch?v=01QT3e3sXiY, example 2
    scenario(
        4,
        [
            { alternatives: ['1', '2', '3', '4'], num: 2 },
            { alternatives: ['4', '1', '2', '3'], num: 2 },
            { alternatives: ['3', '1', '4', '2'], num: 1 },
            { alternatives: ['3', '1', '2', '4'], num: 1 },
            { alternatives: ['2', '1', '3', '4'], num: 2 },
            { alternatives: ['4', '3', '2', '1'], num: 1 },
            { alternatives: ['3', '4', '1', '2'], num: 1 },
            { alternatives: ['2', '3', '1', '4'], num: 1 },
            { alternatives: ['4', '1', '2', '3'], num: 1 }
        ],
        undefined
    );

    // https://www.youtube.com/watch?v=01QT3e3sXiY, example 3
    scenario(
        3,
        [
            { alternatives: ['1', '2', '3'], num: 8 },
            { alternatives: ['2', '3', '1'], num: 7 },
            { alternatives: ['3', '1', '2'], num: 5 }
        ],
        '1'
    );

    // https://www.youtube.com/watch?v=qOGOjnWE8eQ
    scenario(
        3,
        [
            { alternatives: ['1', '2', '3'], num: 9 },
            { alternatives: ['1', '3', '2'], num: 14 },
            { alternatives: ['2', '3', '1'], num: 15 },
            { alternatives: ['2', '1', '3'], num: 4 },
            { alternatives: ['3', '1', '2'], num: 2 },
            { alternatives: ['3', '2', '1'], num: 16 }
        ],
        '2'
    );

    // https://www.youtube.com/watch?v=CMjPbxxN3Kk
    scenario(
        3,
        [
            { alternatives: ['1', '2', '3'], num: 417 },
            { alternatives: ['1', '3', '2'], num: 82 },
            { alternatives: ['2', '3', '1'], num: 357 },
            { alternatives: ['2', '1', '3'], num: 143 },
            { alternatives: ['3', '1', '2'], num: 285 },
            { alternatives: ['3', '2', '1'], num: 324 }
        ],
        '2'
    );

    // https://www.youtube.com/watch?v=CMjPbxxN3Kk, example 2
    scenario(
        3,
        [
            { alternatives: ['1', '2'], num: 300 },
            { alternatives: ['1', '2', '3'], num: 417 },
            { alternatives: ['1', '3', '2'], num: 82 },
            { alternatives: ['2', '3', '1'], num: 357 },
            { alternatives: ['2', '1', '3'], num: 143 },
            { alternatives: ['3', '1', '2'], num: 285 },
            { alternatives: ['3', '2', '1'], num: 324 }
        ],
        '3'
    );

    // https://www.youtube.com/watch?v=3Y3jE3B8HsE
    scenario(
        5,
        [
            { alternatives: ['1', '3'], num: 1 },
            { alternatives: ['2', '3'], num: 5 },
            { alternatives: ['3'], num: 5 },
            { alternatives: ['4'], num: 6 },
            { alternatives: ['5', '4'], num: 3 }
        ],
        '3'
    );

    // https://www.youtube.com/watch?v=wA3_t-08Vr0
    scenario(
        4,
        [
            { alternatives: ['1'], num: 7 },
            { alternatives: ['2'], num: 6 },
            { alternatives: ['3', '2'], num: 4 },
            { alternatives: ['4', '1'], num: 1 },
            { alternatives: ['4', '2'], num: 1 },
            { alternatives: ['4', '3', '1'], num: 1 }
        ],
        '2'
    );

    // Tie between Blank and 2
    scenario(
        2,
        [
            { alternatives: ['0'], num: 1 },
            { alternatives: ['1', '0'], num: 2 },
            { alternatives: ['2', '0'], num: 3 }
        ],
        undefined
    );

    // Blank wins
    scenario(
        2,
        [
            { alternatives: ['1', '0'], num: 3 },
            { alternatives: ['2', '0'], num: 4 },
            { alternatives: ['0'], num: 2 }
        ],
        '0'
    );

    // Blank wins
    scenario(
        2,
        [
            { alternatives: ['1', '0'], num: 3 },
            { alternatives: ['2', '0'], num: 4 },
            { alternatives: ['0'], num: 4 }
        ],
        '0'
    );

    // 2 wins
    scenario(
        2,
        [
            { alternatives: ['1', '2'], num: 3 },
            { alternatives: ['2', '0'], num: 4 },
            { alternatives: ['0'], num: 4 }
        ],
        '2'
    );

    // 3 wins
    scenario(
        3,
        [
            { alternatives: ['1', '3'], num: 3 },
            { alternatives: ['2', '3'], num: 4 },
            { alternatives: ['3'], num: 4 }
        ],
        '3'
    );

    // Higher threshold
    scenario(
        1,
        [
            { alternatives: ['1'], num: 2 },
            { alternatives: ['0'], num: 1 }
        ],
        undefined,
        0.666666667
    );

    scenario(
        1,
        [
            { alternatives: ['1'], num: 6 },
            { alternatives: ['0'], num: 3 }
        ],
        undefined,
        0.666666667
    );

    scenario(
        1,
        [
            { alternatives: ['1'], num: 7 },
            { alternatives: ['0'], num: 3 }
        ],
        '1',
        0.666666667
    );

    console.log(`Instant Runoff Tests: ${testsPassed} tests passed, ${testsFailed} failed`);
}
