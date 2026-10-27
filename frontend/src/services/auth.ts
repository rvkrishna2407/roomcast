const authApiUrl = (
  import.meta.env.VITE_AUTH_API_URL || 'http://localhost:3002/api/users'
).replace(/\/+$/, '');

interface AuthResponse {
  message?: string;
  token?: string;
}

export interface SigninCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials extends SigninCredentials {
  name: string;
}

async function postAuthRequest(
  path: 'signup' | 'signin',
  payload: SignupCredentials | SigninCredentials,
): Promise<AuthResponse> {
  const response = await fetch(`${authApiUrl}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  let result: AuthResponse;
  try {
    result = (await response.json()) as AuthResponse;
  } catch {
    throw new Error('The authentication service returned an unreadable response.');
  }

  if (!response.ok) {
    throw new Error(result.message || 'Authentication failed. Please try again.');
  }

  return result;
}

export function signin(credentials: SigninCredentials): Promise<AuthResponse> {
  return postAuthRequest('signin', credentials);
}

export function signup(credentials: SignupCredentials): Promise<AuthResponse> {
  return postAuthRequest('signup', credentials);
}
