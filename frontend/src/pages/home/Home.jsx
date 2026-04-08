import { useNavigate } from 'react-router-dom';

/**
 * Accueil — choix du profil : élève ou enseignant
 */
function Home() {
  const navigate = useNavigate();

  const goEleve = () => {
    try {
      localStorage.setItem('eps_role', 'eleve');
    } catch {
      /* ignore */
    }
    navigate('/eleve');
  };

  const goEnseignant = () => {
    try {
      localStorage.setItem('eps_role', 'enseignant');
    } catch {
      /* ignore */
    }
    navigate('/enseignant');
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center px-4 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 tracking-tight">
          EPS Creator
        </h1>
        <p className="mt-3 text-slate-600 text-lg">Qui utilise l&apos;application ?</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
        <button
          type="button"
          onClick={goEleve}
          className="flex-1 rounded-2xl border-2 border-slate-200 bg-white px-8 py-6 text-lg font-semibold text-slate-800 shadow-sm transition-all hover:border-[#1e3a5f] hover:bg-slate-50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:ring-offset-2"
        >
          Élève
        </button>
        <button
          type="button"
          onClick={goEnseignant}
          className="flex-1 rounded-2xl border-2 border-[#1e3a5f] bg-[#1e3a5f] px-8 py-6 text-lg font-semibold text-white shadow-md transition-all hover:bg-[#2d5a87] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:ring-offset-2"
        >
          Enseignant
        </button>
      </div>
    </div>
  );
}

export default Home;
