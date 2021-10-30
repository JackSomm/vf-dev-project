# vf-dev-project
Development project for VoiceFoundry

# Description
Takes a contacts phone number from an Amazon Connect contact flow, converts it into potential vanity numbers, and stores the best 5 based on business logic. It then returns 3 to the caller in the same contact flow. Uses Lambda, DynamoDB, and Amazon Connect.

# Configuration
The Amazon Connect instance is located here[https://voicefoundry-test-jack.my.connect.aws]
The login to examine the contact flow is
Username: vfoundry
Password: Vfoundrytest2021

The contact flow is called "Vanity Number Flow"

The phone number to access the contact flow is 1 (800) 214-8854

# Explination of Contact Flow
It's obviously best to start with some kind of greeting and indentifying who the customer is calling. While it's a little over kill in this case, by allowing the customer to start the process of converting their phone number to vanity numbers we give them agency and avoid any unecessary function invocations. 

We then handle any unsupported inputs/no input and add those to a loop block in order to prompt the customer again. If those loops complete we disconnect the customer. 3 was an arbitrary choice, but by looping and prompting the caller several times we allow for any mistaken inputs or real life distractions. 

In the case where the customer presses 1 we start logging in case there is a problem with the lambda function. This was born more out of necessity since my lambda had been failing due permission errors and responses to that were to complicated for Amazon Connect. I kept it in at the end because it made sense to log in case there was an edge case that I had not anticipated.

Since this lambda function has a relatively short execution time I decided not to add any hold sounds while it ran. If it approached 20 seconds then I would've added some kind of indication that the customer was still connected. After we get a response from the lambda we put the options into a Play Prompt using SSML and interpret the options as phone numbers. This makes it a bit easier to understand I think.

If the lambda function cannot return any good vanity numbers, meaning they were all gibberish, I inform the caller that their number isn't suited for a vanity number and aplogize. It's not a great solution, but in my explination of choosing the "best" vanity numbers I explain why. 

Because it's still a little difficult to understand I loop the options twice in order to make sure that the caller can document their options. Finally everything links to a Play prompt saying "Goodbye". I did this mainly because the actual vanity number options play prompt leads to a loop that says "Once again". There needed to be a complete option and simply disconnecting seemed like a bad choice.

# Explination of the Lambda
### Determining the best vanity numbers
This was tough. In the end my thought process was this; a good vanity number would have an actual word/name in it. In the case that there were no actual words I would compare all possible combinations of letters (findLetterCombos()) to every word in words.txt. Then I would pick enough to fill the 5 requirement at random (findBest()). 

In my mind there was no way to accomodate for any possible number since there are a lot of numbers that would just have gibberish letter combiniations. In the case that nothing returned, I would simply not return anything and tell the caller to get a new number. I know this isn't a great solution, but as I explain in the Challenges section, I belevie there would be a lot more business logic to determine a better vanity number.

I would have loved to be able to create words that were missing a letter or two, but I wasn't sure how to implement that. I would have liked to pick out words in the middle of the phone number (i.e. 1-800-fun-2222), but I ran out of time for that alogrithim. In createVanityNumbers() I iterate over the array backwards to avoid having to worry about the order of the letters, but that wouldn't be the case if I were to go forward as would be required to find words in the middle of the phonenumber. 

The algorithm to create all letter combinations was made using a breadth first search alogrithim and essentially builds every letter combination at the same time. I believe this could have also been done using recursion, but I'm not sure what the solution would've looked like. I think a backtracking algorithm may have worked. Also since this was being run in a Lambda I wanted to avoid recursion.

### Saving the results
Before running any of the above code we want to make sure that the caller hasn't already tried to retrieve their vanity numbers before. We do this to avoid using too much processing power. So we look up the phone number in DynamoDB and return that data if it exists. Since DynamoDB returns an empty object if we don't find the item we check to see if the item has length and if it doesn't we run the algorithm to convert the phone number. 

I tried to build a function that would return a more robust response, but Amazon Connect broke when the response got too complicated. I'm not sure how to fix that part. It simply returned the computed vanity numbers and a boolean as an object. 

# Challenges

### 1. Vanity Numbers
The first and by far the hardest challenge was creating vanity numbers from a phone number. In the beginning I thought it was best to find all possible letter combinations for a number. The algorithm for this was more understandable to me and it made sense at the time. But I eventually realized that I would have to compare all of the possible cominations to some list of words anyway. 

So then I thought it would be better to filter the list words based on the character positons relative to the digit position in the given phone number. The rest of my thought process is explained above. This was challenging though for one reason in particular, "best" in this case was too vague. 

I believe that in an actual professional situation there would be a lot more business logic to base "best" off of. There wouldn't be random people calling, but rather businesses who had a vertical, a target demographic, a business name, or a product to help guide the logic. For instance, testing with my phone number results in unusable strings. This made testing the contact flow after determining all the "best" logic hard.

If I were to try and solve the case of a phone number that only had unusable strings as it's result I would try to compare it to words without an exact match. The problem is that I dont' have the computing power in lambda to do that. I originally had a word.txt with thousands of lines, but even when I increased the lambdas timeout limit to 2 miuntes it would fail.

# 2. Problems in AWS Services
The rest of the challenges pale in comparison to the first. I have never worked in Amazon Connect before so figuring out how to access external variables and making the text-to-speech voice understandable was a bit difficult. Also the arrows really don't want to work the way I wanted them to so making them understandable was annoying.

I ran in to a few permissions problems with the Lambda, but solved those fairly easily with the AWS CLI.