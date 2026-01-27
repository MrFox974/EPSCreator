import { Outlet, Link, useLocation } from 'react-router-dom';

function Layout() {

  const location = useLocation();
  
  return (
    <div className="min-h-screen flex flex-col">
      
      <header className="bg-gray-800 text-white p-4">
        <nav className="container mx-auto flex gap-4">
          <Link
            to="/home"
            className={`px-4 py-2 rounded ${
              location.pathname === '/home' ? 'bg-gray-700' : 'hover:bg-gray-700'
            }`}
          >
            Home
          </Link>
          <Link
            to="/about"
            className={`px-4 py-2 rounded ${
              location.pathname === '/about' ? 'bg-gray-700' : 'hover:bg-gray-700'
            }`}
          >
            About
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-gray-800 text-white p-4 text-center">
        <p>© 2025 Starter Project</p>
      </footer>
    </div>
  );
}

export default Layout;