require("dotenv").config();
const jwt = require("jsonwebtoken");
const { response, request } = require("express");

const validarJwt = (req = request, res = response, next) => {
  const token = req.header("x-token");

  if (!token) {
    return res.status(401).json({
      ok: false,
      msg: "No hay token en la petición",
    });
  }
  try {
    const payload = jwt.verify(token, process.env.SECRET_JWT_SEED);

    req.uid = payload.uid;
    req.name = payload.name;
    console.log(payload);
  } catch (err) {
    return res.status(401).json({
      ok: false,
      msg: "Token no válido",
    });
  }
  console.log(token);
  next();
};

module.exports = { validarJwt };
