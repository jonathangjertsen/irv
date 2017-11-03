/*
Parts of this file are based on PeterTheOne's Instant Runoff Voting tool at
https://github.com/PeterTheOne/IRV. That project is licensed under the MIT license.
To comply with that license, a copy of the copyright notice for that project is
included below.

~~~
The MIT License (MIT)

Copyright (c) 2013-2015 Peter Grassberger <petertheone@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
~~~
*/

/**
 * Calculate the winner of IRV given a list of alternatives, a list of ballots and a threshold for winning (default=0.5)
 *
 * @param {Array} rawAlternatives - a list of objects describing each alternative. Structure:
 *      [
 *          { "_id": id, "description": description },
 *          ...
 *      ]
 * @param {Array} rawVotes - a list of ballots. Structure:
 *      [
 *          { "_id": id, "alternatives": [ pri1, pri2, pri3, ..., priN ] },
 *          ...
 *      ]
 * @param {number} threshold - The winner must have 100*threshold% of the votes in the end to win
 * @returns {Object} - a full breakdown of the IRV process and the ID of the winner. Structure:
 *      {
 *          "result": result description,
 *          "winner": string
 *      }
 */
function getIrvWinner(rawAlternatives, rawVotes, threshold) {
    // Create a fresh copy of the votes to prevent accidentally modifying the input.
    let votes = deepcopy(rawVotes);
    votes = removeEmptyVotes(votes);

    // Do the same for the alternatives.
    let alternatives = deepcopy(rawAlternatives);
    const names = getDescriptions(alternatives);

    // Set default threshold to 0.5
    if (typeof threshold === 'undefined') {
        threshold = 0.5;
    }

    // Find the blank
    let blankId = -1;
    alternatives.forEach(function(alternative) {
        if (alternative.description === 'BLANK') {
            blankId = alternative._id;
        }
    });

    // Run as many runoff iterations as needed, up to a maximum (to prevent an infinite
    // loop in the case of an incorrect implementation).
    const result = [];
    const maxRounds = 100;
    for (let round = 0; round < maxRounds; round++) {
        // Print headline for this round
        result.push(`Round #${round + 1}.`);
        result.push(`${objLen(names)} candidates and ${votes.length} (non-empty) votes.`);

        // Count first votes
        const firstVotes = countFirstVotes(votes, alternatives);

        // Print number of first votes per candidates
        result.push('Number of first votes per candidate:');
        iterateOverObject(firstVotes, function(alternativeId) {
            result.push(`* ${names[alternativeId]}: ${firstVotes[alternativeId]}`);
        });

        // Based on the first votes, calculate winners and losers.
        const roundWinners = getRoundWinners(firstVotes);
        let roundLosers = getRoundLosers(firstVotes, blankId);

        const roundWinner = roundWinners[0];
        let roundLoser = roundLosers[0];

        const ratioOfWinnerVotes = firstVotes[roundWinner] / votes.length;
        const ratioOfLoserVotes = firstVotes[roundLoser] / votes.length;

        // Print info about winners and losers
        if (roundWinners.length === 1) {
            result.push(
                `${names[roundWinner]} has the highest number of votes, with ${firstVotes[roundWinner]} votes (${(100 * ratioOfWinnerVotes).toFixed(2)}%)`);
        } else {
            result.push(`${roundWinners.length} candidates have the highest number of votes with ${firstVotes[roundWinner]} votes (${(100 * ratioOfWinnerVotes).toFixed(2)}%)`);
        }
        if (roundLosers.length === 1) {
            result.push(`${names[roundLoser]} has the lowest number of votes, with ${firstVotes[roundLoser]} votes (${(100 * ratioOfLoserVotes).toFixed(2)}%)`);
        } else {
            result.push(`${roundLosers.length} candidates have the lowest number of votes with ${firstVotes[roundLoser]} votes (${(100 * ratioOfLoserVotes).toFixed(2)}%)`);
        }

        // If there is a majority, determine the winner now.
        if (ratioOfWinnerVotes > threshold) {
            result.push(`${names[roundWinner]} won!`);
            return { result: result, winner: roundWinner };
        }

        // If there is no majority, and only 2 alternatives left, then we have a tie.
        // If there is a blank alternative with no votes and only 3 alternatives are left (including blank), we also have a tie.
        let tieExists = alternatives.length === 2;
        if (blankId !== -1) {
            tieExists |= (firstVotes[blankId] === 0) && (alternatives.length === 3);
        }
        if (tieExists) {
            result.push(`There are two candidates left and no one has over ${threshold * 100}% of the votes.`);
            return { result: result, winner: undefined };
        }

        // If there are several losers we determine which candidate to remove now.
        if (roundLosers.length > 1) {
            let n = 1;
            while (roundLosers.length > 1 && n <= objLen(names)) {
                const nthVotes = countNthVotes(votes, alternatives, n);
                roundLosers = getRoundTiebreakerLosers(nthVotes, roundLosers);
                result.push(`Tiebreaker: use ${n + 1}. votes. ${roundLosers.length} loser(s) left.`);
                n++;
            }
            if (roundLosers.length === 1) {
                roundLoser = roundLosers[0];
                result.push(`Tiebreaker: ${names[roundLoser]} was selected as the loser of the round.`);
            }
        }
        if (roundLosers.length > 1) {
            const randomIndex = Math.round(Math.random() * (roundLosers.length - 1));
            roundLoser = roundLosers[randomIndex];
            result.push(`Tiebreaker: ${names[roundLoser]} was randomly selected as the loser of the round.`);
        }

        // Eliminate the loser
        delete names[roundLoser];
        votes = removeLoserVotes(votes, roundLoser);
        alternatives = removeLoserAlternative(alternatives, roundLoser);

        // Go to the next round
        result.push('');
    }

    // No winner calculated after a large number of rounds, should not happen
    result.push('Maximum number of rounds reached.');
    return { result: result, winner: undefined };
}

