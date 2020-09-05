const Request = require('request');
const deasync = require("deasync");
const rp = require('request-promise-native');
const CryptoJS = require('crypto-js');
const uuid = require('uuid');
const apiEndpoint = 'http://localhost:3001';

// Operator with simplified data storage
// const operatorID = '298008b2-a13a-4be2-b304-fe57d4894596';
// const apiKey = 'dadf00ba-8bb5-4596-8acc-a480898a7d17';

// Operator with Full data storage
const operatorID = 'cb905a72-4024-4975-8dac-2ce9cf375cdc';
const apiKey = '22aa883a-0b82-435a-9342-3f25bd28f437';

const storeFullObject = true;

const loopCounter = 2;
const loopWaitMsec = 1000;

// get session
Request.get(apiEndpoint + '/session/' + operatorID + '/start', (error, response, body) => {
    if(error) {
        return console.dir(error);
    }
    const session = JSON.parse(body);
    // calculate hash with SessionID and the operators API Key
    const sessionHash = CryptoJS.SHA256(session.SessionID + ':' + apiKey).toString();
    // login to session
    const sessionBody = JSON.stringify({
        SessionID: session.SessionID,
        Hash: sessionHash
    });
    console.dir(sessionBody);
    Request.post({
        'headers': { 'content-type': 'application/json' },
        'url': apiEndpoint + '/auth/' + operatorID + '/login',
        'body': sessionBody
    }, async (error, response, body) => {
        if(error) {
            return console.dir(error);
        }
        console.log('Auth Body: ', body);
        // get the JWT Token from the login
        const jwtToken = JSON.parse(body)['X-API-JWT'];
        // execute the amount of defined loops
        let count = loopCounter;
        while (count > 0) {
            // define the bet object
            const betObject = {
                OperatorID: operatorID,
                BetSessionID: uuid.v4(),
                BetID: uuid.v4(),
                GameID: uuid.v4(),
                Timestamp: new Date().toISOString(),
                BetAmount: Math.floor(Math.random() * Math.floor(250)),
                WinAmount: Math.floor(Math.random() * Math.floor(1000)),
                BetCurrency: 'EUR',
                BonusRound: false,
                Completed: true
            }
            // calculate the bet hash
            const betString = storeFullObject ? convertBetToDelimitedFull(betObject) : convertBetToDelimitedSimple(betObject);
            const betHash = calculateBetHash(betString);
            betObject.Hash = betHash;
            console.dir(betObject);
            // post bet to API and wait for the result
            // const getPostResult = deasync(function (newBetObject, cb) {
            const options = {
                method: 'POST',
                uri: apiEndpoint + '/bet',
                headers: { 'content-type': 'application/json', 'Authorization': 'Bearer ' + jwtToken },
                body: betObject,
                json: true // Automatically stringifies the body to JSON
            };
            const postResult = await rp(options);
            console.dir(postResult);
            // request.post({
            //     'headers': { 'content-type': 'application/json', 'Authorization': 'Bearer ' + jwtToken },
            //     'url': apiEndpoint + '/bet',
            //     'body': JSON.stringify(newBetObject)
            // }, (error, response, body) => {
            //     if (err) { cb(err, null) }
            //     cb(null, body)
            // });
            // });
            // const postResult = getPostResult(betObject);
            // console.log('POST Result: ' + JSON.stringify(postResult));
            count--;
            await sleep(loopWaitMsec);
        }
    });
});

function sleep(millis) {
    return new Promise(resolve => setTimeout(resolve, millis));
}

function convertBetToDelimitedSimple(bet) {
    return bet.OperatorID + '|' + bet.BetID + '|' + bet.Timestamp;
}

function convertBetToDelimitedFull(bet) {
    const playerID = bet.PlayerID ? bet.PlayerID : '0';
    let result = bet.OperatorID + '|' + bet.BetSessionID + '|' + bet.BetID + '|';
    result += bet.GameID + '|' + playerID + '|' + bet.Timestamp + '|' + bet.BetAmount + '|';
    result += bet.WinAmount + '|' + bet.BetCurrency + '|' + bet.BonusRound + '|' + bet.Completed;
    return result;
}

function calculateBetHash(betString) {
    return CryptoJS.SHA256(betString).toString();
}