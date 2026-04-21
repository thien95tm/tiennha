import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-md text-sm font-medium ${
      isActive ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
    }`;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="font-semibold text-lg text-indigo-600 hover:text-indigo-700">
              🏠 Tiền thuê nhà
            </Link>
            <nav className="flex gap-1">
              <NavLink to="/" end className={linkCls}>Tổng quan</NavLink>
              <NavLink to="/bills" end className={linkCls}>Hoá đơn</NavLink>
              <NavLink to="/bills/new/bulk" end className={linkCls}>📷 Chụp 5 phòng</NavLink>
              <NavLink to="/bills/new" end className={linkCls}>Tạo từng phòng</NavLink>
              <NavLink to="/tenants" end className={linkCls}>Người thuê</NavLink>
              <NavLink to="/pricing" end className={linkCls}>Bảng giá</NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-500">{user?.username}</span>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="text-gray-600 hover:text-red-600"
            >Đăng xuất</button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
