import { isValidRoomName } from './roomName';

const TOKEN_KEY = 'roomcast-token';
const EMAIL_KEY = 'roomcast-email';
const ROOMS_KEY_PREFIX = 'roomcast-joined-rooms:';

function getRoomsStorageKey(): string | null {
  const email = sessionStorage.getItem(EMAIL_KEY)?.trim().toLowerCase();
  return email ? `${ROOMS_KEY_PREFIX}${email}` : null;
}

export function getAuthToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function saveSession(token: string, email: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(EMAIL_KEY, email);
}

export function clearSession(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(EMAIL_KEY);
}

export function getSessionEmail(): string {
  return sessionStorage.getItem(EMAIL_KEY) ?? '';
}

export function getJoinedRooms(): string[] {
  const storageKey = getRoomsStorageKey();
  if (!storageKey) return [];

  const storedRooms = localStorage.getItem(storageKey);
  if (!storedRooms) return [];

  try {
    const parsedRooms: unknown = JSON.parse(storedRooms);
    if (!Array.isArray(parsedRooms)) return [];

    return [...new Set(
      parsedRooms.filter(
        (room): room is string =>
          typeof room === 'string' && isValidRoomName(room),
      ),
    )];
  } catch {
    return [];
  }
}

export function addJoinedRoom(room: string): void {
  if (!isValidRoomName(room)) return;
  const storageKey = getRoomsStorageKey();
  if (!storageKey) return;

  const rooms = new Set(getJoinedRooms());
  rooms.add(room);
  localStorage.setItem(storageKey, JSON.stringify([...rooms]));
}
