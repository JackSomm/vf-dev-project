'use strict';

const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();

const fs = require('fs')
const path = require('path')
const ss = require('string-similarity');

const contents = fs.readFileSync(path.resolve(__dirname, 'words.txt')).toString()
const wordList = contents.split('\n');
wordList.pop() // remove trailing empty new line

const numberMap = {
    '0': ['0'],
    '1': ['1'],
    '2': ['a', 'b', 'c'],
    '3': ['d', 'e', 'f'],
    '4': ['g', 'h', 'i'],
    '5': ['j', 'k', 'l'],
    '6': ['m', 'n', 'o'],
    '7': ['p', 'q', 'r', 's'],
    '8': ['t', 'u', 'v'],
    '9': ['w', 'x', 'y', 'z']
};

/**
 * Main function that filters words based on relative position to digits in the give phone number
 * @param {string} number Phone number
 * @returns Set of "best" 5 possible vanity numbers
 */
const createVanityNumbers = async(number) => {
    let res = {};
    let words = wordList;

    for (let i = number.length - 1, j = 1; i >= 5; i--, j++) {
        let potentialWords = words.filter(w => {
            return numberMap[number[i]].includes(w.charAt(w.length - j));
        });

        potentialWords.forEach(w => {
            let word = w.toLowerCase();
            if (word.length <= 7 && word.length + i === 12 && Object.keys(res).length < 5) {
                res[`Option${Object.keys(res).length + 1}`] = number.slice(0, 5) + number.slice(5, i) + word;
            }
        });

        words = potentialWords;
    }

    if (Object.keys(res).length < 5) {
        let vanities = await findLetterCombos(number);
        let bestSet = await findBest(vanities);
        let bestArray = Array.from(bestSet);

        while (Object.keys(res).length < 5) {
            let best = bestArray[[Math.floor(Math.random()*bestArray.length)]]

            if (!Object.values(res).indexOf(best) > -1) {
                res[`Option${Object.keys(res).length + 1}`] = best;
            }
        }
    }
    
    return res;
}


/**
 * Using BFS finds all letter combinations for a phone number
 * @param {string} number phone number
 * @returns All potential letter combinations for the phone number
 */
const findLetterCombos = async(number) => {
    if (!number.length) return [];

    let slicedNum = number.slice(5);
    let res = numberMap[slicedNum[0]];

    // remove first digit
    slicedNum = slicedNum.substr(1);

    // turn number into array and loop thru each digit
    slicedNum.split('').forEach((digit) => {
        // initialize placeholder
        let tmp = [];
        // add each character to the existing combinations in the result variable
        numberMap[digit].forEach((char) => {
            tmp = tmp.concat(res.map((item) => {
                return item + char;
            }));
        });
        
        res = tmp;
    });

    // add the first parts of the number back to the new strings
    res = res.map((item) => {
        return '+' + number.slice(1, 2) +  number.slice(2, 5) + item;
    });

    return res;
}

/**
 * Filters the given vanity phone numbers into ones that resemble words
 * @param {array} vanities All possible letter combinations for a phone number
 * @returns set of best vanity numbers
 */
const findBest = (vanities) => {
    let best = new Set();

    vanities.forEach(vanity => {
        let words = [];

        // find words that occur in the current vanity number
        wordList.forEach(w => {
            if (vanity.includes(w)) {
                words.push(w);
            }
        });

        // if there are 3 then that's a very good number
        if (words.length > 2) {
            best.add(vanity);
        }
    });

    // if even after all the above there still isn't 5 we fill the set with randoms
    if (best.size < 5) {
        while (best.size < 5) {
            best.add(vanities[Math.floor(Math.random()*vanities.length)]);
        }
    }
    return best;
} 

/**
 * Tried to implement something like this but it was breaking the contact flow.
 * @param {boolean} success 
 * @param {object} data Vanity numbers or error
 * @returns more robust response
 */
const buildRes = (success, data) => {
    if (success) {
        return {
            success: success,
            vanityNumbers: data
        }
    } else {
        return {
            success: success,
            error: data
        }
    }
}

exports.handler = async (event) => {
    const phoneNumber = event.Details.ContactData.CustomerEndpoint.Address;
    const getParams = {
        TableName: process.env.TABLE_NAME,
        Key: {
            "phoneNumber": phoneNumber
        }
    }
    let data = {};

    // first try to get numbers if the caller has called before
    try {
        data = await docClient.get(getParams).promise();
    } catch (err) {
        console.log(err);
        return err;
    }
    
    // if nothing returns build vanity numbers for the caller
    if (!!!Object.keys(data).length) {
        let bestNumbers = await createVanityNumbers(phoneNumber);
        
        const putParams = {
            Item: {
                "phoneNumber": phoneNumber,
                "vanityNumbers": bestNumbers
            },
            TableName: process.env.TABLE_NAME,
            ConditionExpression: "attribute_not_exists(phoneNumber)"
        };
        
        try {
            await docClient.put(putParams).promise();
            return bestNumbers;
        } catch (err) {
            console.log(err);
            return err;
        }
    } else {
        return data.Item.vanityNumbers;
    }
}