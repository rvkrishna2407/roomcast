export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export interface ChatMessage {
    type: 'chat';
    room: string;
    message?: string;
    image?: {
        mimeType: 'image/jpeg' | 'image/png';
        dataUrl: string;
    };
    clientMessageId?: string;
    senderName?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function parseImage(value: unknown): ChatMessage['image'] | null {
    if (
        !isRecord(value) ||
        (value.mimeType !== 'image/jpeg' && value.mimeType !== 'image/png') ||
        typeof value.dataUrl !== 'string'
    ) {
        return null;
    }

    const prefix = `data:${value.mimeType};base64,`;
    if (!value.dataUrl.startsWith(prefix)) {
        return null;
    }

    const base64 = value.dataUrl.slice(prefix.length);
    if (
        base64.length === 0 ||
        base64.length % 4 !== 0 ||
        !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64)
    ) {
        return null;
    }

    const bytes = Buffer.from(base64, 'base64');
    if (bytes.byteLength > MAX_IMAGE_BYTES || bytes.toString('base64') !== base64) {
        return null;
    }

    const isPng =
        value.mimeType === 'image/png' &&
        bytes.subarray(0, 8).equals(
            Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        );
    const isJpeg =
        value.mimeType === 'image/jpeg' &&
        bytes.length >= 3 &&
        bytes[0] === 0xff &&
        bytes[1] === 0xd8 &&
        bytes[2] === 0xff;

    if (!isPng && !isJpeg) {
        return null;
    }

    return {
        mimeType: value.mimeType,
        dataUrl: value.dataUrl,
    };
}

export function parseChatMessage(value: unknown): ChatMessage | null {
    if (
        !isRecord(value) ||
        value.type !== 'chat' ||
        typeof value.room !== 'string' ||
        (value.clientMessageId !== undefined &&
            (typeof value.clientMessageId !== 'string' ||
                value.clientMessageId.length > 100))
    ) {
        return null;
    }

    const hasText = 'message' in value;
    const hasImage = 'image' in value;

    if (hasText === hasImage) {
        return null;
    }

    if (hasText) {
        if (typeof value.message !== 'string') {
            return null;
        }
        const message = value.message;
        if (message.trim().length === 0 || message.length > 2000) {
            return null;
        }

        return {
            type: 'chat',
            room: value.room,
            message,
            ...(typeof value.clientMessageId === 'string'
                ? { clientMessageId: value.clientMessageId }
                : {}),
            ...(typeof value.senderName === 'string' &&
                value.senderName.trim().length > 0
                ? { senderName: value.senderName.trim().slice(0, 50) }
                : {}),
        };
    }

    const image = parseImage(value.image);
    if (!image) {
        return null;
    }

    return {
        type: 'chat',
        room: value.room,
        image,
        ...(typeof value.clientMessageId === 'string'
            ? { clientMessageId: value.clientMessageId }
            : {}),
        ...(typeof value.senderName === 'string' &&
            value.senderName.trim().length > 0
            ? { senderName: value.senderName.trim().slice(0, 50) }
            : {}),
    };
}
