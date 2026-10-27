import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import Bottomwarning from '../components/Bottomwarning';
import Button from '../components/Button';
import Heading from '../components/Heading';
import Inputbox from '../components/Inputbox';
import Subheading from '../components/Subheading';
import { signup } from '../services/auth';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signup({ name: name.trim(), email: email.trim(), password });
      navigate('/signin', {
        replace: true,
        state: { notice: 'Account created. Sign in to start using RoomCast.' },
      });
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
    <AuthLayout kicker="GET STARTED">
      <Heading label="Create your account" />
      <Subheading label="Your next great conversation is one room away." />
      {error && <p className="error" role="alert">{error}</p>}
      <form className="auth-form" onSubmit={handleSubmit}>
        <Inputbox
          id="name"
          name="name"
          label="Your name"
          type="text"
          autoComplete="name"
          placeholder="Alex Morgan"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          minLength={1}
        />
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
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={8}
        />
        <Button type="submit" wide disabled={loading}>
          {loading ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
      <Bottomwarning
        label="Already have an account?"
        buttonText="Sign in"
        to="/signin"
      />
    </AuthLayout>
  );
}
