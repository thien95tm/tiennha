import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
      isActive ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
    }`;

  const links = (
    <>
      <NavLink to="/" end className={linkCls} onClick={() => setMenuOpen(false)}>Tổng quan</NavLink>
      <NavLink to="/bills" end className={linkCls} onClick={() => setMenuOpen(false)}>Hoá đơn</NavLink>
      <NavLink to="/bills/new/bulk" end className={linkCls} onClick={() => setMenuOpen(false)}>📷 Chụp 5 phòng</NavLink>
      <NavLink to="/bills/new" end className={linkCls} onClick={() => setMenuOpen(false)}>Tạo từng phòng</NavLink>
      <NavLink to="/tenants" end className={linkCls} onClick={() => setMenuOpen(false)}>Người thuê</NavLink>
      <NavLink to="/pricing" end className={linkCls} onClick={() => setMenuOpen(false)}>Bảng giá</NavLink>
    </>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="font-semibold text-lg text-indigo-600 hover:text-indigo-700 flex-shrink-0">
            🏠 Tiền thuê nhà
          </Link>

          {/* Desktop menu */}
          <nav className="hidden md:flex items-center gap-1 ml-6 flex-1">
            {links}
          </nav>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3 text-sm">
            <span className="text-gray-500">{user?.username}</span>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="text-gray-600 hover:text-red-600"
            >Đăng xuất</button>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="md:hidden p-2 text-gray-700"
            aria-label="Menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {menuOpen ? (
                <><path d="M18 6L6 18" /><path d="M6 6l12 12" /></>
              ) : (
                <><path d="M3 6h18" /><path d="M3 12h18" /><path d="M3 18h18" /></>
              )}
            </svg>
          </button>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <nav className="md:hidden border-t bg-white px-2 py-2 flex flex-col gap-1">
            {links}
            <div className="border-t mt-2 pt-2 flex items-center justify-between px-3">
              <span className="text-sm text-gray-500">{user?.username}</span>
              <button
                onClick={() => { setMenuOpen(false); logout(); navigate('/login'); }}
                className="text-sm text-gray-600 hover:text-red-600"
              >Đăng xuất</button>
            </div>
          </nav>
        )}
      </header>
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
