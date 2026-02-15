const { bootstrap } = require('./bootstrap');
const { createApp } = require('./createApp');

const PORT = 3000;

const { controllers } = bootstrap();
const app = createApp({ controllers });

app.listen(PORT, () => {
  console.log(`Servidor HotelSys (MySQL + Fotos) corriendo en http://localhost:${PORT}`);
});
