# vf-dev-project
Development project for VoiceFoundry

# Description
A basic Amazon Connect integration that takes a contacts phone number, converts it into all possible vanity numbers, then stores and returns the best 5 based off of business logic. Uses Lambda, DynamoDB, and Amazon Connect.

# Configuration
The Amazon Connect instance is located here[https://voicefoundry-test-jack.my.connect.aws]
The login to examine the contact flow is
Username: vfoundry
Password: Vfoundrytest2021

The phone number to access the contact flow is 1 (800) 214-8854

# Explination of Contact Flow
It's obviously best to start with some kind of greeting and indentifying who the customer is calling. While it's a little over kill in this case, by allowing the customer to start the process of converting their phone number to vanity numbers we give them agency and avoid any unecessary function invocations. 

We then handle any unsupported inputs/no input and add those to a loop block in order to prompt the customer again. If those loops complete we disconnect the customer. 3 was an arbitrary choice, but by looping and prompting the caller several times we allow for any mistaken inputs or real life distractions. 

In the case where the customer presses 1 we start logging in case there is a problem with the lambda function. This was born more out of necessity since my lambda had been failing due permission errors and responses to that were to complicated for Amazon Connect. I kept it in at the end because it made sense to log in case there was an edge case that I had not anticipated.

Since this lambda function has a relatively short execution time I decided not to add any hold sounds while it ran. If it approached 20 seconds then I would've added some kind of indication that the customer was still connected. After we get a response from the lambda we put the options into a Play Prompt using SSML and interpret the options as phone numbers. This makes it a bit easier to understand I think. Since it's hard to know if the numbers will form actual words I thought it best to say the letters individually.

Because it's still a little difficult to understand I loop the options twice in order to make sure that the caller can document their options. Finally everything links to a Play prompt saying "Goodbye". I did this mainly because the actual vanity number options play prompt leads to a loop that says "Once again". There needed to be a complete option and simply disconnecting seemed like a bad choice.

# Explination of the Lambda
### Converting a phone number to all possible vanity numbers
I have provided two solutions, each essentially doing the same thing. One uses basic javascript with no frills and the other uses built in functions.

The general idea was to use breadth first search, i.e. build all combinations at the same time. Starting at the children of the root node we add each character to the result and then go to the children of those nodes (i.e. the combinations based on the next digit). We continue like that until we have reached the last digit.

Of course we didn't want the country code or the area code so we start at the 5th index in order to skip all of those numbers. The lambda uses a hash map of the numbers as a reference. 

In this case I set 0 and 1 to be equal to themselves. I considered leaving them out, but replacing them with something else would've added more time complexity. For a little more detail, the function checks all letters for all digits and pushes their combinations to a temporary variable. Once each combination for each letter in the current digit has be created we set the response variable to the temporary variable and move to the next digit.

Since we loop through each digit in the phone number and then each character for a digit the time complexity should be O(3^n) where n equals the digits in the phone number. I think the space complexity is about the same. 

I think this could have been solved using recursion as well, but I couldn't figure that out exactly and this solution better aligns with Lambda best practices.

### Determining the best vanity numbers

### Saving the results
Before running any of the above code we want to make sure that the caller hasn't already tried to retrieve their vanity numbers before. We do this to avoid using too much processing power. So we look up the phone number in DynamoDB and return that data if it exists. Since DynamoDB returns an empty object if we don't find the item we check to see if the item has length and if it doesn't we run the algorithm to convert the phone number. 

I tried to build a function that would return a more robust response, but Amazon Connect broke when the response got too complicated. I'm not sure how to fix that part. 

# Challenges
The first challenge was definitely creating the alogrithm to convert the phone number to vanity numbers. Looping through each digit and then looping through each character for a digit made sense, but in the beginning I was just adding them together rather than creating separate combinations. I eventually realized I needed to build basically children combinations and build on them as I looped through each digit and subsequent character.