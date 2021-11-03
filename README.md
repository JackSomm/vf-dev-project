# vf-dev-project
Development project for VoiceFoundry

# Description
Takes a contacts phone number from an Amazon Connect contact flow, converts it into potential vanity numbers, and stores the best 5 based on business logic. It then returns 3 to the caller in the same contact flow. Uses Lambda, DynamoDB, and Amazon Connect.

Main code can be found in /lambda/index.js

# Configuration
### Amazon Connect
The Amazon Connect instance is located [here](https://voicefoundry-test-jack.my.connect.aws)
The phone number to access the contact flow is 1 (800) 214-8854

### CloudFormation
There is a simple CloudFormation stack template (template.yaml) that can be used to create a the lambda function, IAM role for the lambda function, and a DynamoDB table. The IAM role gives full DynamoDB access, full S3 access, and Lambda execute access. To deploy using the AWS CLI run the following commands while in the ```vf-dev-project``` directory:

Package: ```aws cloudformation package --template-file template.yaml --s3-bucket your-s3-bucket --s3-prefix your-prefix --output-template-file your-template-file-name```

Validate: ```aws cloudformation validate-template --template-body file://your-template-file-name```

Deploy: ```aws cloudformation deploy --template-file your-template-file-name --stack-name your-stack-name --region your-region --capabilities CAPABILITY_NAMED_IAM```

This should deploy the lambda code to your desired region with the necessary permissions.
### Amazon Connect
In order to import the contact flow, please download the importable JSON file from [here](https://vf-dev-project-lambda.s3.us-west-2.amazonaws.com/Vanity+Number+Flow) and import into a new contact flow inside of your Amazon Connect instance. Or you can use the "Vanity Number Flow" file in this repo.

# Explination of Contact Flow
It's obviously best to start with some kind of greeting and message indentifying who the customer is calling. While it's a little over kill in this case, by allowing the customer to start the process of converting their phone number to vanity numbers we give them agency and avoid any unecessary function invocations. 

We then handle any unsupported inputs/no input and add those to a loop block in order to prompt the customer again. If those loops complete we disconnect the customer. 3 was an arbitrary choice, but by looping and prompting the caller several times we allow for any mistaken inputs or real life distractions. 

In the case where the customer presses 1 we start logging in case there is a problem with the lambda function. This was born more out of necessity since my lambda had been failing due permission errors and responses to that were to complicated for Amazon Connect. I kept it in at the end because it made sense to log in case there was an edge case that I had not anticipated.

Since this lambda function has a relatively short execution time I decided not to add any hold sounds while it ran. If it approached 20 seconds then I would've added some kind of indication that the customer was still connected. After we get a response from the lambda we put the options into a Play Prompt using SSML and interpret the options as phone numbers. This makes it a bit easier to understand I think.

Because it's still a little difficult to understand I loop the options twice in order to make sure that the caller can document their options. Finally everything links to a Play prompt saying "Goodbye". I did this mainly because the actual vanity number options play prompt leads to a loop that says "Once again". There needed to be a complete option and simply disconnecting seemed like a bad choice.

# Explanation of the Lambda
Just as a preface, I really didn't get this to work the way I wanted it to.

### Algorithm Explanation
My original thought was to find all possible letter combinations and the compare those against a list of words. Eventually I decided that filter the list of words was a simpler approach. I still decided to keep the original solution though to fill in missing gaps.

The algorithm to create all letter combinations was made using breadth first search and essentially builds every letter combination at the same time. I believe this could have also been done using recursion, but I'm not sure what the solution would've looked like. I think a backtracking algorithm may have worked. Also since this was being run in a Lambda I wanted to avoid recursion.

From there I filtered the list of words based on the character positions relative to the digit position in the given phone number. The rest of my thought process is explained above in the Determining the best vanity numbers section.

### Determining the best vanity numbers
This was tough. In the end my thought process was this; a good vanity number would have an actual word/name in it. In the case that there were no actual words I would compare all possible combinations of letters (findLetterCombos()) to every word in words.txt. Then I would pick enough to fill the 5 requirement at random (findBest()).

I also thought that having the phone number end in a word was better than one in the middle. This was more a limitation of my algorithm than my idea of "best". Ideally a word anywhere in the number is better than gibberish anywhere.

In my mind there was no way to accommodate for any possible number since there are a lot of numbers that would just have gibberish letter combinations.


### Saving the results
Before running any of the above code we want to make sure that the caller hasn't already tried to retrieve their vanity numbers before. We do this to avoid using too much processing power. So we look up the phone number in DynamoDB and return that data if it exists. Since DynamoDB returns an empty object if we don't find the item we check to see if the item has length and if it doesn't we run the algorithm to convert the phone number. 

I tried to build a function that would return a more robust response, but Amazon Connect broke when the response got too complicated. I'm not sure how to fix that part. It simply returned the computed vanity numbers and a boolean as an object. 

# Potential Web App
I wasn't able to get around to creating a web app to display the vanity numbers of the last 5 callers, but I think this would've been fairly simple. I would've kept Node as the backend and Vue for the frontend. While a bit overkill for something this small, it's something I'm familiar with and fairly easy to put together in a short time. I would display the caller's number and subsequent vanity numbers in a table for easy readability.

The app would update via the lambda. When that was invoked it would send a POST request with the needed data and I would update the values.
# Challenges

### 1. "Best" Vanity Numbers
The first and by far the hardest challenge was determining the best vanity numbers from a phone number. 

I would have loved to be able to create words that were missing a letter or two, but I wasn't sure how to implement that. I would have liked to pick out words in the middle of the phone number (i.e. 1-800-fun-2222), but I ran out of time for that algorithm. In createVanityNumbers() I iterate over the array backwards because I believe that ending with a word is better than having a word in the middle. This limited the potential of the solution.

This was challenging though for one reason in particular, "best" in this case was extremely open ended, which was one of the points of the exercise. 

I believe that in an actual professional situation there would be a lot more business logic to base "best" off of. There (hopefully) wouldn't be random people calling, but rather businesses who had a vertical, a target demographic, a business name, or a product to help guide the logic. For instance, testing with my phone number results in unusable strings. This made testing the contact flow after determining all the "best" logic hard.

If I were to try and solve the case of a phone number that only had unusable strings as it's result I would try to compare it to words without an exact match. In this case I would try testing words with their vowels removed or missing a letter or two at the end. Those are fairly common middle grounds in vanity numbers. Another problem was my sample size of words. I originally had a words.txt with thousands of lines, but even when I increased the lambda's timeout limit to 2 minutes it would timeout.

### 2. Problems in AWS Services
The rest of the challenges pale in comparison to the first. I have never worked in Amazon Connect before so figuring out how to access external variables and making the text-to-speech voice understandable was a bit difficult. Also the arrows really don't want to work the way I wanted them to so making them understandable was annoying.

I ran in to a few permissions problems with the Lambda, but solved those fairly easily with the AWS CLI.

I attempted to make this as an AWS CDK app, but I was having npm package versioning issues and ran out of time.