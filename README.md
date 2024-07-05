## Alberti Protocol Pool

Alberti Protcol Pool is a graphQL endpoint.

### Getting Started

Install A Development Build 

```
// install pool
npm install -g github:AlbertiProtocol/pool

// run pool
npx albertipool
```

Install A Production Build 

```
docker run -d -p 4000:4000 --name albertipool --restart unless-stopped ghcr.io/albertiprotocol/pool:main
```
 
## Usage

Once the server is running, you can access the API at `http://localhost:4000`.
