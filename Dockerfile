# syntax=docker/dockerfile:1

FROM node:19-alpine


WORKDIR /server

COPY package*.json .

RUN mkdir database

RUN npm install

COPY *.js .

EXPOSE 8060

CMD ["npm", "run", "start"]