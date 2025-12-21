import { useEffect } from "react"
import api from '../../../utils/api';

function Home() {

    useEffect(() => {

      postTest()

    }, [])

    const postTest = async () => {

      console.log(`${import.meta.env.VITE_PROTOCOLE}://${import.meta.env.VITE_SERVER_HOST}${import.meta.env.VITE_SERVER_PORT}/api/test/postTest`)

      const { data } = await api.post(`${import.meta.env.VITE_PROTOCOLE}://${import.meta.env.VITE_SERVER_HOST}${import.meta.env.VITE_SERVER_PORT}/api/test/postTest`, {
          
          test: "user",
          password: "chaine mot de passe"
          
      })

      console.log(data)

    }

  return (
  
    <>
  
        <div>
            <h1 className="text-red-500">Hello world</h1>
        </div>

    </>

  )
}

export default Home