/**
 * Iterate over all properties of an object (excluding those from the prototype) and apply the given callback
 * @param {Object} obj Object to iterate over
 * @param {function} callback Callback to apply to each key in the object
 */
function iterateOverObject(obj, callback) {
    for (const entry in obj) {
        if (obj.hasOwnProperty(entry)) {
            callback(entry);
        }
    }
}

/**
 * Return the number of properties in an object (excluding those from the prototype)
 * @param {Object} obj Object whose number of properties should be counted
 * @returns {number} The number of properties in the object (excluding those from the prototype)
 */
function objLen(obj) {
    let count = 0;
    iterateOverObject(obj, function(dummy) {
        count++;
    });
    return count;
}

/**
 * Return a deep copy of a serializable value
 * @param serializableValue
 * @returns A deep copy of the serializable value
 */
function deepcopy(serializableValue) {
    return JSON.parse(JSON.stringify(serializableValue));
}

/**
 * Remove the elements of `input` given by the indices in `indicesToRemove`.
 * @param {Array} input The input array
 * @param {Array} indicesToRemove A list of indices to remove in the input array
 * @returns {Array} A copy of the input array excluding the removed indices
 */
function removeByIndices(input, indicesToRemove) {
    const output = input;
    // Indices above the ones we have already removed will decrease.
    // This is not a problem as long as we traverse the array in reverse.
    for (let i = indicesToRemove.length - 1; i >= 0; i--) {
        output.splice(indicesToRemove[i], 1);
    }
    return output;
}

/**
 * Remove empty votes (i.e., list of alternatives has zero length) from the input
 * @param {Array} inputVotes A list of votes
 * @returns {Array} The votes which are not empty
 */
