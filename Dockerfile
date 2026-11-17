FROM node:20-alpine
WORKDIR /opt/glh
RUN apk add --no-cache unzip
COPY GLH_Render_Deploy_Package_0.1.1-1.zip /tmp/glh-deploy.zip
RUN unzip -q /tmp/glh-deploy.zip -d /opt/glh && rm /tmp/glh-deploy.zip
WORKDIR /opt/glh/GLH_Source_MVP/server
RUN npm install --omit=dev && npx prisma generate
ENV NODE_ENV=production
EXPOSE 4000
CMD ["sh", "-c", "npx prisma db push && node prisma/seed.js && node src/index.js"]
