FROM node:18-alpine

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Build TypeScript files
RUN npm run build

# Set environment variables (these can be overridden at runtime)
ENV NODE_ENV=production

# Start the application
CMD ["node", "dist/src/index.js"]
