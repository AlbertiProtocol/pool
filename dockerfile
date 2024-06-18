FROM node:lts-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 4000

VOLUME /app/data

CMD ["npm", "start"]
