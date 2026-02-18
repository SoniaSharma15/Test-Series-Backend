# ---- Base image (small & fast) ----
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy only package files first (better caching)
COPY package*.json ./

# Install dependencies (production only)
RUN npm install --omit=dev

# Copy project source
COPY . .

# Expose backend port (change if yours is different)
EXPOSE 5000

# Start server
CMD ["node", "src/server.js"]
