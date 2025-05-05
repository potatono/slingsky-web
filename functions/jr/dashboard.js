import { db } from "./firebase.js";

class Summarizer {
  constructor(actor) {
    this.actor = actor;
  }

  getActivityCollection(activityType) {
    console.log(
      `Getting activity collection for actor: ${this.actor}, activityType: ${activityType}`
    );
    return db.collection("activity").doc(this.actor).collection(activityType);
  }

  async getActivitySince(activityType, since) {
    const snapshot = await this.getActivityCollection(activityType)
      //.where("createdAt", ">", since)
      .orderBy("createdAt", "asc")
      .get();

    if (snapshot.empty) {
      console.log(`No ${activityType} activity found since ${since}`);
      return [];
    }

    const activities = [];
    snapshot.forEach((doc) => {
      activities.push(doc.data());
    });

    console.log(
      `Found ${activities.length} ${activityType} activities since ${since}`
    );
    return activities;
  }

  async summarize(since) {
    const budget = 25;
    const maxIndividualPayout = 5;

    const payoutRatios = {
      likes: 1,
      reposts: 2,
      quotes: 1.5,
    };
    const activityTypes = ["likes", "reposts", "quotes"];
    const summary = {};

    // Group activities by authorDid, and add up the potential payout
    for (const activityType of activityTypes) {
      const activity = await this.getActivitySince(activityType, since);

      for (const item of activity) {
        console.log("Processing item:", item);
        const did = item.authorDid;

        if (!summary[did]) {
          summary[did] = {
            did: did,
            handle: item.authorHandle,
            displayName: item.authorDisplayName,
            avatar: item.authorAvatar,
            likes: 0,
            reposts: 0,
            quotes: 0,
            potentialPayout: 0,
          };
        }

        summary[did][activityType] += 1;
        summary[did].potentialPayout += payoutRatios[activityType];
        summary[did].potentialPayout = Math.min(
          summary[did].potentialPayout,
          maxIndividualPayout
        );
      }
    }

    // Round the potential payout to the nearest integer
    for (const did in summary) {
      summary[did].potentialPayout = Math.round(summary[did].potentialPayout);
    }

    // Sort the summary by potential payout
    const sortedSummary = Object.values(summary).sort(
      (a, b) => b.potentialPayout - a.potentialPayout
    );

    // Zero out potential payouts for items that exceed the budget
    var remainingBudget = budget;
    for (const item of sortedSummary) {
      if (remainingBudget <= 0) {
        item.potentialPayout = 0;
      } else {
        remainingBudget -= item.potentialPayout;
      }
    }

    return sortedSummary;
  }
}

class Dashboard {
  constructor(actor) {
    this.actor = actor;
    this.summarizer = new Summarizer(actor);
  }

  getCollection() {
    return db.collection("dashboard").doc(this.actor).collection("current");
  }

  async clear() {
    const dashboardRef = this.getCollection();
    const snapshot = await dashboardRef.get();

    if (snapshot.empty) {
      console.log("No documents to delete");
      return;
    }

    snapshot.forEach((doc) => {
      doc.ref.delete();
    });
  }

  async update(since) {
    const summary = await this.summarizer.summarize(since);
    const dashboardRef = this.getCollection();

    console.log("Updating dashboard with summary:", summary);

    for (var i = 0; i < summary.length; i++) {
      var item = summary[i];
      //var n = String(i + 1).padStart(4, "0");
      //var docId = `${n}:${item.did}`;
      var docId = item.did;
      await dashboardRef.doc(docId).set(item);
    }
  }
}

export { Summarizer, Dashboard };
export default Dashboard;
