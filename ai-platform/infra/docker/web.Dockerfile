FROM node:22-slim

WORKDIR /app
COPY package.json /app/package.json
COPY apps/web /app/apps/web
COPY packages/shared-types /app/packages/shared-types
COPY packages/ui /app/packages/ui
RUN npm install
CMD ["npm", "--workspace", "apps/web", "run", "dev"]

