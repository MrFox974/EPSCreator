// server.js (dev local)
const app = require('./app');

const PORT = process.env.PORT || 3000;


app.listen(process.env.SERVER_PORT, process.env.SERVER_HOST, () => {
  console.log(process.env.PROTOCOLE + "://" + process.env.SERVER_HOST );
});