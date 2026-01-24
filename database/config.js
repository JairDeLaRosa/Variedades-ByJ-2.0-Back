const mongoose = require("mongoose");
require("dotenv").config();

const dbConection = async () => {
  try {
    await mongoose.connect(process.env.DB_CONECT);

    console.log("DB Online");
  } catch (err) {
    console.log(err);
    throw new Error("Error al conectar base de datos");
  }
};

module.exports = { dbConection };
