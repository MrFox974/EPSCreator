// server.js (dev local)
const app = require('./app');

const PORT = process.env.PORT || 3000;


app.listen(process.env.SERVER_PORT, '0.0.0.0', () => {
  console.log(process.env.PROTOCOLE + "://" + process.env.CLIENT_IP );
});