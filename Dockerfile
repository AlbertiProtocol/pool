# Use the official Node.js 20 image as a base for ARM64
FROM node:slim

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install the dependencies
RUN npm ci

# Copy the rest of the application code to the working directory
COPY . .

# Install aria2 (if needed)
RUN apt-get update && apt-get install -y git curl

# Expose the required ports for aria2c and the Telegram bot
EXPOSE 4000

# Run the application
CMD ["node", "app.js"]
