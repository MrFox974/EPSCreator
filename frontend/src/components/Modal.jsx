/**
 * Modal - Composant modal réutilisable
 */
function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-modal-in overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d5a87] px-6 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6">
          {children}
        </div>
      </div>

      <style>{`
        @keyframes modal-in {
          from { opacity: 0; transform: scale(0.95) translateY(-10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-modal-in {
          animation: modal-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}

export default Modal;
