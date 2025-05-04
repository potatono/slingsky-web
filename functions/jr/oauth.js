import { db } from "./firebase.js";

// ATProto imports
import { NodeOAuthClient } from "@atproto/oauth-client-node";
import { JoseKey } from "@atproto/jwk-jose";
import jwtPrivateKeyData from "./jwtPrivateKey.json" with { type: "json" };

const host = "dev.slingsky.app";

// Initialize ATProto OAuth client
const clientMetadata = {
  // Must be a URL that will be exposing this metadata
  client_id: `https://${host}/client-metadata.json`,
  client_name: "Slingsky",
  client_uri: `https://${host}`,
  logo_uri: `https://${host}/s/img/logo.png`,
  tos_uri: `https://${host}/s/tos`,
  policy_uri: `https://${host}/s/policy`,
  redirect_uris: [`https://${host}/callback`],
  scope: "atproto transition:generic",
  grant_types: ["authorization_code", "refresh_token"],
  response_types: ["code"],
  application_type: "web",
  token_endpoint_auth_method: "private_key_jwt",
  token_endpoint_auth_signing_alg: "RS256",
  dpop_bound_access_tokens: true,
  jwks_uri: `https://${host}/jwks.json`,
};

function getKeySet() {
  
  var jwtPrivateKeys = jwtPrivateKeyData.jwtPrivateKeys;
  // TODO make this work with all the keys
  jwtPrivateKeys = [jwtPrivateKeys[0]];
  return Promise.all(
    jwtPrivateKeys.map((key) => {
      key = key.join("\n");
      return JoseKey.fromImportable(key, "1");
    })
  );
}

function getStore(collection) {
  return {
    async set(key, internalState) {
      var state = JSON.stringify(internalState);
      await db.collection(collection).doc(key).set({ state });
    },
    async get(key) {
      var doc = await db.collection(collection).doc(key).get();
      var state = doc.data();
      return JSON.parse(state.state);
    },
    async del(key) {
      await db.collection(collection).doc(key).delete();
    },
  };
}

async function getOAuthClient() {
  const client = new NodeOAuthClient({
    // This object will be used to build the payload of the /client-metadata.json
    // endpoint metadata, exposing the client metadata to the OAuth server.
    clientMetadata: clientMetadata,

    // Used to authenticate the client to the token endpoint. Will be used to
    // build the jwks object to be exposed on the "jwks_uri" endpoint.
    keyset: await getKeySet(),

    // Interface to store authorization state data (during authorization flows)
    stateStore: getStore("state"),

    // Interface to store authenticated session data
    sessionStore: getStore("sessions"),

    // A lock to prevent concurrent access to the session store. Optional if only one instance is running.
    //requestLock,
  });
  return client;
}

export { host, getOAuthClient, clientMetadata };
