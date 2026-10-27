import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import {
  addJoinedRoom,
  getAuthToken,
  getJoinedRooms,
  getSessionEmail,
} from '../services/session';
import {
  getChatHistory,
  saveChatMessage,
  type ChatHistoryMessage,
} from '../services/chatHistory';
import { isValidRoomName } from '../services/roomName';

type ChatMessage = ChatHistoryMessage;

const chatWsUrl = (
  import.meta.env.VITE_CHAT_WS_URL || 'ws://localhost:8080'
).replace(/\/+$/, '');
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function parseImageAttachment(
  value: unknown,
): ChatMessage['image'] | undefined {
  if (typeof value !== 'object' || value === null || !('mimeType' in value) ||
      !('dataUrl' in value) || typeof value.dataUrl !== 'string') {
    return undefined;
  }

  if (value.mimeType !== 'image/jpeg' && value.mimeType !== 'image/png') {
    return undefined;
  }

  return {
    mimeType: value.mimeType,
    dataUrl: value.dataUrl,
  };
}

export default function Chat() {
  const [searchParams] = useSearchParams();
  const requestedRoom = searchParams.get('room')?.trim() ?? '';
  const [rooms, setRooms] = useState(getJoinedRooms);
  const [activeRoom, setActiveRoom] = useState<string | null>(() => {
    if (requestedRoom && isValidRoomName(requestedRoom)) return requestedRoom;
    return getJoinedRooms()[0] ?? null;
  });
  const [messagesByRoom, setMessagesByRoom] = useState<Record<string, ChatMessage[]>>({});
  const [messageText, setMessageText] = useState('');
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const socketRef = useRef<WebSocket | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const messageListRef = useRef<HTMLOListElement | null>(null);
  const joinedOnSocket = useRef(new Set<string>());
  const ownMessageIds = useRef(new Set<string>());
  const seenMessageIds = useRef(new Set<string>());
  const email = getSessionEmail().trim().toLowerCase();

  useEffect(() => {
    function stopChatConnection() {
      socketRef.current?.close();
      socketRef.current = null;
      joinedOnSocket.current.clear();
    }

    window.addEventListener('roomcast:signout', stopChatConnection);
    return () => {
      window.removeEventListener('roomcast:signout', stopChatConnection);
    };
  }, []);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      navigate('/signin', { replace: true });
      return;
    }

    if (requestedRoom && !isValidRoomName(requestedRoom)) {
      setError('That room name is not valid.');
    }

    let socket: WebSocket;
    try {
      const url = new URL(chatWsUrl);
      url.searchParams.set('token', token);
      socket = new WebSocket(url);
    } catch {
      setError('The chat service URL is invalid. Check the frontend configuration.');
      return;
    }

    socketRef.current = socket;
    joinedOnSocket.current.clear();
    socket.addEventListener('open', () => {
      if (socketRef.current !== socket) return;
      setConnected(true);
      const roomsToJoin = new Set(getJoinedRooms());
      if (requestedRoom && isValidRoomName(requestedRoom)) {
        roomsToJoin.add(requestedRoom);
      }
      roomsToJoin.forEach((room) => {
        socket.send(JSON.stringify({ type: 'join-room', room }));
      });
    });

    socket.addEventListener('message', ({ data }) => {
      if (socketRef.current !== socket) return;
      let incoming: unknown;
      try {
        incoming = JSON.parse(data);
      } catch {
        setError('Received an unreadable message from the server.');
        return;
      }

      if (typeof incoming !== 'object' || incoming === null || !('type' in incoming)) {
        return;
      }

      if (incoming.type === 'error' && 'message' in incoming &&
          typeof incoming.message === 'string') {
        setError(incoming.message);
        return;
      }

      if (
        incoming.type === 'room-joined' &&
        'room' in incoming &&
        typeof incoming.room === 'string' &&
        isValidRoomName(incoming.room)
      ) {
        const joinedRoom = incoming.room;
        joinedOnSocket.current.add(joinedRoom);
        addJoinedRoom(joinedRoom);
        setRooms(getJoinedRooms());
        setActiveRoom((current) => current ?? joinedRoom);
        return;
      }

      if (
        incoming.type !== 'chat' ||
        !('room' in incoming) ||
        typeof incoming.room !== 'string' ||
        !joinedOnSocket.current.has(incoming.room)
      ) {
        return;
      }

      const room = incoming.room;
      const text =
        'message' in incoming && typeof incoming.message === 'string'
          ? incoming.message
          : undefined;
      const image = 'image' in incoming
        ? parseImageAttachment(incoming.image)
        : undefined;
      if ((!text && !image) || (text && image)) return;
      const clientMessageId =
        'clientMessageId' in incoming &&
        typeof incoming.clientMessageId === 'string'
          ? incoming.clientMessageId
          : undefined;
      const own = clientMessageId
        ? ownMessageIds.current.delete(clientMessageId)
        : false;
      const senderName =
        'senderName' in incoming &&
        typeof incoming.senderName === 'string' &&
        incoming.senderName.trim().length > 0
          ? incoming.senderName.trim().slice(0, 50)
          : undefined;
      if (clientMessageId && seenMessageIds.current.has(clientMessageId)) return;
      if (clientMessageId) seenMessageIds.current.add(clientMessageId);
      const receivedAt = new Date();

      void (async () => {
        let savedMessage: ChatMessage;
        try {
          savedMessage = await saveChatMessage(email, {
            room,
            message: text,
            image,
            clientMessageId,
            senderName,
            own,
            receivedAt,
          });
        } catch (historyError) {
          setError(
            historyError instanceof Error
              ? `Message received, but it could not be saved on this device: ${historyError.message}`
              : 'Message received, but it could not be saved on this device.',
          );
          savedMessage = {
            id: crypto.randomUUID(),
            room,
            message: text,
            image,
            clientMessageId,
            senderName,
            own,
            receivedAt,
          };
        }

        setMessagesByRoom((current) => ({
          ...current,
          [room]: [...(current[room] ?? []), savedMessage]
            .sort((first, second) =>
              first.receivedAt.getTime() - second.receivedAt.getTime(),
            ),
        }));
      })();
    });

    socket.addEventListener('error', () => {
      if (socketRef.current !== socket) return;
      setError('Could not connect to the chat service. Please try again.');
    });

    socket.addEventListener('close', () => {
      if (socketRef.current !== socket) return;
      setConnected(false);
      socketRef.current = null;
      joinedOnSocket.current.clear();
      setError('Connection closed. Return to RoomCast and reconnect to your rooms.');
    });

    return () => {
      socketRef.current = null;
      socket.close();
    };
  }, [navigate, requestedRoom]);

  useEffect(() => {
    if (!activeRoom || !email) return;
    let cancelled = false;

    void getChatHistory(email, activeRoom)
      .then((history) => {
        if (cancelled) return;
        history.forEach((message) => {
          if (message.clientMessageId) {
            seenMessageIds.current.add(message.clientMessageId);
          }
        });
        setMessagesByRoom((current) => {
          const merged = new Map(
            (current[activeRoom] ?? []).map((message) => [message.id, message]),
          );
          history.forEach((message) => merged.set(message.id, message));
          return {
            ...current,
            [activeRoom]: [...merged.values()].sort((first, second) =>
              first.receivedAt.getTime() - second.receivedAt.getTime(),
            ),
          };
        });
      })
      .catch((historyError: unknown) => {
        if (!cancelled) {
          setError(
            historyError instanceof Error
              ? `Could not load saved messages: ${historyError.message}`
              : 'Could not load saved messages.',
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeRoom, email]);

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = messageText.trim();
    const socket = socketRef.current;

    if (!activeRoom || !text) return;
    if (
      !socket ||
      socket.readyState !== WebSocket.OPEN ||
      !joinedOnSocket.current.has(activeRoom)
    ) {
      setError('You must be connected to a joined room before sending messages.');
      return;
    }

    const clientMessageId = crypto.randomUUID();
    ownMessageIds.current.add(clientMessageId);
    socket.send(JSON.stringify({
      type: 'chat',
      room: activeRoom,
      message: text,
      clientMessageId,
    }));
    setMessageText('');
  }

  async function sendImage(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
      setError('Choose a JPG or PNG image.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError('Images must be 5 MB or smaller.');
      return;
    }

    const room = activeRoom;
    const socket = socketRef.current;
    if (
      !room ||
      !socket ||
      socket.readyState !== WebSocket.OPEN ||
      !joinedOnSocket.current.has(room)
    ) {
      setError('Join a connected room before sending an image.');
      return;
    }

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener('load', () => {
          if (typeof reader.result === 'string') resolve(reader.result);
          else reject(new Error('Could not read this image.'));
        }, { once: true });
        reader.addEventListener('error', () => {
          reject(new Error('Could not read this image.'));
        }, { once: true });
        reader.readAsDataURL(file);
      });

      if (
        socketRef.current !== socket ||
        socket.readyState !== WebSocket.OPEN ||
        !joinedOnSocket.current.has(room)
      ) {
        setError('The room connection closed before the image could be sent.');
        return;
      }

      const clientMessageId = crypto.randomUUID();
      ownMessageIds.current.add(clientMessageId);
      socket.send(JSON.stringify({
        type: 'chat',
        room,
        image: {
          mimeType: file.type,
          dataUrl,
        },
        clientMessageId,
      }));
      setError('');
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Could not send this image.');
    }
  }

  const activeMessages = activeRoom ? messagesByRoom[activeRoom] ?? [] : [];

  useLayoutEffect(() => {
    const list = messageListRef.current;
    if (list) {
      list.scrollTop = list.scrollHeight;
    }
  }, [activeRoom, activeMessages]);

  return (
    <main className="chat-shell">
      <AppHeader showBack />
      <section className="chat-workspace" aria-label="Room chat">
        <aside className="room-sidebar">
          <div className="sidebar-heading">
            <h1>Your rooms</h1>
            <p className="muted">Choose a room to chat.</p>
          </div>
          {rooms.length > 0 ? (
            <nav className="room-list" aria-label="Joined rooms">
              {rooms.map((room) => (
                <button
                  className={`room-list-item${activeRoom === room ? ' active' : ''}`}
                  type="button"
                  key={room}
                  onClick={() => {
                    setActiveRoom(room);
                    setError('');
                  }}
                  aria-current={activeRoom === room ? 'page' : undefined}
                >
                  <span className="room-list-icon" aria-hidden="true">#</span>
                  <span>{room}</span>
                </button>
              ))}
            </nav>
          ) : (
            <p className="room-list-empty">You haven’t joined any rooms yet.</p>
          )}
          <button
            className="room-add-button"
            type="button"
            onClick={() => navigate('/room?mode=join')}
          >
            + Join another room
          </button>
        </aside>

        <section className="chat-content" aria-label={activeRoom ? `Chat in ${activeRoom}` : 'Choose a room'}>
          {activeRoom ? (
            <>
              <div className="chat-intro">
                <h2>{activeRoom}</h2>
                <div className="room-heading chat-connection" aria-live="polite">
                  <span className={`online-dot${connected ? '' : ' offline'}`} aria-hidden="true" />
                  <span className="room-status">
                    {connected ? 'Connected' : 'Connecting or disconnected'}
                  </span>
                </div>
              </div>
              {error && <p className="error chat-error" role="alert">{error}</p>}
              <ol
                ref={messageListRef}
                className="message-list"
                aria-live="polite"
                aria-label="Room messages"
              >
                {activeMessages.map((message, index) => (
                  <li
                    className={`message${message.own ? ' message-own' : ''}`}
                    key={`${message.clientMessageId ?? message.receivedAt.getTime()}-${index}`}
                  >
                    {(message.own || message.senderName) && (
                      <span className="message-author">
                        {message.own ? 'You' : message.senderName}
                      </span>
                    )}
                    {message.image ? (
                      <img
                        className="message-image"
                        src={message.image.dataUrl}
                        alt="Shared image"
                      />
                    ) : (
                      <p className="message-text">{message.message}</p>
                    )}
                    <time className="message-time" dateTime={message.receivedAt.toISOString()}>
                      {new Intl.DateTimeFormat(undefined, {
                        hour: 'numeric',
                        minute: '2-digit',
                      }).format(message.receivedAt)}
                    </time>
                  </li>
                ))}
              </ol>
              <form className="composer" onSubmit={sendMessage}>
                <label className="visually-hidden" htmlFor="message">Your message</label>
                <input
                  id="message"
                  name="message"
                  type="text"
                  maxLength={2000}
                  autoComplete="off"
                  placeholder="Write a message…"
                  value={messageText}
                  onChange={(event) => setMessageText(event.target.value)}
                  required
                />
                <input
                  ref={imageInputRef}
                  className="visually-hidden"
                  type="file"
                  accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                  aria-label="Choose a JPG or PNG image"
                  onChange={sendImage}
                />
                <button
                  className="image-button"
                  type="button"
                  aria-label="Send an image"
                  title="Send a JPG or PNG image"
                  disabled={!connected || !joinedOnSocket.current.has(activeRoom)}
                  onClick={() => imageInputRef.current?.click()}
                >
                  +
                </button>
                <button
                  className="send-button"
                  type="submit"
                  disabled={!connected || !joinedOnSocket.current.has(activeRoom)}
                >
                  Send <span aria-hidden="true">↗</span>
                </button>
              </form>
              <p className="composer-hint">Messages are shared with everyone in this room.</p>
            </>
          ) : (
            <div className="chat-empty">
              <span className="action-icon room-icon" aria-hidden="true">↗</span>
              <h2>Select a room to start chatting</h2>
              <p className="muted">
                {error || 'Your joined rooms will appear on the left.'}
              </p>
              <button
                className="button button-primary"
                type="button"
                onClick={() => navigate('/room?mode=join')}
              >
                Join a room
              </button>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
