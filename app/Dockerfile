# syntax=docker/dockerfile:1

FROM node:19-alpine

WORKDIR /app

COPY *.json ./

RUN npm install

COPY *.ts ./

COPY *.html ./

COPY public ./public/

COPY src ./src/

EXPOSE 5173

CMD [ "npm", "run", "hosts"]
