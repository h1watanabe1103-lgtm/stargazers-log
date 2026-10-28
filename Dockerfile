# 画面（React + Vite）を、ビルドして、nginx で配信する
# 1段目：ビルド（Node.js）。2段目：できた静的ファイルだけを nginx に載せる

# ---- 1段目：ビルド ----
FROM node:24-alpine AS build
WORKDIR /app

# 依存パッケージだけを先に入れる（package.json が変わらなければ、キャッシュが使われる）
COPY package.json package-lock.json ./
RUN npm ci

# ソースをコピーして、ビルドする
COPY . .

# APIのURL。ブラウザーから見たURLを渡す（compose.yaml の build.args で上書きされる）
ARG VITE_API_URL=http://localhost:8080
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ---- 2段目：配信 ----
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
