# syntax=docker/dockerfile:1

ARG NODE_VERSION=20.16.0
FROM node:${NODE_VERSION}-alpine

# Set working directory
WORKDIR /app

# Install system dependencies (like ffmpeg) as root
RUN apk add --no-cache ffmpeg

# Copy package files first
COPY package*.json ./

# Install dependencies (remove --omit=dev if your start script relies on devDependencies, 
# or ensure all runtime packages are under regular "dependencies")
RUN npm install

# Copy the rest of the application files
COPY . .

# Change ownership of the app directory to the non-root 'node' user so it has permissions to run
RUN chown -R node:node /app

# Switch to the non-root user
USER node

# Expose the port your app listens on (matching your code's port 3600)
EXPOSE 3500

# Run the application
CMD ["npm", "start"]