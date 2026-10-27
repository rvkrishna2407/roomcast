import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import Bottomwarning from '../components/Bottomwarning';
import Button from '../components/Button';
import Heading from '../components/Heading';
import Inputbox from '../components/Inputbox';
import Subheading from '../components/Subheading';
import { signin } from '../services/auth';
import { saveSession } from '../services/session';

interface LocationState {
  notice?: string;
}

export default function Signin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const notice = (location.state as LocationState | null)?.notice;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signin({ email: email.trim(), password });
      if (!result.token) {
        throw new Error('The server did not return an authentication token.');
      }
      saveSession(result.token, email.trim());
      navigate('/home', { replace: true });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Could not reach the authentication service.',
      );
      setLoading(false);
    }
  }

  return (
    <AuthLayout kicker="WELCOME BACK">
      <Heading label="Sign in to RoomCast" />
      <Subheading label="Pick up where your conversations left off." />
      {notice && <p className="notice" role="status">{notice}</p>}
      {error && <p className="error" role="alert">{error}</p>}
      <form className="auth-form" onSubmit={handleSubmit}>
        <Inputbox
          id="email"
          name="email"
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <Inputbox
          id="password"
          name="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="Your password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <Button type="submit" wide disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
      <Bottomwarning
        label="New to RoomCast?"
        buttonText="Create an account"
        to="/signup"
      />
    </AuthLayout>
  );
}
