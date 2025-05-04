import {
  PostPersistor,
  RepostPersistor,
  QuotePersistor,
  LikePersistor,
} from "./persistor.js";

class Collector {
  constructor(agent, persistor) {
    this.agent = agent;
    this.actorDid = agent.did;
    this.persistor = persistor;
  }

  async getRecordFromUri(uri) {
    const parts = /^at:\/\/(.*?)\/(.*?)\/(.*?)$/.exec(uri);
    const record = await this.agent.com.atproto.repo.getRecord({
      repo: parts[1],
      collection: parts[2],
      rkey: parts[3],
    });

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
    return post.viewer && post.viewer.repost;
  }

  isQuotePost(post) {
    return (
      post.embed &&
      post.embed.record &&
      post.embed.$type.startsWith("app.bsky.embed") &&
      post.embed.record.author.did != this.agent.did
    );
  }

  async collect() {
    var stopPostUri = await this.persistor.getStopUri();
    var params = { actor: this.agent.did, filter: "posts_and_author_threads" };

    while (true) {
      const items = await this.agent.getAuthorFeed(params);

      for (const item of items.data.feed) {
        if (stopPostUri && item.post.uri == stopPostUri) {
          console.log("Stopping at " + stopPostUri);
          return;
        }

        this.persistor.persist(item.post);

        if (this.isRepost(item.post)) {
          const repostRecord = await this.getRecordFromUri(
            item.post.viewer.repost
          );

          this.repostPersistor.persist(item.post, repostRecord);
        } else if (this.isQuotePost(item.post)) {
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

class LikeCollector extends Collector {
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

export { PostCollector, LikeCollector };
