FROM node:18-alpine

WORKDIR /app

# Copy package.json files for both main app and Next.js app
COPY package*.json ./
COPY src/web/package*.json ./src/web/

# Install dependencies for main app
RUN npm install

# Install dependencies for Next.js app
WORKDIR /app/src/web
RUN npm install
WORKDIR /app

# Copy the rest of the application
COPY . .

# Build Next.js application
WORKDIR /app/src/web
RUN npm run build
WORKDIR /app

# Build TypeScript files for main app (excluding Next.js files)
RUN npm run build

# Ensure the public directory is copied to the dist directory
RUN mkdir -p dist/src/public
RUN cp -r src/public/* dist/src/public/

# Copy Next.js build output to a location that can be served
RUN mkdir -p dist/src/web-ui
RUN cp -r src/web/.next dist/src/web-ui/
RUN cp -r src/web/public dist/src/web-ui/

# Install marked package for markdown processing (for blog post scheduler)
RUN npm install marked

# Set environment variables (these can be overridden at runtime)
ENV NODE_ENV=production

# Start the application
CMD ["node", "dist/src/index.js"]
