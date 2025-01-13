FROM icr.io/appcafe/open-liberty:kernel-slim-java17-openj9-ubi

COPY /src/main/liberty/config /config

RUN features.sh

COPY target/*.war /config/apps

RUN configure.sh
