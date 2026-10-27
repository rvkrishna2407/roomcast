export interface ChatHistoryMessage {
  id: string;
  room: string;
  message?: string;
  image?: {
    mimeType: 'image/jpeg' | 'image/png';
    dataUrl: string;
  };
  clientMessageId?: string;
  senderName?: string;
  own: boolean;
  receivedAt: Date;
}

interface StoredChatHistoryMessage extends Omit<ChatHistoryMessage, 'receivedAt'> {
  email: string;
  receivedAt: number;
}

const DATABASE_NAME = 'roomcast-chat-history';
const DATABASE_VERSION = 1;
const STORE_NAME = 'messages';
let databasePromise: Promise<IDBDatabase> | undefined;

function openDatabase(): Promise<IDBDatabase> {
  if (!('indexedDB' in window)) {
    return Promise.reject(new Error('This browser does not support local chat history.'));
  }

  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
      request.addEventListener('upgradeneeded', () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('by-email-room', ['email', 'room']);
          store.createIndex('by-email', 'email');
        }
      });
      request.addEventListener('success', () => {
        const database = request.result;
        database.addEventListener('versionchange', () => database.close());
        resolve(database);
      }, { once: true });
      request.addEventListener('error', () => {
        databasePromise = undefined;
        reject(request.error ?? new Error('Could not open local chat history.'));
      }, { once: true });
      request.addEventListener('blocked', () => {
        databasePromise = undefined;
        reject(new Error('Local chat history is blocked by another browser tab.'));
      }, { once: true });
    });
  }

  return databasePromise;
}

export async function getChatHistory(
  email: string,
  room: string,
): Promise<ChatHistoryMessage[]> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const request = transaction
      .objectStore(STORE_NAME)
      .index('by-email-room')
      .getAll(IDBKeyRange.only([email.trim().toLowerCase(), room]));

    request.addEventListener('success', () => {
      const storedMessages = request.result as StoredChatHistoryMessage[];
      resolve(
        storedMessages
          .map(({ email: _email, receivedAt, ...message }) => ({
            ...message,
            receivedAt: new Date(receivedAt),
          }))
          .sort((first, second) =>
            first.receivedAt.getTime() - second.receivedAt.getTime(),
          ),
      );
    }, { once: true });
    request.addEventListener('error', () => {
      reject(request.error ?? new Error('Could not load local chat history.'));
    }, { once: true });
  });
}

export async function saveChatMessage(
  email: string,
  message: Omit<ChatHistoryMessage, 'id'>,
): Promise<ChatHistoryMessage> {
  const database = await openDatabase();
  const storedMessage: StoredChatHistoryMessage = {
    ...message,
    id: crypto.randomUUID(),
    email: email.trim().toLowerCase(),
    receivedAt: message.receivedAt.getTime(),
  };

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).add(storedMessage);
    transaction.addEventListener('complete', () => resolve(), { once: true });
    transaction.addEventListener('error', () => {
      reject(transaction.error ?? new Error('Could not save local chat history.'));
    }, { once: true });
    transaction.addEventListener('abort', () => {
      reject(transaction.error ?? new Error('Saving local chat history was cancelled.'));
    }, { once: true });
  });

  const { email: _email, receivedAt, ...savedMessage } = storedMessage;
  return { ...savedMessage, receivedAt: new Date(receivedAt) };
}

export async function clearChatHistory(email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return;

  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const keysRequest = store.index('by-email').getAllKeys(
      IDBKeyRange.only(normalizedEmail),
    );

    keysRequest.addEventListener('success', () => {
      for (const key of keysRequest.result) {
        store.delete(key);
      }
    }, { once: true });
    keysRequest.addEventListener('error', () => {
      reject(keysRequest.error ?? new Error('Could not clear local chat history.'));
    }, { once: true });
    transaction.addEventListener('complete', () => resolve(), { once: true });
    transaction.addEventListener('error', () => {
      reject(transaction.error ?? new Error('Could not clear local chat history.'));
    }, { once: true });
    transaction.addEventListener('abort', () => {
      reject(transaction.error ?? new Error('Clearing local chat history was cancelled.'));
    }, { once: true });
  });
}
