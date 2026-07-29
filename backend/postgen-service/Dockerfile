FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm config set registry https://registry.npmmirror.com/
RUN npm install
COPY template-overrides/xhs-note.js ./node_modules/postgen2/dist/templates/xhs-note.js
COPY template-overrides/xhs-note-green.js ./node_modules/postgen2/dist/templates/xhs-note-green.js
COPY template-overrides/xhs-quote-blue.js ./node_modules/postgen2/dist/templates/xhs-quote-blue.js
COPY template-overrides/xhs-date-note.js ./node_modules/postgen2/dist/templates/xhs-date-note.js
COPY server.js .
EXPOSE 3000
ENTRYPOINT ["node", "server.js"]
