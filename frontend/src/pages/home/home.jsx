import { useLoaderData } from 'react-router-dom';

function Home() {

    const { tests = [] } = useLoaderData();

    console.log('Home - Données reçues du loader:', tests);

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Table Test (IDs 1 à 10)</h1>
            
         
            {tests.length === 0 ? (
                <p className="text-gray-500">Aucune donnée trouvée</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border border-gray-300">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="px-4 py-2 border-b text-left">ID</th>
                                <th className="px-4 py-2 border-b text-left">User ID</th>
                                <th className="px-4 py-2 border-b text-left">Email</th>
                                <th className="px-4 py-2 border-b text-left">Password</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tests.map((test) => (
                                <tr key={test.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-2 border-b">{test.id}</td>
                                    <td className="px-4 py-2 border-b">{test.user_id || '-'}</td>
                                    <td className="px-4 py-2 border-b">{test.email || '-'}</td>
                                    <td className="px-4 py-2 border-b">{test.password ? '***' : '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default Home;
