FROM node:slim

WORKDIR /app

# avoid package-lock.json since this can run on multi-platforms
COPY package.json ./

RUN apt-get update && apt-get install --no-install-recommends -y git && rm -rf /var/lib/apt/lists/*
RUN npm install --only=production && npm audit fix

COPY . .

EXPOSE 8089
CMD ["npm","start"]