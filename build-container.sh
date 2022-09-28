#!/bin/bash

if [ -z "$1" ]
  then
    echo "Please specify the tag to build as argument #1. Use 'debug' to run the container and tail logs."
    exit 1
fi

NAME=fidc-logzio
TAG=$1

IMAGE=${NAME}:${TAG}
CONTAINER=${NAME}-${TAG}

docker stop ${CONTAINER}
docker rm ${CONTAINER}

docker rmi ${IMAGE}

docker build --tag ${IMAGE} .
docker images ; echo

if [ "${TAG}" == "debug" ]
    then
        docker run -d -v "$(pwd)"/.env:/tmp/.env --name ${CONTAINER} ${IMAGE}
        docker ps ; echo

        echo "Hit Ctrl-C to exit log tail."
        docker logs -f ${CONTAINER}
fi