function removeEmptyVotes(inputVotes) {
    const votes = inputVotes;
    const votesToRemove = [];

    // Collect indices of votes to remove
    for (let i = 0; i < inputVotes.length; i++) {
        if (!(inputVotes[i].alternatives.length)) {
            votesToRemove.push(i);
        }
    }

    // Remove those indices
    removeByIndices(votes, votesToRemove);

    // Return the votes which are not empty
    return votes;
}

/**
 * Count the number of n'th votes cast for each alternative.
 * @param {Array} votes - a list of objects with an "alternatives" property which is a list of ID's
 * @param {Array} alternatives - a list of the available alternatives
 * @param {number} n - we count up the N-th votes (0-indexed)
 * @returns {Object} number of n'th votes - with the format { id1: nthVotesForId1, id2: nthVotesForId2, ... }
 */
function countNthVotes(votes, alternatives, n) {
    // Init the nthVotes object by setting the count to 0 for all alternatives
    const nthVotes = {};
    alternatives.forEach(function(alternative) {
        nthVotes[alternative._id] = 0;
    });

    // Add up the votes for each alternative
    votes.forEach(function(vote) {
        if (n >= vote.alternatives.length) {
            return;
        }
        const nthVoteId = vote.alternatives[n];
        if (nthVoteId in nthVotes) {
            nthVotes[nthVoteId]++;
        } else {
            console.error(`Invalid alternative ID ${nthVoteId}!!`);
        }
    });
    return nthVotes;
}

/**
 * Count the number of first votes case for each alternative.
 * @param {Array} votes - a list of objects with an "alternatives" property which is a list of ID's
 * @param {Array} alternatives - a list of available alternatives
 * @returns {Object} number of 1st votes - with the format { id1: 1stVotesForId1, id2: 1stVotesForId2, ... }
 */
function countFirstVotes(votes, alternatives) {
    return countNthVotes(votes, alternatives, 0);
}

/**
 * Calculate the winners (one or more alternatives with the top number of votes) for one round of IRV
 * @param {Array} firstVotes - a list of all the 1st votes for this IRV round
 * @returns {Array} array with one or more alternative ID's, corresponding to the winners of the round
 */
function getRoundWinners(firstVotes) {
    let maxVotes = -1;
    let roundWinners = [];
    iterateOverObject(firstVotes, function(alternativeId) {
        if (firstVotes[alternativeId] > maxVotes) {
            // If the number of first votes for the current alternative is strictly greater
            // than the max number of first votes encountered so far, then the list of round
            // winners should only contain the current alternative.
            maxVotes = firstVotes[alternativeId];
            roundWinners = [alternativeId];
        } else if (firstVotes[alternativeId] === maxVotes) {
            // If the number of first votes for the current alternative is equal to the max
            // number of first votes encountered so far, then the current alternative should
            // be added to the already existing list of round winners.
            roundWinners.push(alternativeId);
        }
    });
    return roundWinners;
}

/**
 * Calculate the losers (one or more alternatives with the lowest number of 1st votes) for one round of IRV
 * @param {Array} firstVotes - a list of all the 1st votes for this IRV round
 * @param blankId - the ID of the "BLANK" vote, or -1 if there is no such vote. This ID will not be considered a loser.
 * @returns {Array} array with one or more alternative ID's, corresponding to the losers of the round
 */
function getRoundLosers(firstVotes, blankId) {
    let minVotes = Number.MAX_SAFE_INTEGER;
    let roundLosers = [];
    iterateOverObject(firstVotes, function(alternativeId) {
        // Blank votes can not be eliminated
        if (blankId !== -1 && alternativeId === blankId) {
            return;
        }

        if (firstVotes[alternativeId] < minVotes) {
            // If the number of first votes for the current alternative is strictly less
            // than the min number of first votes encountered so far, then the list of round
            // losers should only contain the current alternative.
            minVotes = firstVotes[alternativeId];
            roundLosers = [alternativeId];
        } else if (firstVotes[alternativeId] === minVotes) {
            // If the number of first votes for the current alternative is equal to the min
            // number of first votes encountered so far, then the current alternative should
            // be added to the already existing list of round losers.
            roundLosers.push(alternativeId);
        }
    });
    return roundLosers;
}

