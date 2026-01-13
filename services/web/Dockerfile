# Stage 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /app

# Build-time environment variables for Vite
ARG VITE_API_BASE
ARG VITE_TELEGRAM_BOT_USERNAME
ARG VITE_CLARITY_PROJECT_ID
ENV VITE_API_BASE=${VITE_API_BASE}
ENV VITE_TELEGRAM_BOT_USERNAME=${VITE_TELEGRAM_BOT_USERNAME}
ENV VITE_CLARITY_PROJECT_ID=${VITE_CLARITY_PROJECT_ID}

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:alpine

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config if needed (optional for MVP, using default for now which serves index.html)
# A simple config to support SPA routing (fallback to index.html) is recommended
RUN echo 'server { \
    listen 80; \
    location / { \
    root /usr/share/nginx/html; \
    index index.html index.htm; \
    try_files $uri $uri/ /index.html; \
    } \
    }' > /etc/nginx/conf.d/default.conf

EXPOSE 80

# Copy entrypoint script
COPY entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Start Nginx via entrypoint
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
