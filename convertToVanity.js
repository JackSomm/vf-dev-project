'use strict';

const AWS = require('aws-sdk'),
            docClient = new AWS.DynamoDB.DocumentClient();

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
 * Takes a phone number and returns all possible vanity numbers
 * @param {string} number phone number
 * @returns all possible vanity numbers
 */
const createVanityNumbers = async (number) => {
    // Return early if no number given
    if (!number.length) return [];

    // Initialize array to store all letter combos up to prev digit
    let res = [''];
    
    // Loop thru each digit ignoring the first 4
    for (let i = 5; i < number.length; i++) {
        // Initialize array to store combos for this digit
        let tmp = [];
        // Get array of characters for this digit
        let chars = numberMap[number[i]];
        
        // Loop thru characters for digit
        for (let j = 0; j < chars.length; j++) {
            // Loop thru current response array and add character to combos
            for (let k = 0; k < res.length; k++) {
                tmp.push(res[k] + chars[j]);
            }
        }
        // Update total comnbos
        res = tmp;
    }

    for (let g = 0; g < res.length; g++) {
      res[g] = number.slice(1, 2) + '-' + number.slice(2, 5) + '-' + res[g];
    }
    
    return res;
}

const createVanityNumbers2 = async(number) => {
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

  return res.map((item) => {
      return number.slice(1, 2) + '-' + number.slice(2, 5) + '-' + item;
  });
}

/**
 * Takes all possible vanity numbers and chooses the "best"
 * @param {array} numbers vanity numbers
 * @returns 5 of the "best" vanity numbers
 */
const filterVanityNumbers = async (numbers) => {
    let count = 1;
    let resultMap = {};

    while (count < 6) {
        let item = numbers[Math.floor(Math.random()*numbers.length)];
        resultMap[`Option${count}`] = item;
        count++;
    }
    
    return resultMap;
}

/**
 * Tried to integrate this for potentially more robust responses but it broke the function
 * invokation in connect. Not sure why.
 * @param {boolean} success 
 * @param {object} payload vanity numbers
 * @returns 
 */
const buildRes = (success, payload) => {
    if (success) {
        return {
            vanityNumbers: payload,
            result: "Success"
        };
    } else {
        console.log("Lambda failed");
        return { result: "Failure" };
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

    try {
        data = await docClient.get(getParams).promise();
        console.log(data);
    } catch (err) {
        console.log(err);
    }
    
    if (!!!Object.keys(data).length) {
        const numbers = await createVanityNumbers(phoneNumber);
        const bestNumbers = await filterVanityNumbers(numbers);
        
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
        }
    } else {
        return data.Item.vanityNumbers;
    }
};