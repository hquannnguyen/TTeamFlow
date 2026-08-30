import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/auth.api';
import { useAuthStore } from '../store/auth.store';

export function LoginPage() {
  const navigate = useNavigate();
  const setAccessToken = useAuthStore((state) => state.setAccessToken);
  const [email, setEmail] = useState('member@example.com');
  const [password, setPassword] = useState('Member@123');
  const [error, setError] = useState('');

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');

    try {
      const result = await login({ email, password });
      setAccessToken(result.accessToken);
      navigate('/projects');
    } catch {
      setError('Đăng nhập thất bại');
    }
  }

  return (
    <main className="center-page">
      <form className="card login-card" onSubmit={onSubmit}>
        <h1>Team Project Management</h1>
        <p className="muted">Đăng nhập vào hệ thống</p>

        <label>
          Email
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
          />
        </label>

        <label>
          Mật khẩu
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
          />
        </label>

        {error && <p className="error">{error}</p>}
        <button type="submit">Đăng nhập</button>
      </form>
    </main>
  );
}
