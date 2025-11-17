FROM node:20-slim

WORKDIR /usr/src/app

# package.json 및 의존성 설치 (npm install)
COPY package*.json ./
RUN npm install

# 서버 코드 복사
COPY . .

EXPOSE 3001
CMD ["node", "server.js"]