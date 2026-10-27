# user-ws

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

## Authentication setup

Copy `.env.example` to `.env`, set `MONGODB_URI` to your MongoDB connection
string, and replace `AUTH_TOKEN_SECRET` with a private random value of at least
32 bytes. Bun loads values from `.env` automatically.

The auth API runs on port `3002` by default:

- `POST /api/users/signup` accepts `{ "name", "email", "password" }` and
  creates the user with a hashed password and returns a token.
- `POST /api/users/signin` accepts `{ "email", "password" }` and returns a
  token when the password matches.

Both successful signup and signin return a signed token. The frontend should
store the returned token and connect to the
WebSocket server using `ws://localhost:8080/?token=<encoded-token>`. The token
expires after one hour. Configure `FRONTEND_ORIGIN` to the frontend's origin.

When running multiple `user-ws` instances on one machine, set a different
`PORT` and `AUTH_PORT` for each instance, while keeping the same MongoDB
database and `AUTH_TOKEN_SECRET`.
