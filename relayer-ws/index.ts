import { WebSocketServer, WebSocket } from 'ws';

// Relayer WebSocket port
const wss = new WebSocketServer({ port: 3001 });

// All WebSocket servers connected to the relayer
const servers: WebSocket[] = [];

wss.on('connection', (ws) => {
    servers.push(ws);

    ws.on('error', (error) => {
        console.error('Relayer connection error:', error);
    });

    ws.on('message', (data) => {
        // Forward the message to every other connected server
        servers.forEach((socket) => {
            if (
                socket !== ws &&
                socket.readyState === WebSocket.OPEN
            ) {
                socket.send(data);
            }
        });
    });

    ws.on('close', () => {
        // Remove disconnected servers
        const index = servers.indexOf(ws);

        if (index !== -1) {
            servers.splice(index, 1);
        }
    });
});

console.log('Relayer running on port 3001');