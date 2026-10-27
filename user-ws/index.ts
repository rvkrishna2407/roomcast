import { WebSocketServer, WebSocket, type RawData } from 'ws';
import {
    getAuthDisplayName,
    startUserRoutes,
    verifyAuthToken,
} from './services/userRoute.ts';
import { isValidRoomName } from './services/roomName.ts';
import {
    addRoomMember,
    isRoomMember,
    removeMemberFromRooms,
} from './services/roomMembership.ts';
import { parseChatMessage } from './services/chatMessage.ts';

const port = Number(process.env.PORT || 8080);

await startUserRoutes();

const wss = new WebSocketServer({
    port,
    maxPayload: 7 * 1024 * 1024,
    verifyClient: (info, callback) => {
        const token = new URL(
            info.req.url || '/',
            'http://localhost'
        ).searchParams.get('token');

        if (!token) {
            callback(false, 401, 'Authentication required');
            return;
        }

        try {
            const isValid = verifyAuthToken(token);
            callback(
                isValid,
                isValid ? undefined : 401,
                isValid ? undefined : 'Invalid or expired token'
            );
        } catch (error) {
            console.error('WebSocket authentication error:', error);
            callback(false, 500, 'Authentication unavailable');
        }
    },
});

const rooms = new Map<string, Set<WebSocket>>();
const clientNames = new Map<WebSocket, string>();
const RELAYER_URL = 'ws://localhost:3001';
const relayerSocket = new WebSocket(RELAYER_URL);

function sendError(socket: WebSocket, message: string) {
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'error', message }));
    }
}

function parseJson(data: RawData): unknown {
    try {
        return JSON.parse(data.toString());
    } catch {
        return null;
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function broadcastToLocalRoom(roomName: string, message: string) {
    rooms.get(roomName)?.forEach((socket) => {
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(message);
        }
    });
}

relayerSocket.on('error', (error) => {
    console.error('Relayer connection error:', error);
});

relayerSocket.on('message', (data) => {
    const parsedData = parseJson(data);
    const chatMessage = parseChatMessage(parsedData);
    if (!chatMessage || !isValidRoomName(chatMessage.room)) {
        console.error('Relayer sent an invalid chat message');
        return;
    }

    broadcastToLocalRoom(chatMessage.room, JSON.stringify(chatMessage));
});

wss.on('connection', (socket, request) => {
    const token = new URL(
        request.url || '/',
        'http://localhost'
    ).searchParams.get('token');
    if (!token) {
        socket.close(1008, 'Authentication required');
        return;
    }

    socket.on('error', (error) => {
        console.error('Client connection error:', error);
    });

    const pendingMessages: RawData[] = [];
    let ready = false;

    socket.on('message', (data) => {
        if (!ready) {
            pendingMessages.push(data);
            return;
        }
        processClientMessage(socket, data);
    });

    void getAuthDisplayName(token)
        .then((displayName) => {
            if (socket.readyState !== WebSocket.OPEN) return;
            clientNames.set(socket, displayName);
            ready = true;
            pendingMessages.splice(0).forEach((data) => {
                processClientMessage(socket, data);
            });
        })
        .catch((error: unknown) => {
            console.error('Could not read authenticated display name:', error);
            socket.close(1011, 'Authentication unavailable');
        });

    socket.on('close', () => {
        ready = false;
        pendingMessages.length = 0;
        clientNames.delete(socket);
        removeMemberFromRooms(rooms, socket);
    });
});

function processClientMessage(socket: WebSocket, data: RawData) {
    const parsedData = parseJson(data);
    if (!isRecord(parsedData)) {
        sendError(socket, 'Message must be valid JSON.');
        return;
    }

    if (parsedData.type === 'join-room') {
        if (!isValidRoomName(parsedData.room)) {
            sendError(
                socket,
                'Room names must start with a letter and contain 4–20 letters, numbers, @, or hyphens.'
            );
            return;
        }

        addRoomMember(rooms, parsedData.room, socket);
        socket.send(JSON.stringify({
            type: 'room-joined',
            room: parsedData.room,
        }));
        return;
    }

    const chatMessage = parseChatMessage(parsedData);
    if (!chatMessage || !isValidRoomName(chatMessage.room)) {
        sendError(socket, 'Invalid chat message.');
        return;
    }

    if (!isRoomMember(rooms, chatMessage.room, socket)) {
        sendError(socket, 'Join this room before sending messages.');
        return;
    }

    const senderName = clientNames.get(socket);
    if (!senderName) {
        sendError(socket, 'Your account name could not be loaded. Reconnect and try again.');
        return;
    }

    const serializedMessage = JSON.stringify({
        ...chatMessage,
        senderName,
    });
    broadcastToLocalRoom(chatMessage.room, serializedMessage);

    if (relayerSocket.readyState === WebSocket.OPEN) {
        relayerSocket.send(serializedMessage);
    } else {
        console.error('Chat message was not relayed because the relay is unavailable.');
    }
}

console.log(`WebSocket server running on port ${port}`);
