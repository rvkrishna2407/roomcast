export function addRoomMember<T>(
    rooms: Map<string, Set<T>>,
    roomName: string,
    member: T
): void {
    const members = rooms.get(roomName) ?? new Set<T>();
    members.add(member);
    rooms.set(roomName, members);
}

export function isRoomMember<T>(
    rooms: ReadonlyMap<string, ReadonlySet<T>>,
    roomName: string,
    member: T
): boolean {
    return rooms.get(roomName)?.has(member) ?? false;
}

export function removeMemberFromRooms<T>(
    rooms: Map<string, Set<T>>,
    member: T
): void {
    for (const [roomName, members] of rooms) {
        members.delete(member);
        if (members.size === 0) {
            rooms.delete(roomName);
        }
    }
}
