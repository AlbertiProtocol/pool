#!/usr/bin/env node

// Imports
const { ApolloServer, gql } = require("apollo-server");
const { Sequelize, DataTypes, Op } = require("sequelize");
const GraphQLJSON = require("graphql-type-json");

const { verifyCommit } = require("@albertiprotocol/sdk");

// Configurations
const difficulty = parseInt(process.env.ALBERTI_DIFFICULTY) || 3;
const port = parseInt(process.env.ALBERTI_PORT) || 4000;
const databaseUrl = process.env.ALBERTI_DATABASE_URL;

// Database setup
const sequelize = new Sequelize(
  databaseUrl || {
    dialect: "sqlite",
    storage: "./data/commits.db",
    logging: false,
  }
);

// Commit model definition
const Commit = sequelize.define(
  "Commit",
  {
    data: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    nonce: {
      type: DataTypes.INTEGER,
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
  },
  {
    timestamps: true,
  }
);

// GraphQL schema definition
const typeDefs = gql`
  scalar JSON

  type ServerInfo {
    difficulty: Int!
    currentTime: String!
    totalEntries: Int!
    totalUsers: Int!
    oldestEntryDate: String
  }

  type Commit {
    data: JSON
    type: String!
    nonce: Int!
    publicKey: String!
    signature: String!
    createdAt: String!
    updatedAt: String!
  }

  type Query {
    serverInfo: ServerInfo!
    getRandomCommit: Commit
    getCommit(signature: String!): Commit
    getCommits(page: Int!, perPage: Int!): [Commit]
    getCommitsByUser(publicKey: String!, page: Int!, perPage: Int!): [Commit]
    getCommitsByParent(signature: String!): [Commit]
    getUsers: [String]
  }

  type Mutation {
    createCommit(
      data: JSON
      type: String!
      nonce: Int!
      publicKey: String!
      signature: String!
    ): Commit
  }
`;

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

    getCommitsByParent: async (_, { signature }) => {
      const commits = await Commit.findAll({
        where: { type: "post" },
      });

      if (commits.length === 0) {
        return [];
      }

      const childCommits = commits.filter(
        (commit) => commit.data.signature === signature
      );

      return childCommits;
    },

    getCommitsByUser: async (_, { publicKey, page, perPage }) => {
      const offset = (page - 1) * perPage;

      const commits = await Commit.findAll({
        where: { publicKey },
        limit: perPage,
        offset,
        order: [["createdAt", "DESC"]],
      });

      return commits;
    },

    getUsers: async () => {
      const uniqueUsers = await Commit.findAll({
        attributes: [
          [sequelize.fn("DISTINCT", sequelize.col("publicKey")), "publicKey"],
        ],
      });

      return uniqueUsers.map((commit) => commit.publicKey);
    },

    serverInfo: async () => {
      const totalEntries = await Commit.count();

      const oldestEntry = await Commit.findOne({
        order: [["createdAt", "ASC"]],
      });

      const oldestEntryDate = oldestEntry
        ? oldestEntry.createdAt.toISOString()
        : null;

      const totalUsers = await Commit.count({
        distinct: true,
        col: "publicKey",
      });

      return {
        difficulty,
        currentTime: new Date().toISOString(),
        totalEntries,
        totalUsers,
        oldestEntryDate,
      };
    },
  },
  Mutation: {
    createCommit: async (_, args) => {
      if (!verifyCommit(args, difficulty)) {
        throw new Error(
          `Difficulty not met, Current difficulty is ${difficulty}`
        );
      }

      try {
        return await Commit.create({ ...args });
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

// Sync database and start the server
sequelize.sync().then(() => {
  server.listen({ port }).then(({ url }) => {
    console.log(`🚀 Server ready at ${url}`);
  });
});

// Delete entries older than 1 year
setInterval(async () => {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  await Commit.destroy({
    where: {
      createdAt: {
        [Op.lt]: oneYearAgo,
      },
    },
  });
}, 1000 * 60 * 60 * 24); // 24 hours
