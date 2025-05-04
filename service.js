const { Agent } = require("@atproto/api");
const { getOAuthClient } = require("./oauth");
const { LikeCollector, PostCollector } = require("./collector");

(async () => {
  const actorDid = "did:plc:a5mgfv3la6g7ww2ptxlwafhk";

  const client = await getOAuthClient();
  const session = await client.restore(actorDid);
  if (!session) {
    console.log("Session not found");
    return;
  }

  const agent = new Agent(session);

  const likeCollector = new LikeCollector(agent);
  likeCollector.collect();

  const postCollector = new PostCollector(agent);
  postCollector.collect();

  // // Quote post is, has embed, embed.$type starts with 'app.bsky.embed', and embed.record.author.did is not me
  // // Repost is the same as quote post but also has a reason with $type of 'app.bsky.feed.defs#reasonRepost'

  // const feed = await agent.getAuthorFeed({ actor: actorDid, filter: 'posts_and_author_threads' });

  // for (const item of feed.data.feed) {

  //   console.log(item.post);
  //   const isQuotePost = (item.post.embed && item.post.embed.record &&
  //     item.post.embed.$type.startsWith('app.bsky.embed') &&
  //     item.post.embed.record.author.did != actorDid);

  //   const isRepost = (item.post.viewer && item.post.viewer.repost)

  //   if (isRepost) {
  //     const parts = /^at:\/\/(.*?)\/(.*?)\/(.*?)$/.exec(item.post.viewer.repost);
  //     const repostRecord = await agent.com.atproto.repo.getRecord({ repo: parts[1], collection: parts[2], rkey: parts[3] });
  //     console.log(repostRecord.data);
  //   }

  //   console.log(`Post ${item.post.uri} is a${isQuotePost ? ' quote' : ''}${isRepost ? ' repost' : ''} post by ${item.post.author.handle}`);
  // }
})();
