import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { clearChatHistory } from '../services/chatHistory';
import { clearSession, getSessionEmail } from '../services/session';
import RoomCastLogo from './RoomCastLogo';

interface AppHeaderProps {
  showBack?: boolean;
}

export default function AppHeader({ showBack = false }: AppHeaderProps) {
  const navigate = useNavigate();
  const [signoutError, setSignoutError] = useState('');
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    setSignoutError('');
    window.dispatchEvent(new Event('roomcast:signout'));
    try {
      await clearChatHistory(getSessionEmail());
      clearSession();
      navigate('/signin', { replace: true });
    } catch (error) {
      setSignoutError(
        error instanceof Error
          ? `Could not clear saved chat messages: ${error.message}`
          : 'Could not clear saved chat messages. Please try signing out again.',
      );
      setSigningOut(false);
    }
  }

  return (
    <>
      <header className="topbar">
        {showBack ? (
          <button className="back-button" type="button" onClick={() => navigate('/home')}>
            <span className="back-arrow" aria-hidden="true">←</span>
            <RoomCastLogo />
          </button>
        ) : (
          <Link className="wordmark" to="/home" aria-label="RoomCast home">
            <RoomCastLogo />
          </Link>
        )}
        <button className="text-button" type="button" onClick={signOut} disabled={signingOut}>
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </header>
      {signoutError && <p className="error signout-error" role="alert">{signoutError}</p>}
    </>
  );
}
