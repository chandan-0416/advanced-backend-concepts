FROM node

WORKDIR /app

COPY package*.json .
# COPY package.json package.json , package se start hone wali sare file ko copy karo aur working ditrectory me dal do
# COPY package-lock.json package-lock.json
RUN npm install

# COPY index.js index.js

COPY . .

CMD ["node", "index.js"]