import { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';

function Layout() {
  const [outilsOpen, setOutilsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    setOutilsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOutilsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Barre de navigation en haut */}
      <nav className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Link
              to="/"
              className="text-slate-700 font-semibold hover:text-[#1e3a5f] transition-colors"
            >
              Dashboard EPS
            </Link>
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setOutilsOpen((prev) => !prev)}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-[#1e3a5f] transition-colors font-medium"
                aria-expanded={outilsOpen}
                aria-haspopup="true"
              >
                Outils
                <svg className={`w-4 h-4 transition-transform ${outilsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {outilsOpen && (
                <div className="absolute right-0 mt-1 w-48 py-1 bg-white rounded-xl shadow-lg border border-slate-200 z-50">
                  <Link
                    to="/outils/vma"
                    className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-[#1e3a5f] rounded-lg mx-1"
                  >
                    Validation
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;