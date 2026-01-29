/**
 * Skeleton de chargement pour la page EPS Leçon
 */

function EpsLeconSkeleton() {
  return (
    <div className="bg-gray-100 min-h-screen py-4 px-2 animate-pulse">
      <div className="max-w-5xl mx-auto bg-white shadow-lg">
        
        {/* En-tête */}
        <div className="bg-gradient-to-r from-sky-200 via-sky-300 to-sky-400 py-4 px-6">
          <div className="h-8 bg-sky-400/50 rounded w-3/4 mx-auto"></div>
        </div>

        {/* Sous-titre */}
        <div className="bg-gray-300 py-2 px-4">
          <div className="h-5 bg-gray-400 rounded w-2/3 mx-auto"></div>
        </div>

        {/* Contenu */}
        <div className="p-4 md:p-6 space-y-4">
          
          {/* Titre leçon */}
          <div className="flex items-center gap-2 mb-4">
            <div className="h-6 w-32 bg-gray-300 rounded"></div>
            <div className="h-6 w-64 bg-gray-200 rounded"></div>
          </div>

          {/* Cycle et APSA */}
          <div className="flex items-center gap-3 mb-4">
            <div className="h-5 w-20 bg-gray-200 rounded"></div>
            <div className="h-5 w-24 bg-gray-200 rounded"></div>
          </div>

          {/* Compétences */}
          <div className="border-2 border-gray-200 rounded-md p-4 mb-4">
            <div className="h-5 w-48 bg-gray-300 rounded mb-3"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>

          {/* Grille */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="border-2 border-gray-200 rounded-md p-4 h-40"></div>
              <div className="border-2 border-gray-200 rounded-md p-4 h-48"></div>
            </div>
            <div className="space-y-4">
              <div className="border-2 border-gray-200 rounded-md p-4 h-32 bg-amber-50"></div>
              <div className="border-2 border-gray-200 rounded-md p-4 h-36 bg-green-50"></div>
            </div>
          </div>

          {/* Section régulation */}
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-6 w-32 bg-gray-300 rounded"></div>
              <div className="h-6 w-40 bg-sky-200 rounded"></div>
            </div>
            <div className="border border-gray-200 rounded-md p-4 h-48"></div>
          </div>

          {/* Section VAMEVAL */}
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-6 w-28 bg-amber-200 rounded"></div>
              <div className="h-6 w-52 bg-green-200 rounded"></div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="border border-gray-200 rounded-md h-48"></div>
              <div className="flex items-center justify-center">
                <div className="w-24 h-28 bg-gray-200 rounded-lg"></div>
              </div>
              <div className="border border-gray-200 rounded-md h-48"></div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default EpsLeconSkeleton;
