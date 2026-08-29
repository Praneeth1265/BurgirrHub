# Single-image build of all six services, for Render's free tier.
#
# docker-compose.yml assumes six containers plus Mongo/Redis/RabbitMQ.
# Render's free plan gives one web service with 512 MB, so this packs the
# six Node processes into one image and moves the three infrastructure
# containers out to managed free tiers (MongoDB Atlas, Upstash, CloudAMQP).
# See DEPLOYMENT_RENDER.md.
#
# Measured steady-state footprint of the six processes is ~154 MB, so 512 MB
# is comfortable rather than tight.
#
# No service code changes: each process still runs its own src/server.js on
# its own port, and the Gateway proxies over loopback exactly as it proxies
# over the Docker network under compose (its config.js already defaults to
# localhost:4001-4005). start.js is the supervisor.
#
# Build context is services/ -- set Root Directory to `services` in Render.

FROM node:20-alpine

WORKDIR /app

# Dependencies first, one layer per service, so editing one service's source
# doesn't reinstall all six on the next deploy.
COPY auth-service/package*.json ./auth-service/
RUN cd auth-service && npm ci --omit=dev

COPY reservation-service/package*.json ./reservation-service/
RUN cd reservation-service && npm ci --omit=dev

COPY order-service/package*.json ./order-service/
RUN cd order-service && npm ci --omit=dev

COPY payment-service/package*.json ./payment-service/
RUN cd payment-service && npm ci --omit=dev

COPY notification-service/package*.json ./notification-service/
RUN cd notification-service && npm ci --omit=dev

COPY gateway/package*.json ./gateway/
RUN cd gateway && npm ci --omit=dev

# Then the sources.
COPY auth-service/src ./auth-service/src
COPY reservation-service/src ./reservation-service/src
COPY order-service/src ./order-service/src
COPY payment-service/src ./payment-service/src
COPY notification-service/src ./notification-service/src
COPY gateway/src ./gateway/src

COPY render/start.js ./start.js

# Render injects PORT and expects the service to listen on it; start.js
# hands that port to the Gateway and gives the other five fixed loopback
# ports.
CMD ["node", "start.js"]
