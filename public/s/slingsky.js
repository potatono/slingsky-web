import van from "https://cdn.jsdelivr.net/gh/vanjs-org/van/public/van-1.5.5.min.js";
import { firebase } from "/s/jrfb.js?v=2025050401";
import { eventbus } from "/s/eventbus.js?v=2025042901";

class Slingsky {
  constructor() {}

  async setup() {
    this.setupState();
    this.setupAuthListener();
    this.setupDashboardListener();
    this.setupNavbar();
    this.setupDashboard();
    this.setupWelcome();
  }

  setupState() {
    this.state = {
      dashboard: van.state([]),
      avatar: van.state(""),
      user: van.state({}),
      isSyncing: van.state(false),
      budget: van.state(25),
      balance: van.state(25),
    };
  }

  async setupNavbar() {
    const { nav, img, span } = van.tags;

    van.add(
      document.body,
      nav(
        {
          class:
            "h-16 flex items-center px-4 justify-between bg-[#335380] shadow",
        },
        img({ src: "/s/img/logo.svg", alt: "Slingsky", class: "h-8 w-auto" }),
        span({ class: "text-white font-bold" }, "Balance: $25"),
        span({ class: "text-white font-bold" }, "Budget: $25"),
        img({
          id: "nav-avatar",
          alt: "Profile",
          class: "w-10 h-10 rounded-full",
          src: this.state.avatar,
        })
      )
    );
  }

  async setupWelcome() {
    const { div, h1, p, a, span } = van.tags;

    van.add(
      document.body,
      div(
        {
          class:
            "container mx-auto mt-4 flex flex-col max-w-[960px] border-2 border-[#335380] rounded-lg p-4 bg-white shadow",
          style: () =>
            "display:" + (this.state.dashboard.val.length ? "none" : "block"),
        },
        h1({ class: "text-2xl font-bold" }, "Getting Started"),

        p(
          { class: "mt-2" },
          "Welcome to your Slingsky dashboard.  Here you will see your",
          " reaction activity on Bluesky and other ATProto apps."
        ),
        p(
          { class: "mt-2" },
          "We'd like to collect your like and repost activity to help calculate ",
          "how to best allocate your Slingsky budget. This data will remain ",
          "confidential and will not be shared outside the Slingsky platform."
        ),
        p(
          { class: "mt-2" },
          a(
            {
              href: "#",
              class:
                "inline-block px-4 py-2 my-6 bg-[#335380] text-white rounded hover:bg-[#80A4ED] hover:text-black",
              onclick: () => {
                this.syncActivity();
              },
              style: () =>
                "display: " +
                (this.state.isSyncing.val ? "none" : "inline-block"),
            },
            "Get Started"
          ),
          a(
            {
              href: "#",
              class:
                "inline-block px-4 py-2 my-6 bg-[#335380] text-white rounded hover:bg-[#80A4ED] hover:text-black",
              onclick: () => {
                this.updateDashboard();
              },
              style: () =>
                "display: " +
                (this.state.isSyncing.val ? "none" : "inline-block"),
            },
            "Update Dashboard"
          ),

          div(
            {
              class:
                "inline-block h-8 w-8 my-6 animate-spin rounded-full border-4 border-solid border-current border-e-transparent align-[-0.125em] text-[#335380] motion-reduce:animate-[spin_1.5s_linear_infinite]",
              role: "status",
              style: () =>
                "display: " +
                (this.state.isSyncing.val ? "inline-block" : "none"),
            },
            span(
              {
                class:
                  "!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]",
              },
              "Loading..."
            )
          )
        )
      )
    );
  }

  changePayout(item, delta) {
    if (delta > 0 && this.state.balance.val < this.state.budget.val) {
      item.potentialPayout += 1;
      this.state.balance.val += 1;
      this.save(item);
    } else if (delta < 0 && item.potentialPayout > 0) {
      item.potentialPayout -= 1;
      this.state.balance.val -= 1;
      this.save(item);
    }
  }

  getPayoutRow(item) {
    const { div, img, span, button } = van.tags;

    console.log(`Rendering payout row for item: ${item.id}`);
    var statusClass = "";

    if (item.changed) {
      statusClass = "bg-[#dbad6a]";
    }
    else if (item.potentialPayout == 0) {
      statusClass = "bg-gray-100";
    }
    //var currentPayout = van.state(item.potentialPayout);
    //this.state.rows[item.id] = van.state(item.potentialPayout);
    var row = div(
      {
        class: `flex items-center p-4 bg-white rounded shadow ${statusClass}`,
      },
      img({
        src: item.avatar,
        alt: item.displayName,
        class: "w-10 h-10 rounded-full mr-4",
      }),
      div(
        { class: "flex-1" },
        span({ class: "font-bold" }, item.displayName),
        span({ class: "text-gray-500 ml-2" }, item.handle)
      ),
      div(
        { class: "flex space-x-3 ml-4 mr-16" },
        span({}, `Likes: ${item.likes}`),
        span({}, `Quotes: ${item.quotes}`),
        span({}, `Reposts: ${item.reposts}`)
      ),
      div(
        { class: "flex items-center space-x-2" },
        button(
          {
            type: "button",
            class: "text-gray-500 hover:text-gray-700",
            onclick: () => this.changePayout(item, -1),
          },
          "▼"
        ),
        span({ class: "font-bold" }, () => `$${item.potentialPayout}`),
        button(
          {
            type: "button",
            class: "text-gray-500 hover:text-gray-700",
            onclick: () => this.changePayout(item, 1),
          },
          "▲"
        )
      )
    );

    return row;
  }

