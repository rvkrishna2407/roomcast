const ROOM_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9@-]{3,19}$/;

export function isValidRoomName(roomName: string): boolean {
  return ROOM_NAME_PATTERN.test(roomName);
}
