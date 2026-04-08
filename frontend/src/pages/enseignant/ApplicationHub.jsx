import { Link } from 'react-router-dom';

/**
 * Applications disponibles pour l'enseignant
 */
function ApplicationHub() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] px-4 py-10 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link
            to="/enseignant"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-[#1e3a5f] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Retour
          </Link>
          <h1 className="mt-4 text-2xl sm:text-3xl font-bold text-slate-800">Application</h1>
          <p className="mt-1 text-slate-600">Choisissez un parcours ou un outil.</p>
        </div>

        <Link
          to="/enseignant/application/course-orientation"
          className="block rounded-2xl border-2 border-slate-200 bg-white p-6 sm:p-8 shadow-sm transition-all hover:border-[#1e3a5f] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:ring-offset-2"
        >
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <svg className="w-7 h-7 text-amber-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 13L9 7" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-slate-800">Course d&apos;orientation</h2>
              <p className="mt-1 text-sm text-slate-500">
                Accéder au module course d&apos;orientation.
              </p>
            </div>
            <svg className="w-5 h-5 text-slate-400 shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
      </div>
    </div>
  );
}

export default ApplicationHub;
