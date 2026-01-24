const express = require("express");
require("dotenv").config();
const { dbConection } = require("./database/config");
const cors = require("cors");

//Servidor express
const app = express();

//Base de datos
dbConection();

//Cords
app.use(cors());

//lectura y parseo del body
app.use(express.json());

//Rutas
app.use("/api/auth", require("./routes/auth"));

app.listen(process.env.PORT, () => {
  console.log("Servidor corriendo en el puerto " + process.env.PORT);
});
