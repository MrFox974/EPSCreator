import EditableField from './EditableField';

/**
 * SituationCard - Carte réutilisable pour afficher une situation
 * (échauffement, apprentissage, finale)
 */
function SituationCard({ 
  situation, 
  index, 
  type, // 'echauffement' | 'apprentissage' | 'finale'
  color, // couleur du bandeau (ex: '#e74c3c', '#5dade2')
  onFieldChange,
  onDelete,
  canDelete = true
}) {
  // Titres selon le type
  const titles = {
    echauffement: "Situation d'échauffement",
    apprentissage: "Situation d'apprentissage",
    finale: "Situation finale"
  };

  const title = `${titles[type]} ${index + 1}`;

  // Composant pour éditer un champ de la situation
  const SituationField = ({ fieldName }) => (
    <EditableField
      value={situation[fieldName] || ''}
      onChange={(_, value) => onFieldChange(index, fieldName, value)}
      fieldName={fieldName}
      multiline={true}
      placeholder="Double-cliquez pour éditer..."
    />
  );

  return (
    <div className="mb-4">
      <div 
        className="px-4 py-2 rounded-t-md flex items-center justify-between"
        style={{ backgroundColor: color }}
      >
        <h4 className="text-white font-semibold text-sm">{title}</h4>
        {canDelete && (
          <button
            onClick={() => onDelete(index)}
            className="text-white/80 hover:text-white hover:bg-white/20 w-6 h-6 rounded flex items-center justify-center transition-colors"
            title="Supprimer cette situation"
          >
            −
          </button>
        )}
      </div>
      <div 
        className="border-2 border-t-0 rounded-b-md overflow-hidden"
        style={{ borderColor: color }}
      >
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b border-gray-200">
              <td className="bg-[#d9edf7] px-4 py-3 font-semibold text-[#1e3a5f] w-1/3 border-r border-gray-200">BUT</td>
              <td className="px-4 py-3 bg-white"><SituationField fieldName="but" /></td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="bg-[#d9edf7] px-4 py-3 font-semibold text-[#1e3a5f] border-r border-gray-200">CONSIGNE</td>
              <td className="px-4 py-3 bg-white"><SituationField fieldName="consigne" /></td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="bg-[#d9edf7] px-4 py-3 font-semibold text-[#1e3a5f] border-r border-gray-200">CRITERES DE REUSSITE</td>
              <td className="px-4 py-3 bg-white"><SituationField fieldName="criteres_reussite" /></td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="bg-[#d9edf7] px-4 py-3 font-semibold text-[#1e3a5f] border-r border-gray-200">CRITERES DE REALISATION</td>
              <td className="px-4 py-3 bg-white"><SituationField fieldName="criteres_realisation" /></td>
            </tr>
            <tr>
              <td className="bg-[#d9edf7] px-4 py-3 font-semibold text-[#1e3a5f] border-r border-gray-200">AMÉNAGEMENT</td>
              <td className="px-4 py-3 bg-white"><SituationField fieldName="amenagement" /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default SituationCard;
