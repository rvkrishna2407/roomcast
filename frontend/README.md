# RoomCast frontend

The frontend uses React, TypeScript, and Vite. Pages live in `src/pages`,
reusable UI lives in `src/components`, and API/session helpers live in
`src/services`. It uses the existing authentication API and authenticated
WebSocket chat service.

## Configure

Copy `.env.example` to `.env.local` if the backend is not using its default
addresses:

```env
VITE_AUTH_API_URL=http://localhost:3002/api/users
VITE_CHAT_WS_URL=ws://localhost:8080
```

These are public service URLs, not secrets. Do not put database credentials or
the auth signing secret in a frontend environment file.

## Run

Install dependencies and start the frontend:

```bash
bun install
bun run dev
```

Open `http://localhost:5173`. Run MongoDB and both backend services as well:

- `user-ws`: WebSocket chat on port `8080` and auth API on port `3002`
- `relayer-ws`: WebSocket relay on port `3001`

In `user-ws/.env`, configure `MONGODB_URI` and set `AUTH_TOKEN_SECRET` to a
private random value of at least 32 bytes. The defaults for `AUTH_PORT`,
`PORT`, and `FRONTEND_ORIGIN` match the frontend URLs above.

Accounts are created in MongoDB by signup. Sign in with that account to enter
RoomCast, then join a room or open the same room chat composer from the home
screen. Chat messages are relayed live and are not stored in MongoDB.
Room names must start with a letter, be 4–20 characters long, and contain only
letters, numbers, `@`, or hyphens. Joined room names are remembered in the
current browser tab; they are rejoined when its chat connection is reopened.
The chat composer can send image-only JPG/JPEG and PNG messages up to 5 MB.
Images are validated by the chat service and relayed live; neither images nor
chat history are saved in MongoDB.
Messages and image attachments are cached in this browser's IndexedDB so they
remain visible after a page refresh. Signing out clears that account's local
chat history; no message history is sent to the backend database.

Run `bun run typecheck` and `bun run build` before deployment. In production,
set `VITE_AUTH_API_URL` and `VITE_CHAT_WS_URL` to the deployed service URLs at
frontend build time.
