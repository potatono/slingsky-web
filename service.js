const { getOAuthClient } = require("./functions/oauth");
const { Agent } = require('@atproto/api');

const key = "did:plc:a5mgfv3la6g7ww2ptxlwafhk";


// Getting likes
// Call getActorLikes
// For each like, call getRecord
// Store the like in firebase
// Repeat until you have hit a like you already have or reached the end of the list

(async() => {

const client = await getOAuthClient();
const session = await client.restore(key);
if (!session) {
  console.log("Session not found");
  return;
}

const agent = new Agent(session);
var params = { actor: agent.did, limit: 10 };

while (true) {
    
    const likes = await agent.getActorLikes(params);
    //const like = await agent.com.atproto.repo.getRecord({ repo: agent.did, collection: 'app.bsky.feed.like', rkey: '3ln3ttskq4k2n' });
    console.log(likes.data);

    params.cursor = likes.data.cursor;

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    await sleep(1000);

    if (likes.data.cursor == null || likes.data.feed.length == 0) {
        break;
    }
}


//console.log(likes.data.feed[0]);
//console.log(like.data);



})();



