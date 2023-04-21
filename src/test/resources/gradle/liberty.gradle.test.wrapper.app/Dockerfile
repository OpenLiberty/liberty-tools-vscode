FROM icr.io/appcafe/open-liberty:kernel-slim-java11-openj9-ubi
COPY --chown=1001:0  build/wlp/usr/servers/defaultServer/server.xml /config/
RUN features.sh