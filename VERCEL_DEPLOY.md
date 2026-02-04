# Deploying Backend to Vercel

⚠️ **Important Note**: Vercel is designed for serverless functions and static sites. **WebSocket servers with persistent connections are not well-supported** on Vercel's platform. For a WebSocket-based game backend, consider using:
- **Railway** (supports Docker containers and long-running processes)
- **Render** (supports Docker containers)
- **Fly.io** (supports Docker containers)
- **DigitalOcean App Platform** (supports Docker containers)
- **AWS ECS/Fargate** or **Google Cloud Run** (container platforms)

However, if you still want to deploy on Vercel, this configuration will deploy it as a Node.js application.

## Prerequisites

1. A Vercel account
2. A PostgreSQL database (Vercel Postgres, Supabase, Neon, or any PostgreSQL provider)
3. The `DATABASE_URL` environment variable set in Vercel

## Deployment Steps

### 1. Connect to Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. Login: `vercel login`
3. Link your project: `vercel link` (from the backend directory)

### 2. Set Environment Variables

In Vercel dashboard, go to your project settings and add:

- `DATABASE_URL`: Your PostgreSQL connection string (e.g., `postgresql://user:password@host:port/database?sslmode=require`)
- `PORT`: `8080` (optional, defaults to 8080)
- `KAFKA_BROKER`: (optional) Kafka broker address
- `KAFKA_TOPIC`: (optional) Kafka topic name

### 3. Deploy

```bash
vercel --prod
```

Or push to your connected Git repository and Vercel will auto-deploy.

## Database Connection

The backend automatically:
- Uses `DATABASE_URL` if provided
- Falls back to individual `PGUSER`, `PGPASSWORD`, `PGHOST`, `PGPORT`, `PGDATABASE` variables
- Enables SSL for cloud PostgreSQL connections
- Creates the database schema automatically on first run

## Limitations

- **WebSocket connections may not work reliably** on Vercel due to serverless architecture
- Long-running connections may timeout
- Consider using a platform that supports Docker containers for WebSocket servers

## Alternative: Use Docker on Railway/Render/Fly.io

For proper WebSocket support, deploy using Docker on platforms that support containers:
- Railway: Supports Dockerfiles natively
- Render: Supports Dockerfiles
- Fly.io: Supports Dockerfiles

The `Dockerfile` in this directory can be used on these platforms.
