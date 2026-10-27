import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import Button from '../components/Button';

export default function Home() {
  const navigate = useNavigate();

  return (
    <main className="app-shell">
      <AppHeader />
      <section className="welcome">
        <p className="eyebrow">YOUR SPACE, YOUR PEOPLE</p>
        <h1>RoomCast</h1>
        <p className="muted">Where would you like to start?</p>
      </section>
      <section className="action-grid" aria-label="RoomCast actions">
        <article className="action-card">
          <span className="action-icon room-icon" aria-hidden="true">↗</span>
          <h2>Join a room</h2>
          <p>Have a room name? Join in and catch up with everyone there.</p>
          <Button onClick={() => navigate('/room?mode=join')}>Join room</Button>
        </article>
        <article className="action-card">
          <span className="action-icon message-icon" aria-hidden="true">✳</span>
          <h2>Send a message</h2>
          <p>Choose a room and start a conversation with the people in it.</p>
          <Button variant="secondary" onClick={() => navigate('/chat')}>
            Send message
          </Button>
        </article>
      </section>
    </main>
  );
}
