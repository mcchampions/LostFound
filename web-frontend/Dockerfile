FROM node:22-alpine AS builder
WORKDIR /app

# 构建时通过 --build-arg 指定后端地址
# 同源部署（默认）：留空，浏览器经本 Nginx 访问 /api、/uploads、/ws
# 分拆部署：填浏览器可访问的后端公开地址
ARG VITE_SERVER_BASE=http://localhost:8080
ENV VITE_SERVER_BASE=${VITE_SERVER_BASE}

COPY package.json ./
RUN yarn config set registry https://registry.npmmirror.com
RUN yarn install

COPY . .
RUN yarn build

FROM nginx:alpine
# 后端上游地址（必改）：前后端分机部署时填后端机器地址，
# 如 http://192.168.1.10:8080 或 http://api.example.com:8080
ARG BACKEND_UPSTREAM=http://your-backend-host:8080
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN sed -i "s|__BACKEND_UPSTREAM__|${BACKEND_UPSTREAM}|g" /etc/nginx/conf.d/default.conf

EXPOSE 80
