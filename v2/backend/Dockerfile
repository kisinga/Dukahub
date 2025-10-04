FROM node:22-alpine

WORKDIR /usr/src/app

# Copy package files and install all dependencies (including devDependencies)
COPY package*.json ./
RUN npm ci

# Copy the rest of the application source code
COPY . .

# Build the application (no .env needed at build time)
RUN npm run build

# Environment variables will be provided at runtime via docker-compose
# or via -e flags when running the container

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["npm", "run", "start"]
