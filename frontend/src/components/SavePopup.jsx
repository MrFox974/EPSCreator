import { useState, useEffect } from 'react';

/**
 * SavePopup - Popup discret en bas à droite pour indiquer la sauvegarde
 * @param {string} status - 'idle' | 'saving' | 'saved' | 'error'
 * @param {string} errorMessage - Message d'erreur si status === 'error'
 */
function SavePopup({ status, errorMessage = '' }) {
  const [visible, setVisible] = useState(false);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (status !== 'idle') {
      setVisible(true);
      setTimeout(() => setAnimate(true), 10);
      
      // Auto-hide après 3 secondes si "saved"
      if (status === 'saved') {
        const timer = setTimeout(() => {
          setAnimate(false);
          setTimeout(() => setVisible(false), 300);
        }, 3000);
        return () => clearTimeout(timer);
      }
    } else {
      setAnimate(false);
      setTimeout(() => setVisible(false), 300);
    }
  }, [status]);

  if (!visible) return null;

  const getContent = () => {
    switch (status) {
      case 'saving':
        return (
          <>
            <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
              <circle 
                className="opacity-25" 
                cx="12" cy="12" r="10" 
                stroke="currentColor" 
                strokeWidth="4"
                fill="none"
              />
              <path 
                className="opacity-75" 
                fill="currentColor" 
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span className="text-sm">Enregistrement...</span>
          </>
        );
      case 'saved':
        return (
          <>
            <svg className="h-5 w-5 text-[#92d050]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm">Enregistré</span>
          </>
        );
      case 'error':
        return (
          <>
            <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="text-sm text-red-300">{errorMessage || 'Erreur de sauvegarde'}</span>
          </>
        );
      default:
        return null;
    }
  };

  const bgColor = status === 'error' ? 'bg-red-800' : 'bg-[#1e3a5f]';

  return (
    <div 
      className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ease-out ${
        animate 
          ? 'translate-y-0 opacity-100' 
          : 'translate-y-full opacity-0'
      }`}
    >
      <div className={`${bgColor} text-white px-5 py-3 rounded-lg shadow-lg flex items-center gap-3`}>
        {getContent()}
      </div>
    </div>
  );
}

export default SavePopup;
