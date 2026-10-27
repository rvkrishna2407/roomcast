import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import Button from '../components/Button';
import Inputbox from '../components/Inputbox';
import { isValidRoomName } from '../services/roomName';

export default function Room() {
  const [roomName, setRoomName] = useState('');
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const forMessage = searchParams.get('mode') === 'message';

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const room = roomName.trim();
    if (!isValidRoomName(room)) {
      setError(
        'Use 4–20 characters. Start with a letter; after that, use only letters, numbers, @, or hyphens.',
      );
      return;
    }
    navigate(`/chat?room=${encodeURIComponent(room)}`);
  }

  return (
    <main className="app-shell">
      <AppHeader showBack />
      <section className="room-form-wrap">
        <div className="room-form-card">
          <span
            className={`action-icon ${forMessage ? 'message-icon' : 'room-icon'}`}
            aria-hidden="true"
          >
            {forMessage ? '✳' : '↗'}
          </span>
          <h1>{forMessage ? 'Where should we send it?' : 'Join a room'}</h1>
          {error && <p className="error" role="alert">{error}</p>}
          <form onSubmit={handleSubmit}>
            <Inputbox
              id="room"
              name="room"
              label="Room name"
              type="text"
              autoComplete="off"
              placeholder="e.g. weekend-plans"
              minLength={4}
              maxLength={20}
              pattern="[A-Za-z][A-Za-z0-9@-]{3,19}"
              title="Start with a letter; use 4–20 letters, numbers, @, or hyphens."
              value={roomName}
              onChange={(event) => setRoomName(event.target.value)}
              required
            />
            <Button type="submit" wide>
              {forMessage ? 'Continue to message' : 'Join room'}
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}
