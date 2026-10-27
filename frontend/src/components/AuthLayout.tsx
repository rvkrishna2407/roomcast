import type { ReactNode } from 'react';
import RoomCastLogo from './RoomCastLogo';

interface AuthLayoutProps {
  kicker: string;
  children: ReactNode;
}

export default function AuthLayout({ kicker, children }: AuthLayoutProps) {
  return (
    <main className="auth-layout">
      <section className="brand-panel" aria-label="RoomCast introduction">
        <a className="wordmark" href="/" aria-label="RoomCast home">
          <RoomCastLogo />
        </a>
        <div className="brand-copy">
          <p className="eyebrow">A little closer, wherever you are</p>
          <h1>Good conversations<br />start in a room.</h1>
          <p>Make a room, bring your people, and let the conversation flow.</p>
        </div>
        <div className="brand-decoration" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <p className="eyebrow">{kicker}</p>
          {children}
        </div>
        <p className="auth-footer">A calm corner for good conversations.</p>
      </section>
    </main>
  );
}