  getTotalRow() {
    const { div, img, span, a } = van.tags;

    console.log("Rendering total row");
    var row = div(
      {
        class: `flex items-center p-4 bg-white rounded shadow bg-[#BCD3F2]`,
      },
      div(
        { class: "flex-1" },
        a(
          {
            href: "#",
            class:
              "inline-block px-4 py-2 my-6 bg-[#335380] text-white rounded hover:bg-[#80A4ED] hover:text-black",
            onclick: () => {
              this.updateDashboard();
            },
            style: () =>
              "display: " +
              (this.state.isSyncing.val ? "none" : "inline-block"),
          },
          "Recalculate"
        )
      ),
      div(
        { class: "flex space-x-3 ml-4 mr-16" },
        span({ class: "font-bold" }, "Total")
      ),
      div(
        { class: "flex items-center space-x-2" },
        span(
          { class: "font-bold" },
          () => `$${this.state.balance.val}/${this.state.budget.val}`
        )
      )
    );
    return row;
  }

  setupDashboard() {
    const { div, img, span, button, a } = van.tags;

    // Create a container for the dashboard entries
    van.add(
      document.body,
      div(
        {
          class: "container mx-auto mt-4 flex flex-col max-w-[960px] space-y-4",
        },
        (dom) => {
          // If we've already rendered the dashboard return it
          // That way down stream state changes will not update the whole dashboard
          //if (dom && dom.childElementCount > 0)
          //  return dom;

          console.log("Rendering dashboard");
          var hasTotalRow = false;
          var rows = [];
          for (const item of this.state.dashboard.val) {
            if (item.potentialPayout == 0 && !hasTotalRow) {
              hasTotalRow = true;
              rows.push(this.getTotalRow());
            }
            rows.push(this.getPayoutRow(item));
          }

          return div(rows);
        }
      )
    );
  }

  async setupAuthListener() {
    firebase.auth.instance.onAuthStateChanged(async (user) => {
      try {
        if (user) {
          console.log("User is signed in");
          var tokenResult = await user.getIdTokenResult();
          var claims = tokenResult.claims;

          user.displayName = claims.displayName;
          user.handle = claims.handle;
          user.avatar = claims.avatar;
          user.banner = claims.banner;
          user.description = claims.description;

          this.state.user.val = user;
          this.state.avatar.val = user.avatar;

          eventbus.dispatchEvent(
            new CustomEvent("userSignedIn", { detail: user })
          );
        } else {
          console.log("No user is signed in");

          const token = this.getTokenFromCookie();
          if (token) {
            await this.signInWithToken(token);
          }
        }
      } catch (err) {
        console.error(err);
      }
    });
  }

  async setupDashboardListener() {
    eventbus.addEventListener("userSignedIn", (event) => {
      const ref = firebase.db.collection(
        firebase.db.instance,
        "dashboard",
        event.detail.uid,
        "current"
      );

      const query = firebase.db.query(ref, 
        firebase.db.orderBy("potentialPayout", "desc"),
        firebase.db.orderBy("displayName", "asc")
      );

      firebase.db.onSnapshot(query, (snapshot) => {
        const dashboard = snapshot.docs.map((doc) => ({
          id: doc.id,
          changed: false,
          ...doc.data(),
        }));

        snapshot.docChanges().forEach((change) => {
          if (change.type === "modified") {
            console.log("Modified item:", change.doc.id);
            dashboard[change.newIndex].changed = true;
          }
        });

        this.state.dashboard.val = dashboard;
      });
    });
  }

  save(item) {
    // Save the item to the database
    const ref = firebase.db.doc(
      firebase.db.instance,
      "dashboard",
      this.state.user.val.uid,
      "current",
      item.id
    );

    delete item.changed; // Remove the changed flag before saving
    firebase.db.setDoc(ref, item)
    .then(() => {
      console.log("Item saved successfully");
    })
    .catch((error) => {
      console.error("Error saving item:", error);
    });

  }

  getTokenFromCookie() {
    // If token is set in the cookie use it to authenticate
    const token = document.cookie.replace(
      /(?:(?:^|.*;\s*)token\s*\=\s*([^;]*).*$)|^.*$/,
      "$1"
    );

    return token;
  }

  deleteTokenFromCookie() {
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  }

  async signInWithToken(token) {
    await firebase.auth.signInWithCustomToken(firebase.auth.instance, token);

    return firebase.auth.instance.currentUser;
  }

  signOut() {
    firebase.auth.signOut(firebase.auth.instance);
    deleteTokenFromCookie();
  }

  async call(functionName, data = null) {
    try {
      data = data && JSON.stringify(data);
      var response = await fetch(`/api/${functionName}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.state.user.val.accessToken}`,
        },
        body: data,
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      var result = await response.json();
      return result;
    } catch (error) {
      console.error("Error calling function:", error);
    }
  }

  async syncActivity() {
    try {
      this.state.isSyncing.val = true;
      const result = await this.call("syncActivity");
      this.state.isSyncing.val = false;
      console.log(result);
    } catch (error) {
      console.error("Error syncing activity:", error);
    }
  }

  async updateDashboard() {
    try {
      this.state.isSyncing.val = true;
      const result = await this.call("updateDashboard");
      this.state.isSyncing.val = false;
      console.log(result);
    } catch (error) {
      console.error("Error updating dashboard:", error);
    }
  }
}

const slingsky = new Slingsky();
slingsky.setup();

window.slingsky = slingsky;
window.firebase = firebase;
export { slingsky };
