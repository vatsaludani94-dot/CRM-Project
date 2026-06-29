FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

EXPOSE 3000

ENV PORT=3000
ENV MONGO_URI=mongodb://mongodb:27017/crm_nexus
ENV JWT_SECRET=nexus_secret_key_jwt_authentication_2026

CMD ["npm", "start"]
