FROM node:22-alpine AS builder
WORKDIR /app

# 构建时通过 --build-arg 指定后端地址
ARG VITE_SERVER_BASE=http://localhost:8080
ENV VITE_SERVER_BASE=${VITE_SERVER_BASE}

COPY package.json ./
RUN yarn config set registry https://registry.npmmirror.com
RUN yarn install

COPY . .
RUN yarn build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
