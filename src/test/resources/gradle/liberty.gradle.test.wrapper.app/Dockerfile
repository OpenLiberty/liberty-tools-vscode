FROM icr.io/appcafe/open-liberty:kernel-slim-java17-openj9-ubi
COPY build/wlp/usr/servers/defaultServer/server.xml /config/
RUN features.sh
