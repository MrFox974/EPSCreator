# Sommaire :

-	[ Créer un projet de A à Z ](#1-créer-un-projet-de-a-à-z)
-	[Installer le frontend (React) sur Amplify]()
-	[Installer le backend (Nodejs) sur Lambda]()
-	[Installer la base de données sur RDS MySQL]()
-	[Les packages de base]()

## 1. Créer un projet de A à Z
### 1.	Créer le backend (Node JS)

Ouvrir VSCode, ouvrir un dossier (équivalent nouveau projet dans VS Code).
Créer 2 dossiers un ```/frontend``` et un ```/backend```.
On ouvre le backend et on initialise un nouveau projet nodejs dans l'invite de commande de VSCode (on pensera à bien se situer dans le backend ```cd /backend```

```
npm init
```

On installe la base à savoir expressjs

```
npm install express
```
Vont automatiquement se créer les fichiers ```pacjage.json``` et ```package-lock.json``` ainsi que le dossier ```node_modules```
On créer un dossier ```app.js``` dans lequel on insère le code de base :

```js
const express = require('express')
const app = express()

app.get('/', (req, res) => {

res.json({statut : 'OK' })

})

app.listen(8080, () => {
	console.log('Server running on port : 8080' )
}) 


```

Enfin pour lancer le serveur tu tape :
```
node app.js
```
Le serveur backend est lancé ! ```> Server running on port : 8080```

###  2.	Créer le frontend (React JS)

Le dossier ```/frontend``` a été créé. Maintenant on se rend à l'intérieur ```cd /frontend``` et on l'ouvre dans l'invite de commande.
A l'intérieur de ce dernier on va initialiser un nouveau projet vite.
```
npm create vite@latest . -- --template react
```
Normalement, il devrait te demander quelques infos et de l'instaler. Tu suis la procédure.
enfin, le démarer.
```
npm run dev
```
