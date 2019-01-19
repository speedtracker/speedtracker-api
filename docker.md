# Build

    docker build -t andresvidal/speedtracker-api .

## Build on ARM devices

Clone Git repo locally:

    git clone https://github.com/andresvidal/speedtracker-api.git
    
and run:

    docker build -f arm32v7.Dockerfile -t andresvidal/speedtracker-api:arm32v7 .

# Run

## With inline config:

    docker run -it --rm \
    --name speedtracker-api \
    -p 8089:8089 \
    -e "PORT=8089" \
    -e "WPT_KEY=..." \
    -e "GITHUB_TOKEN=..." \
    -e "PAGESPEED_API_KEY=..." \
    -e "MONGODB_URI=..." \
    andresvidal/speedtracker-api:latest

## With local config file:

    docker run -it --rm \
    --name speedtracker-api \
    -v `pwd`:/app \
    -p 8089:8089 \
    andresvidal/speedtracker-api:latest

## On ARM32 devices as a Daemon:

    docker run -d \
    --name speedtracker-api \
    --restart=unless-stopped \
    -p 8089:8089 \
    -e "PORT=8089" \
    -e "WPT_KEY=..." \
    -e "GITHUB_TOKEN=..." \
    -e "PAGESPEED_API_KEY=..." \
    -e "MONGODB_URI=..." \
    andresvidal/speedtracker-api:arm32v7

## Interactive session:

    docker exec -it speedtracker-api bash

# Test 

    http://<server-ip>:8089/v1/test/{USERNAME}/{REPOSITORY}/{BRANCH}/{PROFILE}?key={KEY}