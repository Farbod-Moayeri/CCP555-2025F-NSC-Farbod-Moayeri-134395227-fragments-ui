# ---------- Stage 1: Build ----------
FROM node:20-alpine AS build

WORKDIR /app

# Copy package.json first for caching
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build static assets (if using Vite, React, etc.)
RUN npm run build

# ---------- Stage 2: Run ----------
FROM nginx:alpine AS production

# Copy built static site to nginx html directory
COPY --from=build /app/dist /usr/share/nginx/html

# Copy optional custom nginx config (if you have one)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 1234 for serving
EXPOSE 1234

CMD ["nginx", "-g", "daemon off;"]

# docker build -t farbod678/fragments-ui:latest .
# docker login
# docker push farbod678/fragments-ui:latest
# docker run -p 1234:80 --env VITE_API_URL=http://localhost:8080 farbod678/fragments-ui