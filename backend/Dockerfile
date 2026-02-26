# Node webapp: API + static frontend. Forced linux/amd64 for Windows Docker Desktop.
FROM --platform=linux/amd64 node:20-alpine

WORKDIR /app

COPY backend/package.json ./backend/package.json
RUN cd backend && npm install --no-fund --no-audit

COPY backend/src ./backend/src
COPY frontend ./frontend

EXPOSE 3000
CMD ["node", "backend/src/index.js"]