/**
 * Calculate the losers of the tie break (one or more alternatives with the lowest number of n'th votes) for one round
 * of IRV if the bottom place is tied.
 * @param {Array} nthVotes - a list of all the n'th votes for this round.
 * @param {Array} loserPool - a list of ID's which are candidates for being eliminated.
 * @returns {Array} array with one or more alternative ID's, corresponding to the losers as chosen by nth votes
 */
function getRoundTiebreakerLosers(nthVotes, loserPool) {
    // Set the number of nth votes to 0 if it has not been set already
    loserPool.forEach(function(alternativeId) {
        if (!(alternativeId in nthVotes)) {
            nthVotes[alternativeId] = 0;
        }
    });

    let minVotes = Number.MAX_SAFE_INTEGER;
    let losers = [];
    iterateOverObject(nthVotes, function(alternativeId) {
        // Only alternatives in the loser pool can be eliminated at this point
        if (loserPool.indexOf(alternativeId) === -1) {
            return;
        }

        if (nthVotes[alternativeId] < minVotes) {
            // If the number of first votes for the current alternative is strictly less
            // than the min number of first votes encountered so far, then the list of round
            // losers should only contain the current alternative.
            minVotes = nthVotes[alternativeId];
            losers = [alternativeId];
        } else if (nthVotes[alternativeId] === minVotes) {
            // If the number of first votes for the current alternative is equal to the min
            // number of first votes encountered so far, then the current alternative should
            // be added to the already existing list of round losers.
            losers.push(alternativeId);
        }
    });

    return losers;
}

/**
 * Convert a list of alternatives to a mapping between alternative ID's and their descriptions
 * @param {Array} alternatives
 * @returns {Object} A mapping of (alternative ID -> alternative description)
 */
function getDescriptions(alternatives) {
    const candidates = {};
    alternatives.forEach(function(alternative) {
        candidates[alternative._id] = alternative.description;
    });
    return candidates;
}

/**
 * Remove the votes for the loser of a round of IRV.
 * @param {Array} rawVotes - all the votes before the loser is eliminated
 * @param {string} roundLoser - the alternative ID of the loser for this round
 * @returns {Array} - all the votes after the user is eliminated
 */
function removeLoserVotes(rawVotes, roundLoser) {
    const votes = rawVotes;
    rawVotes.forEach(function(vote, idx) {
        // Find index of loser
        let idxToRemove = -1;
        for (let i = 0; i < vote.alternatives.length; i++) {
            if (vote.alternatives[i] === roundLoser) {
                if (idxToRemove !== -1) {
                    console.error('Duplicate loser!');
                } else {
                    idxToRemove = i;
                }
            }
        }

        // Remove element with that index
        if (idxToRemove !== -1) {
            votes[idx].alternatives.splice(idxToRemove, 1);
        }
    });

    // Return the votes which are not empty after eliminating the loser
    return removeEmptyVotes(votes);
}

/**
 * Remove the loser alternative of a round of IRV
 * @param {Array} rawAlternatives - all the alternatives before the loser is eliminated
 * @param {string} roundLoser
 * @returns {Array} - all the alternatives after the loser is eliminated
 */
function removeLoserAlternative(rawAlternatives, roundLoser) {
    const alternatives = rawAlternatives;

    // Find the index of the alternative to remove in the array.
    let idxToRemove = -1;
    rawAlternatives.forEach(function(alternative, idx) {
        if (alternative._id === roundLoser) {
            idxToRemove = idx;
        }
    });

    // Remove the element with that index.
    if (idxToRemove !== -1) {
        alternatives.splice(idxToRemove, 1);
    }

    return alternatives;
}
