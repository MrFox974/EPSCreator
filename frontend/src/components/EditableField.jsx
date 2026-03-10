import { useState, useRef, useEffect, useCallback } from 'react';
import RichTextEditor from './RichTextEditor';

/**
 * EditableField - Composant pour éditer du texte au clic (ou double-clic)
 * Utilise un éditeur riche pour les champs multilignes
 */
function EditableField({ 
  value, 
  onChange, 
  className = '', 
  fieldName,
  multiline = false,
  placeholder = 'Cliquez pour éditer...',
  placeholderClassName = 'text-gray-400 italic',
  editOn = 'click', // 'click' | 'doubleClick'
  displayVariant = 'plain', // 'plain' | 'hover'
  richText = false, // force l'éditeur riche même en single-line
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value || '');
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Sync avec la valeur externe uniquement quand on n'édite pas
  useEffect(() => {
    if (!isEditing) {
      setLocalValue(value || '');
    }
  }, [value, isEditing]);

  // Focus sur l'input quand on entre en mode édition (seulement pour input simple)
  useEffect(() => {
    if (isEditing && inputRef.current && !multiline) {
      inputRef.current.focus();
      const val = inputRef.current.value;
      inputRef.current.setSelectionRange(val.length, val.length);
    }
  }, [isEditing, multiline]);

  // Fermer l'éditeur quand on clique en dehors
  useEffect(() => {
    if (!isEditing) return;

    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        handleClose();
      }
    };

    // Délai pour éviter de fermer immédiatement
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditing, localValue, value, fieldName, onChange]);

  const openEditor = useCallback(() => {
    setLocalValue(value || '');
    setIsEditing(true);
  }, [value]);

  const handleClick = useCallback(() => {
    if (editOn === 'click') openEditor();
  }, [editOn, openEditor]);

  const handleDoubleClick = useCallback(() => {
    if (editOn === 'doubleClick') openEditor();
  }, [editOn, openEditor]);

  // Mise à jour locale pour input simple
  const handleInputChange = useCallback((e) => {
    setLocalValue(e.target.value);
  }, []);

  // Mise à jour locale pour éditeur riche
  const handleRichTextChange = useCallback((content) => {
    setLocalValue(content);
  }, []);

  // Fermeture - notifier le parent si changé
  const handleClose = useCallback(() => {
    setIsEditing(false);
    if (localValue !== (value || '')) {
      // Si fieldName est fourni, on appelle onChange(fieldName, value)
      // Sinon on appelle onChange(value) directement
      if (fieldName !== undefined) {
        onChange(fieldName, localValue);
      } else {
        onChange(localValue);
      }
    }
  }, [localValue, value, fieldName, onChange]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      setLocalValue(value || '');
      setIsEditing(false);
    }
  }, [value]);

  // Mode édition
  if (isEditing) {
    if (multiline || richText) {
      // Éditeur riche pour multiline
      return (
        <div ref={containerRef} className="relative">
          <RichTextEditor
            value={localValue}
            onChange={handleRichTextChange}
            placeholder={placeholder}
          />
          <button
            onClick={handleClose}
            className="absolute -top-2 -right-2 bg-[#1e3a5f] text-white w-6 h-6 rounded-full text-xs hover:bg-[#2a4a6f] transition-colors shadow-md flex items-center justify-center"
            title="Fermer"
          >
            ✓
          </button>
        </div>
      );
    }

    // Input simple pour single line
    return (
      <div ref={containerRef}>
        <input
          ref={inputRef}
          type="text"
          value={localValue}
          onChange={handleInputChange}
          onBlur={handleClose}
          onKeyDown={handleKeyDown}
          className="w-full bg-white border-2 border-blue-400 rounded px-2 py-1 outline-none focus:border-blue-500"
          style={{ color: '#333' }}
          placeholder={placeholder}
        />
      </div>
    );
  }

  // Mode affichage
  const displayValue = value || '';
  const hasContent = displayValue.trim().length > 0 && displayValue !== '<p><br></p>';

  // Fonction pour afficher le HTML en texte
  const renderContent = () => {
    if (!hasContent) {
      return <span className={placeholderClassName}>{placeholder}</span>;
    }

    if (multiline || richText) {
      // Afficher le HTML rendu avec les styles pour listes et formatage
      return (
        <div 
          className="rich-content"
          dangerouslySetInnerHTML={{ __html: displayValue }}
        />
      );
    }

    return <span>{displayValue}</span>;
  };

  return (
    <div 
      ref={containerRef}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      className={[
        'min-h-[1.5em]',
        'rounded',
        'px-1',
        '-mx-1',
        'transition-colors',
        'cursor-text',
        displayVariant === 'hover' ? 'hover:bg-blue-50/50' : '',
        className,
      ].filter(Boolean).join(' ')}
      title={editOn === 'doubleClick' ? 'Double-cliquez pour éditer' : 'Cliquez pour éditer'}
    >
      {renderContent()}
    </div>
  );
}

export default EditableField;
