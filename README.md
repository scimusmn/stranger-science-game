# Illumination game
Communal shared-screen experience, controlled by smartphones, for the annual Illumination event.

## Deploy
Setup PM2 configuration

    cp pm2.example.json pm2-env.json

Modify the PORT value to match your server config.

Deploy using fabric:
    fab -H server.example.com deploy.app:server_user,server.example.com,/opt/node-apps/app_path,pm2-process-name

