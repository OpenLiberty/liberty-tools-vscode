FROM icr.io/appcafe/open-liberty:kernel-slim-java17-openj9-ubi
COPY --chown=1001:0 /src/main/liberty/config /config
COPY --chown=1001:0 target/*.war /config/apps
USER 1001
RUN features.sh
RUN configure.sh
