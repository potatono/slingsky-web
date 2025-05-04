import { db } from "./firebase.js";

class Persistor {
  constructor(actor, type) {
    this.actor = actor;
    this.type = type;
  }

  getCollection() {
    return db.collection("activity").doc(this.actor).collection(this.type);
  }

  async getLast() {
    const snapshot = await this.getCollection()
      .orderBy(`createdAt`, "desc")
      .limit(1)
      .get();

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
    super(actor, "posts");
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

    await this.getCollection().doc(docData.cid).set(docData);
  }
}

class RepostPersistor extends Persistor {
  constructor(actor) {
    super(actor, "reposts");
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
      authorAvatar: post.author.avatar || null,
      repostCid: repostRecord.cid,
      repostUri: repostRecord.uri,
      repostCreatedAt: repostRecord.value.createdAt,
    };

    console.log("Persisting Repost:");
    console.log(docData);

    this.getCollection().doc(docData.cid).set(docData);
  }
}

class QuotePersistor extends Persistor {
  constructor(actor) {
    super(actor, "quotes");
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
      authorAvatar: post.embed.record.author.avatar || null,
      quoteCid: post.cid,
      quoteUri: post.uri,
      quoteCreatedAt: post.record.createdAt,
    };

    console.log("Persisting Quote:");
    console.log(docData);

    this.getCollection().doc(docData.cid).set(docData);
  }
}

class LikePersistor extends Persistor {
  constructor(actor) {
    super(actor, "likes");
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
      authorAvatar: actorLike.post.author.avatar || null,
      likeCid: likeRecord.cid,
      likeUri: likeRecord.uri,
      likeCreatedAt: likeRecord.value.createdAt,
    };

    console.log(docData);

    this.getCollection().doc(docData.cid).set(docData);
  }
}

export {
  Persistor,
  PostPersistor,
  RepostPersistor,
  QuotePersistor,
  LikePersistor,
};
