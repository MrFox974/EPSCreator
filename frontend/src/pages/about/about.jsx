import { useLoaderData } from 'react-router-dom';

function About() {
  const { title = 'About' } = useLoaderData();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">{title}</h1>
      <p className="text-gray-600 max-w-2xl">
        Page À propos. Tu peux ajouter un loader pour précharger du contenu si besoin.
      </p>
    </div>
  );
}

export default About;
