import { Link } from 'react-router-dom';

/**
 * Hub enseignant — Mes cours ou Application
 */
function EnseignantHub() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center px-4 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="text-center mb-10">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Espace enseignant</h1>
        <p className="mt-2 text-slate-600">Que souhaitez-vous ouvrir ?</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-2xl">
        <Link
          to="/enseignant/mes-cours"
          className="flex-1 rounded-2xl border-2 border-[#1e3a5f] bg-white p-8 text-center shadow-sm transition-all hover:shadow-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:ring-offset-2"
        >
          <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-[#1e3a5f]/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-[#1e3a5f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-800">Mes cours</h2>
          <p className="mt-2 text-sm text-slate-500">Écoles, classes et activités</p>
        </Link>
        <Link
          to="/enseignant/application"
          className="flex-1 rounded-2xl border-2 border-slate-200 bg-white p-8 text-center shadow-sm transition-all hover:border-[#1e3a5f] hover:shadow-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:ring-offset-2"
        >
          <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-slate-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-800">Application</h2>
          <p className="mt-2 text-sm text-slate-500">Outils et parcours</p>
        </Link>
      </div>
      <Link
        to="/"
        className="mt-12 text-sm font-medium text-slate-500 hover:text-[#1e3a5f] transition-colors"
      >
        Changer de profil
      </Link>
    </div>
  );
}

export default EnseignantHub;
