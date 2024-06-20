const { ApolloServer, gql } = require("apollo-server");

const { Sequelize, DataTypes } = require("sequelize");

const GraphQLJSON = require("graphql-type-json");

const { publicKeyToAddress, verifyCommit } = require("@albertiprotocol/sdk");

const difficulty = process.env.ALBERTI_DIFFICULTY || 5;

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "./data/commits.db",
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

const deleteOldCommits = async () => {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  await Commit.destroy({
    where: {
      updatedAt: {
        [Sequelize.Op.lt]: oneYearAgo,
      },
    },
  });

  console.log("Old commits deleted successfully");
};

// db init
sequelize.sync();
setInterval(deleteOldCommits, 24 * 60 * 60 * 1000);

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

const resolvers = {
  JSON: GraphQLJSON,
  Query: {
    getRandomCommit: async () => {
      return await Commit.findOne({
        order: sequelize.random(),
      });
    },

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

      const datares = await Commit.findAll({
        where: { address },
        limit: perPage,
        offset: offset,
        order: [["createdAt", "DESC"]],
      });

      if (datares.length == 0) {
        return await Commit.findAll({
          where: { publicKey: address },
          limit: perPage,
          offset: offset,
          order: [["createdAt", "DESC"]],
        });
      }

      return datares;
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

server
  .listen({
    port: process.env.PORT || 4000,
  })
  .then(({ url }) => {
    console.log(`🚀 Server ready at ${url}`);
  });
