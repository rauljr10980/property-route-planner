# Dockerfile for Google Cloud Run
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install --production

# Copy server code
COPY . .

# Expose port (Cloud Run sets PORT env var)
EXPOSE 8080

# Start server
CMD ["node", "index.js"]

