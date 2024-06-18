const { ApolloServer, gql } = require("apollo-server");

const { Sequelize, DataTypes } = require("sequelize");

const GraphQLJSON = require("graphql-type-json");

const { publicKeyToAddress, verifyCommit } = require("@albertiprotocol/sdk");

const difficulty = process.env.ALBERTI_DIFFICULTY || 4;

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "data.db",
});

const Commit = sequelize.define(
  "Commit",
  {
    commitAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    data: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    publicKey: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    signature: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    nonce: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    timestamps: true,
  }
);

sequelize.sync();

const typeDefs = gql`
  scalar JSON

  type ServerInfo {
    difficulty: Int!
    currentTime: String!
    totalEntries: Int!
    totalAddresses: Int!
    oldestEntryDate: String
  }

  type Commit {
    commitAt: String!
    data: JSON
    address: String!
    publicKey: String!
    signature: String!
    type: String!
    nonce: Int!
    createdAt: String!
    updatedAt: String!
  }

  type Query {
    getServerInfo: ServerInfo!
    getCommit(signature: String!): Commit
    getCommits(page: Int!, perPage: Int!): [Commit]
    getCommitsByAddress(address: String!, page: Int!, perPage: Int!): [Commit]
    getAllAddresses: [String]
  }

  type Mutation {
    createCommit(
      commitAt: String!
      data: JSON
      publicKey: String!
      signature: String!
      type: String!
      nonce: Int!
    ): Commit
  }
`;

const resolvers = {
  JSON: GraphQLJSON,
  Query: {
    getCommit: async (_, { signature }) => {
      return await Commit.findByPk(signature);
    },
    getCommits: async (_, { page, perPage }) => {
      const offset = (page - 1) * perPage;
      return await Commit.findAll({
        limit: perPage,
        offset: offset,
        order: [["createdAt", "DESC"]],
      });
    },

    getCommitsByAddress: async (_, { address, page, perPage }) => {
      const offset = (page - 1) * perPage;
      return await Commit.findAll({
        where: { address },
        limit: perPage,
        offset: offset,
        order: [["createdAt", "DESC"]],
      });
    },

    getAllAddresses: async () => {
      const uniqueAddresses = await Commit.findAll({
        attributes: [
          [sequelize.fn("DISTINCT", sequelize.col("address")), "address"],
        ],
      });
      return uniqueAddresses.map((commit) => commit.address);
    },

    getServerInfo: async () => {
      const totalEntries = await Commit.count();

      // Find the oldest entry date
      const oldestEntry = await Commit.findOne({
        order: [["createdAt", "ASC"]],
      });
      const oldestEntryDate = oldestEntry
        ? oldestEntry.createdAt.toISOString()
        : null;

      const uniqueAddressescount = await Commit.count({
        distinct: true,
        col: "address",
      });

      return {
        difficulty: parseInt(difficulty),
        currentTime: new Date().toISOString(),
        totalEntries: totalEntries,
        totalAddresses: uniqueAddressescount,
        oldestEntryDate: oldestEntryDate,
      };
    },
  },
  Mutation: {
    createCommit: async (_, args) => {
      const address = publicKeyToAddress(args.publicKey);

      if (!verifyCommit(args, difficulty)) {
        throw new Error(
          "Difficulty not met, Current difficulty is " + difficulty
        );
      }

      return await Commit.create({ ...args, address });
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req }) => {
    return { sequelize };
  },
});

server.listen().then(({ url }) => {
  console.log(`🚀 Server ready at ${url}`);
});
