const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const { validarCampos } = require("../middlewares/validar-campos");
const { validarJwt } = require("../middlewares/validar-jwt");
const {
  crearUsuario,
  loginUsuario,
  revalidarToken,
} = require("../controllers/auth");

router.post(
  "/",
  [
    //middelwares
    check("email", "El email es obligatorio").isEmail(),
    check("password", "El password debe ser de mas de 6 caracteres").isLength({
      min: 6,
    }),
    validarCampos,
  ],
  loginUsuario,
);

router.post(
  "/new",
  [
    //middelwares
    check("name", "El nombre es obligatorio").not().isEmpty(),
    check("email", "El email es obligatorio").isEmail(),
    check("password", "El password debe ser de mas de 6 caracteres").isLength({
      min: 6,
    }),
    validarCampos,
  ],
  crearUsuario,
);

router.get("/renew", validarJwt, revalidarToken);

module.exports = router;
