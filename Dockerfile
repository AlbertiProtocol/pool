FROM node:slim

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN apt-get update && apt-get install -y git curl

EXPOSE 4000

CMD ["node", "app.js"]
