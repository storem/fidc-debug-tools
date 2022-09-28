FROM node:alpine

WORKDIR /tmp/

RUN npm install npm
RUN npm install dotenv --save
RUN npm install logzio-nodejs --save

#COPY .env /tmp/
COPY package-lock.json /tmp/
COPY package.json /tmp/
COPY tail.js /tmp/
COPY tail_fidc /tmp/

RUN chmod a+x /tmp/tail_fidc

CMD [ "tail_fidc" ]
