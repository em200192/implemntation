FROM node:20-alpine

WORKDIR /app

COPY package.json ./

RUN npm install

COPY src ./src
COPY migrations ./migrations
COPY seeds ./seeds

ENV NODE_ENV=production

EXPOSE 4000

CMD ["node", "src/server.js"]
