# Deploying Backend to Vercel

This backend is configured to deploy on Vercel using Docker containers.

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

## Docker Deployment

Vercel will automatically detect the `Dockerfile` and build a Docker container. The container:
- Uses Node.js 18
- Exposes port 8080
- Runs `npm start` on container start

## Notes

- WebSocket connections are supported through Vercel's Docker container platform
- Make sure your PostgreSQL database allows connections from Vercel's IP ranges
- SSL is automatically enabled for cloud PostgreSQL connections
