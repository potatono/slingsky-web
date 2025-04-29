const { getOAuthClient } = require("./functions/oauth");
const { db } = require("./functions/firebase");
const { Agent } = require('@atproto/api');

class Persistor {
  constructor(actor, type) {
    this.actor = actor;
    this.type = type;
  }

  getCollection() {
    return db.collection('activity').doc(this.actor).collection(this.type);
  }

  async getLast() {
    const snapshot = await this.getCollection().orderBy(`createdAt`, 'desc').limit(1).get();
    
    if (snapshot.empty) {
      return null;
    }
    const doc = snapshot.docs[0];

    return doc.data();
  }

  async getStopUri() {
    const last = await this.getLast();
    if (last) {
      return last.uri;
    }
    return null;
  }

  async persist(record) {
    throw new Error("Not implemented");
  }
}

class PostPersistor extends Persistor {
  constructor(actor) {
    super(actor, 'posts');
  }

  async persist(post) {
    const docData = {
      cid: post.cid,
      uri: post.uri,
      createdAt: post.record.createdAt,
      postCid: post.cid,
      postUri: post.uri,
      postCreatedAt: post.record.createdAt,
    };

    console.log("Persisting Post:");
    console.log(docData);

    await this.getCollection().doc(docData.cid).set(docData)
  }
}

class RepostPersistor extends Persistor{
  constructor(actor) {
    super(actor, 'reposts');
  }

  async persist(post, repostRecord) {
    const docData = {
      cid: repostRecord.cid,
      uri: repostRecord.uri,
      createdAt: repostRecord.value.createdAt,
      postCid: post.cid,
      postUri: post.uri,
      postCreatedAt: post.record.createdAt,
      postText: post.record.text,
      authorDid: post.author.did,
      authorHandle: post.author.handle,
      authorDisplayName: post.author.displayName,
      repostCid: repostRecord.cid,
      repostUri: repostRecord.uri,
      repostCreatedAt: repostRecord.value.createdAt
    };

    console.log("Persisting Repost:");
    console.log(docData);

    this.getCollection().doc(docData.cid).set(docData)
  }
}

class QuotePersistor extends Persistor{
  constructor(actor) {
    super(actor, 'quotes');
  }

  async persist(post) {
    const docData = {
      cid: post.cid,
      uri: post.uri,
      createdAt: post.record.createdAt,
      postCid: post.embed.record.cid,
      postUri: post.embed.record.uri,
      postCreatedAt: post.embed.record.value.createdAt,
      postText: post.embed.record.value.text,
      authorDid: post.embed.record.author.did,
      authorHandle: post.embed.record.author.handle,
      authorDisplayName: post.embed.record.author.displayName,
      quoteCid: post.cid,
      quoteUri: post.uri,
      quoteCreatedAt: post.record.createdAt
    };

    console.log("Persisting Quote:");
    console.log(docData);

    this.getCollection().doc(docData.cid).set(docData)
  }
}

class LikePersistor extends Persistor {
  constructor(actor) {
    super(actor, 'likes');
  }

  async persist(actorLike, likeRecord) {
    const docData = {
      cid: likeRecord.cid,
      uri: likeRecord.uri,
      createdAt: likeRecord.value.createdAt,
      postCid: actorLike.post.cid,
      postUri: actorLike.post.uri,
      postCreatedAt: actorLike.post.record.createdAt,
      postText: actorLike.post.record.text,
      authorDid: actorLike.post.author.did,
      authorHandle: actorLike.post.author.handle,
      authorDisplayName: actorLike.post.author.displayName,
      likeCid: likeRecord.cid,
      likeUri: likeRecord.uri,
      likeCreatedAt: likeRecord.value.createdAt
    };

    console.log(docData);

    this.getCollection().doc(docData.cid).set(docData)
  }
}

class Collector {
  constructor(agent, persistor) {
    this.agent = agent;
    this.actorDid = agent.did;
    this.persistor = persistor;
  }

  async getRecordFromUri(uri) {
    const parts = /^at:\/\/(.*?)\/(.*?)\/(.*?)$/.exec(uri);
    const record = await this.agent.com.atproto.repo.getRecord({ repo: parts[1], collection: parts[2], rkey: parts[3] });

    return record.data;
  }

  async collect() {
    throw new Error("Not implemented");
  }
}

class PostCollector extends Collector {
  constructor(agent) {
    super(agent, new PostPersistor(agent.did));
    this.repostPersistor = new RepostPersistor(this.actorDid);
    this.quotePersistor = new QuotePersistor(this.actorDid);
  }

  isRepost(post) {
    return post.viewer && post.viewer.repost
  }

  isQuotePost(post) {
    return (post.embed && post.embed.record &&
      post.embed.$type.startsWith('app.bsky.embed') && 
      post.embed.record.author.did != this.agent.did);
  }

  async collect() {
    var stopPostUri = await this.persistor.getStopUri();
    var params = { actor: this.agent.did, filter: 'posts_and_author_threads' };

    while (true) {
      const items = await this.agent.getAuthorFeed(params);

      for (const item of items.data.feed) {
        if (stopPostUri && item.post.uri == stopPostUri) {
          console.log("Stopping at " + stopPostUri);
          return;
        }

        this.persistor.persist(item.post);

        if (this.isRepost(item.post)) {
          const repostRecord = await this.getRecordFromUri(item.post.viewer.repost);

          this.repostPersistor.persist(item.post, repostRecord);
        }
        else if (this.isQuotePost(item.post)) {
          this.quotePersistor.persist(item.post);
        }
      }
  
      params.cursor = items.data.cursor;
    
      if (items.data.cursor == null || items.data.feed.length == 0) {
          console.log("No more posts to collect");
          return;
      }
    }
  }
}

class LikeCollector extends Collector{
  constructor(agent) {
    super(agent, new LikePersistor(agent.did));
  }

  async collect() {
    var stopLikeUri = await this.persistor.getStopUri();
    var params = { actor: this.agent.did };

    while (true) {
      const likes = await this.agent.getActorLikes(params);

      for (const like of likes.data.feed) {
        if (stopLikeUri && like.post.viewer.like == stopLikeUri) {
          console.log("Stopping at " + like.post.viewer.like);
          return;
        }

        const likeRecord = await this.getRecordFromUri(like.post.viewer.like);
        this.persistor.persist(like, likeRecord);  
      }
  
      params.cursor = likes.data.cursor;
    
      if (likes.data.cursor == null || likes.data.feed.length == 0) {
          console.log("No more likes to collect");
          return;
      }
    }
  }
}

(async() => {
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