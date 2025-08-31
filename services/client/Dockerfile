# Development Dockerfile for React PWA App
# Base image - using Node 16 for better compatibility
FROM node:16-alpine

# Set working directory
WORKDIR /usr/src/app

# Add `/usr/src/app/node_modules/.bin` to $PATH
ENV PATH=/usr/src/app/node_modules/.bin:$PATH

# Install app dependencies
# Copy package files first for better Docker layer caching
COPY package.json /usr/src/app/package.json
COPY package-lock.json /usr/src/app/package-lock.json

# Install dependencies with legacy peer deps for compatibility
RUN npm install --legacy-peer-deps --silent

# Install react-scripts globally
RUN npm install react-scripts@5.0.1 -g --silent

# Enable polling for file watching in Docker (for auto-reload)
ENV CHOKIDAR_USEPOLLING=true

# Expose port 3000
EXPOSE 3000

# Start the development server
CMD ["npm", "start"]
