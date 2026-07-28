FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm config set registry https://registry.npmmirror.com/
RUN npm install
COPY server.js .
EXPOSE 3000
ENTRYPOINT ["node", "server.js"]
