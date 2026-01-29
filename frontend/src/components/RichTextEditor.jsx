import { useMemo } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

/**
 * RichTextEditor - Éditeur de texte riche basé sur Quill
 * Permet : gras, italique, souligné, listes, etc.
 */
function RichTextEditor({ value, onChange, placeholder = 'Écrivez ici...' }) {
  // Configuration de la toolbar
  const modules = useMemo(() => ({
    toolbar: [
      // Formatage de texte
      ['bold', 'italic', 'underline', 'strike'],
      
      // Listes
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      
      // Indentation
      [{ 'indent': '-1' }, { 'indent': '+1' }],
      
      // Couleurs
      [{ 'color': [] }, { 'background': [] }],
      
      // Alignement
      [{ 'align': [] }],
      
      // Nettoyer le formatage
      ['clean']
    ],
  }), []);

  // Formats autorisés (list gère both ordered et bullet)
  const formats = [
    'bold', 'italic', 'underline', 'strike',
    'list', 'indent',
    'color', 'background',
    'align'
  ];

  return (
    <div className="rich-text-editor">
      <ReactQuill
        theme="snow"
        value={value || ''}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
      />
      <style>{`
        .rich-text-editor .ql-container {
          min-height: 100px;
          font-size: 14px;
          font-family: inherit;
          background: white;
        }
        .rich-text-editor .ql-editor {
          min-height: 80px;
          color: #333 !important;
        }
        .rich-text-editor .ql-editor * {
          color: inherit;
        }
        .rich-text-editor .ql-toolbar {
          border-top-left-radius: 6px;
          border-top-right-radius: 6px;
          background: #f8f9fa;
        }
        .rich-text-editor .ql-container {
          border-bottom-left-radius: 6px;
          border-bottom-right-radius: 6px;
        }
        .rich-text-editor .ql-editor.ql-blank::before {
          color: #999;
          font-style: italic;
        }
      `}</style>
    </div>
  );
}

export default RichTextEditor;
