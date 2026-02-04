# Deploying Backend to Railway

Railway supports Docker containers and persistent WebSocket connections, making it perfect for this WebSocket-based game backend.

## Prerequisites

1. A Railway account (sign up at https://railway.app)
2. Railway CLI installed (optional): `npm i -g @railway/cli`

## Deployment Steps

### Option 1: Deploy via Railway Dashboard (Recommended)

1. **Create a New Project**
   - Go to https://railway.app
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Connect your GitHub account and select the repository
   - Select the `backend` folder as the root directory

2. **Add PostgreSQL Database**
   - In your Railway project, click "New" → "Database" → "Add PostgreSQL"
   - Railway will automatically create a PostgreSQL database
   - Railway will automatically inject `DATABASE_URL` environment variable

3. **Set Environment Variables** (if needed)
   - Go to your service settings
   - Add any additional environment variables:
     - `PORT`: `8080` (optional, defaults to 8080)
     - `KAFKA_BROKER`: (optional) Kafka broker address
     - `KAFKA_TOPIC`: (optional) Kafka topic name

4. **Deploy**
   - Railway will automatically detect the `Dockerfile` and deploy
   - The service will be available at `https://your-service-name.up.railway.app`

### Option 2: Deploy via Railway CLI

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
cd backend
railway init

# Link to existing project or create new one
railway link

# Add PostgreSQL database
railway add postgresql

# Deploy
railway up
```

## Getting Your Backend URL

After deployment, Railway will provide a URL like:
- `https://your-backend-name.up.railway.app`

Use this URL to update your frontend configuration.

## Database Connection

Railway automatically:
- Creates a PostgreSQL database
- Provides `DATABASE_URL` environment variable
- Handles SSL connections automatically
- The backend will automatically create the schema on first run

## Environment Variables

Railway automatically provides:
- `DATABASE_URL`: PostgreSQL connection string with SSL
- `PORT`: Port number (Railway sets this automatically)
- `RAILWAY_ENVIRONMENT`: Environment name
- `RAILWAY_PUBLIC_DOMAIN`: Your public domain

## Updating Frontend

After deploying to Railway, update your frontend's `vercel.json` or environment variables:

```json
{
  "env": {
    "VITE_BACKEND_URL": "https://your-backend-name.up.railway.app"
  }
}
```

Or set `VITE_BACKEND_URL` in Vercel dashboard.

## Benefits of Railway

✅ Supports Docker containers natively
✅ Persistent WebSocket connections work perfectly
✅ Automatic PostgreSQL database provisioning
✅ Easy environment variable management
✅ Automatic HTTPS/SSL
✅ Free tier available
