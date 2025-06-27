# ===============================
# Stage 1 — Build the frontend
# ===============================
FROM node:20-slim AS builder

# Set working directory inside container
WORKDIR /app

# Copy dependency definitions and install them
COPY package*.json ./
RUN npm ci

# Copy source files and build the Vite app
COPY . .
RUN npm run build


# ===============================
# Stage 2 — Serve the static site
# ===============================
FROM node:20-slim

# Install the lightweight static file server
RUN npm install -g serve

# Set working directory for final image
WORKDIR /app

# Copy only the built output from the builder
COPY --from=builder /app/dist ./dist

# Expose the same port as in docker-compose
EXPOSE 3000

# Run the server on port 3000 in SPA mode
CMD ["serve", "-s", "dist", "-l", "3000"]
