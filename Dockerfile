FROM node:18-alpine

WORKDIR /app

# Install build tools for native modules (sqlite3)
RUN apk add --no-cache python3 make g++ sqlite

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies (including devDependencies needed for build)
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Create directories for persistent data and temporary downloads
RUN mkdir -p data downloads

# Expose port (used only in webhook mode)
EXPOSE 3000

# Start the bot
CMD ["npm", "start"]
