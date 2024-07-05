# Alberti Protocol Pool

Alberti Protocol Pool is a decentralized data relay and storage implementation built around the Alberti Protocol. This pool serves as a foundational component for securely storing and retrieving information using blockchain-inspired techniques.

## Features

- **Secure Commitment System**: Utilizes a commitment system to ensure data integrity and authenticity.
- **GraphQL API**: Provides a GraphQL-based API for flexible and efficient data querying and manipulation.
- **Automatic Cleanup**: Implements automated deletion of entries older than one year to maintain database cleanliness.
- **Scalable**: Can be deployed in development or production environments with ease.

## Getting Started

### Installation

Install a development build:

```bash
npm install -g github:AlbertiProtocol/pool
```

Run the pool:

```bash
npx albertipool
```

Install a production build using Docker:

```bash
docker run -d -p 4000:4000 -e ALBERTI_DIFFICULTY=4 --name albertipool --restart unless-stopped ghcr.io/albertiprotocol/pool:main
```

### Usage

Once the server is running, access the API at `http://localhost:4000`.

## Configuration

### Environment Variables

- **ALBERTI_DIFFICULTY**: Sets the difficulty level for commit verification (default is 3).
- **ALBERTI_DATABASE_URL**: Specifies the database connection URL. If not provided, defaults to SQLite with a local file storage (`./data/commits.db`).

## API Documentation

### Server Info

Retrieve information about the server, including current settings and statistics.

### Queries

- **getRandomCommit**: Fetch a random commit from the database.
- **getCommit**: Retrieve a commit by its unique signature.
- **getCommits**: Get a list of commits with pagination support.
- **getCommitsByUser**: Fetch commits associated with a specific user.
- **getCommitsByParent**: Retrieve commits linked to a parent commit.
- **getUsers**: Get a list of unique user identifiers.

### Mutations

- **createCommit**: Create a new commit with specified data, type, nonce, public key, and signature.

## Contributing

Contributions are welcome! Fork the repository, make your changes, and submit a pull request. Please ensure code changes adhere to the project's coding standards.
