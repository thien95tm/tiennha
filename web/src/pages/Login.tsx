import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(''); setLoading(true);
    try {
      await login(u, p);
      nav('/');
    } catch (e: any) {
      setErr(e.response?.data?.error ?? 'Lỗi đăng nhập');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <form onSubmit={submit} className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-indigo-600 mb-1">🏠 Tiền thuê nhà</h1>
        <p className="text-gray-500 text-sm mb-6">Đăng nhập để quản lý</p>

        <label className="block mb-3">
          <span className="text-sm text-gray-700">Tài khoản</span>
          <input value={u} onChange={e => setU(e.target.value)} autoFocus
            className="mt-1 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </label>
        <label className="block mb-4">
          <span className="text-sm text-gray-700">Mật khẩu</span>
          <input type="password" value={p} onChange={e => setP(e.target.value)}
            className="mt-1 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </label>
        {err && <div className="mb-3 text-sm text-red-600">{err}</div>}
        <button disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-md disabled:opacity-50">
          {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
      </form>
    </div>
  );
}
