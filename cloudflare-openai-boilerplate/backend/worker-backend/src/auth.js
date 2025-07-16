import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import { v4 as uuidv4 } from 'uuid';

const auth = new Hono();

// Helper function to hash a password (using a simple method for this example)
// In a real application, use a more secure hashing algorithm like bcrypt or Argon2
const hashPassword = async (password) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
};

auth.post('/signup', async (c) => {
  const { email, password } = await c.req.json();

  if (!email || !password) {
    return c.json({ error: 'Email and password are required' }, 400);
  }

  const hashedPassword = await hashPassword(password);
  const userId = uuidv4();

  const user = {
    id: userId,
    email,
    password: hashedPassword,
  };

  await c.env.USERS_KV.put(`user:${email}`, JSON.stringify(user));

  const payload = {
    sub: userId,
    email,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 hours
  };

  const token = await sign(payload, c.env.JWT_SECRET);

  return c.json({ token });
});

auth.post('/login', async (c) => {
  const { email, password } = await c.req.json();

  if (!email || !password) {
    return c.json({ error: 'Email and password are required' }, 400);
  }

  const userString = await c.env.USERS_KV.get(`user:${email}`);

  if (!userString) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  const user = JSON.parse(userString);
  const hashedPassword = await hashPassword(password);

  if (hashedPassword !== user.password) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  const payload = {
    sub: user.id,
    email: user.email,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 hours
  };

  const token = await sign(payload, c.env.JWT_SECRET);

  return c.json({ token });
});

auth.get('/auth/google', async (c) => {
  const googleClientId = c.env.GOOGLE_CLIENT_ID;
  const redirectUri = c.env.GOOGLE_REDIRECT_URI;
  const scope = 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile';
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
  return c.redirect(url);
});

auth.get('/auth/google/callback', async (c) => {
  const code = c.req.query('code');
  const googleClientId = c.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = c.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = c.env.GOOGLE_REDIRECT_URI;

  let response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      client_id: googleClientId,
      client_secret: googleClientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  let data = await response.json();

  if (!data.access_token) {
    return c.json({ error: 'Failed to get access token' }, 400);
  }

  response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });

  const googleUser = await response.json();
  const email = googleUser.email;

  let userString = await c.env.USERS_KV.get(`user:${email}`);
  let user;

  if (userString) {
    user = JSON.parse(userString);
  } else {
    const userId = uuidv4();
    user = {
      id: userId,
      email,
      name: googleUser.name,
      picture: googleUser.picture,
    };
    await c.env.USERS_KV.put(`user:${email}`, JSON.stringify(user));
  }

  const payload = {
    sub: user.id,
    email: user.email,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 hours
  };

  const token = await sign(payload, c.env.JWT_SECRET);

  return c.redirect(`${c.env.FRONTEND_URL}/login?token=${token}`);
});

import { verify } from 'hono/jwt';

// ... (other code)

auth.get('/user', async (c) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const decodedPayload = await verify(token, c.env.JWT_SECRET);
    const userString = await c.env.USERS_KV.get(`user:${decodedPayload.email}`);

    if (!userString) {
      return c.json({ error: 'User not found' }, 404);
    }

    const user = JSON.parse(userString);
    // Don't return the password
    delete user.password;

    return c.json({ user });
  } catch (error) {
    return c.json({ error: 'Invalid token' }, 401);
  }
});

auth.post('/logout', async (c) => {
  return c.json({ message: 'Logout successful' });
});

export default auth;
