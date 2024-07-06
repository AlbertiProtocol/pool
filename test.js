const {
  verifyCommit,
  createCommit,
  postTemplate,
  generateKeyPair,
} = require("@albertiprotocol/sdk");

const axios = require("axios");

const account = generateKeyPair();
const priv = account.privateKey;

async function test() {
  const postx = postTemplate("hey Sir " + Math.random(), [], [], [], null);

  const commit = createCommit(priv, postx, "post", 4);

  console.log(commit);

  const verify = await verifyCommit(commit);

  console.log(verify);

  const response2 = await axios.post("http://localhost:4000/graphql", {
    query: `
         mutation Mutation(
  $type: String!
  $nonce: Int!
  $publicKey: String!
  $signature: String!
  $data: JSON
) {
  createCommit(
    type: $type
    nonce: $nonce
    publicKey: $publicKey
    signature: $signature
    data: $data
  ) {
    data
    type
    nonce
    publicKey
    signature
    createdAt
    updatedAt
  }
}

            `,
    variables: {
      type: commit.type,
      nonce: commit.nonce,
      publicKey: commit.publicKey,
      signature: commit.signature,
      data: commit.data,
    },
  });
}

test();
test();
test();
