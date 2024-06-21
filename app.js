#!/usr/bin/env node

// Imports
const { ApolloServer, gql } = require("apollo-server");
const { Sequelize, DataTypes, Op } = require("sequelize");
const GraphQLJSON = require("graphql-type-json");
const { publicKeyToAddress, verifyCommit } = require("@albertiprotocol/sdk");

// Configurations
const difficulty = parseInt(process.env.ALBERTI_DIFFICULTY) || 5;
const port = parseInt(process.env.ALBERTI_PORT) || 4000;

// Database setup
const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "./data/commits.db",
  logging: false, // Disable logging for cleaner output
});

// Commit model definition
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

// Periodic task to delete old commits
const deleteOldCommits = async () => {
  try {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    await Commit.destroy({
      where: {
        updatedAt: {
          [Op.lt]: threeMonthsAgo,
        },
      },
    });

    console.log("Old commits deleted successfully");
  } catch (error) {
    console.error("Error deleting old commits:", error);
  }
};

// GraphQL schema definition
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
    getRandomCommit: Commit
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

// GraphQL resolvers
const resolvers = {
  JSON: GraphQLJSON,
  Query: {
    getRandomCommit: async () => {
      return await Commit.findOne({ order: sequelize.random() });
    },

    getCommit: async (_, { signature }) => {
      return await Commit.findByPk(signature);
    },

    getCommits: async (_, { page, perPage }) => {
      const offset = (page - 1) * perPage;
      return await Commit.findAll({
        limit: perPage,
        offset,
        order: [["createdAt", "DESC"]],
      });
    },

    getCommitsByAddress: async (_, { address, page, perPage }) => {
      const offset = (page - 1) * perPage;

      let commits = await Commit.findAll({
        where: { address },
        limit: perPage,
        offset,
        order: [["createdAt", "DESC"]],
      });

      if (commits.length === 0) {
        commits = await Commit.findAll({
          where: { publicKey: address },
          limit: perPage,
          offset,
          order: [["createdAt", "DESC"]],
        });
      }

      return commits;
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
      const oldestEntry = await Commit.findOne({
        order: [["createdAt", "ASC"]],
      });
      const oldestEntryDate = oldestEntry
        ? oldestEntry.createdAt.toISOString()
        : null;
      const totalAddresses = await Commit.count({
        distinct: true,
        col: "address",
      });

      return {
        difficulty,
        currentTime: new Date().toISOString(),
        totalEntries,
        totalAddresses,
        oldestEntryDate,
      };
    },
  },
  Mutation: {
    createCommit: async (_, args) => {
      const address = publicKeyToAddress(args.publicKey);

      if (!verifyCommit(args, difficulty)) {
        throw new Error(
          `Difficulty not met. Current difficulty is ${difficulty}`
        );
      }

      try {
        return await Commit.create({ ...args, address });
      } catch (error) {
        console.error("Error creating commit:", error);
        throw new Error("Failed to create commit");
      }
    },
  },
};

// Apollo Server setup
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async () => ({ sequelize }),
});

// Sync database and set interval for periodic tasks
sequelize.sync();
setInterval(deleteOldCommits, 24 * 60 * 60 * 1000);

// Start the server
server.listen({ port }).then(({ url }) => {
  console.log(`🚀 Server ready at ${url}`);
});
