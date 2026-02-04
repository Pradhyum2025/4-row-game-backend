# Deploying Backend to Fly.io

Fly.io is perfect for WebSocket applications as it supports Docker containers and persistent connections.

## Prerequisites

1. A Fly.io account (sign up at https://fly.io)
2. Fly CLI installed: `curl -L https://fly.io/install.sh | sh`
   - Or on Windows: `powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"`

## Quick Start

### 1. Login to Fly.io

```bash
fly auth login
```

### 2. Navigate to Backend Directory

```bash
cd backend
```

### 3. Initialize Fly.io App

```bash
fly launch
```

This will:
- Detect your Dockerfile
- Ask for app name (or use default)
- Ask for region (choose closest to your users)
- Create `fly.toml` if it doesn't exist

**Note**: If `fly.toml` already exists, you can skip this step.

### 4. Add PostgreSQL Database

Fly.io offers managed PostgreSQL:

```bash
# Create PostgreSQL database
fly postgres create --name 4-row-game-db

# Attach database to your app
fly postgres attach 4-row-game-db
```

This automatically sets the `DATABASE_URL` environment variable.

### 5. Set Environment Variables (Optional)

```bash
# Set additional environment variables
fly secrets set KAFKA_BROKER=your-kafka-broker
fly secrets set KAFKA_TOPIC=game-events
```

Or set them in the Fly.io dashboard:
- Go to your app → Settings → Secrets
- Add environment variables

### 6. Deploy

```bash
fly deploy
```

### 7. Get Your App URL

After deployment, Fly.io will provide a URL like:
- `https://4-row-game-backend.fly.dev`

Use this URL to update your frontend configuration.

## Configuration Files

### `fly.toml`
- App name: `4-row-game-backend`
- Port: `8080`
- Health check: `/health` endpoint
- Auto-scaling: Enabled (starts/stops machines as needed)
- Region: `iad` (Washington, D.C.) - change in `fly.toml` if needed

### `Dockerfile`
- Uses Node.js 18
- Exposes port 8080
- Runs `npm start`

## Environment Variables

Fly.io automatically provides:
- `DATABASE_URL`: Set when you attach PostgreSQL database
- `PORT`: Set to 8080 (configured in fly.toml)
- `FLY_APP_NAME`: Your app name
- `FLY_REGION`: Deployment region

You can set additional variables:
- `KAFKA_BROKER`: Kafka broker address
- `KAFKA_TOPIC`: Kafka topic name

## Updating Frontend

After deploying to Fly.io, update your frontend's `vercel.json`:

```json
{
  "env": {
    "VITE_BACKEND_URL": "https://4-row-game-backend.fly.dev"
  }
}
```

Or set `VITE_BACKEND_URL` in Vercel dashboard.

## Useful Fly.io Commands

```bash
# View logs
fly logs

# SSH into your app
fly ssh console

# Scale your app
fly scale count 2  # Run 2 instances

# View app status
fly status

# Open app in browser
fly open

# View environment variables
fly secrets list
```

## Benefits of Fly.io

✅ Full Docker container support
✅ Persistent WebSocket connections work perfectly
✅ Global edge network (low latency)
✅ Auto-scaling (starts/stops based on traffic)
✅ Managed PostgreSQL available
✅ Free tier available
✅ Great for WebSocket applications

## Troubleshooting

### WebSocket Connection Issues

Fly.io fully supports WebSocket connections. If you have issues:
1. Check that your app is running: `fly status`
2. Check logs: `fly logs`
3. Verify the WebSocket URL uses `wss://` (not `ws://`)

### Database Connection Issues

1. Verify database is attached: `fly postgres list`
2. Check `DATABASE_URL` is set: `fly secrets list`
3. Ensure database allows connections from Fly.io IPs

### Port Issues

- Fly.io automatically maps port 8080
- Make sure your app listens on `0.0.0.0` (already configured)
- Check `internal_port` in `fly.toml` matches your app's port

## Scaling

Fly.io supports auto-scaling. To manually scale:

```bash
# Scale to 2 instances
fly scale count 2

# Scale memory
fly scale memory 512

# Scale CPU
fly scale vm shared-cpu-2x
```

## Monitoring

- View logs: `fly logs`
- Monitor metrics: `fly dashboard`
- Check app status: `fly status`
