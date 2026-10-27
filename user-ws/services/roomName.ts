const ROOM_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9@-]{3,19}$/;

export function isValidRoomName(roomName: unknown): roomName is string {
    return typeof roomName === 'string' && ROOM_NAME_PATTERN.test(roomName);
}
