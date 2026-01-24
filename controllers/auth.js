const { response } = require("express");
const Usuario = require("../models/Usuario");
const bcrypt = require("bcryptjs");
const { generarJwt } = require("../helpers/jwt");

const loginUsuario = async (req, res = response) => {
  const { email, password } = req.body;

  try {
    let usuarioFind = await Usuario.findOne({ email });

    if (!usuarioFind) {
      return res.status(401).json({
        ok: false,
        msg: "No existe usuario con ese email.",
      });
    }

    //Confirmar Password
    const validPassword = bcrypt.compareSync(password, usuarioFind.password);

    if (!validPassword) {
      return res.status(401).json({
        ok: false,
        msg: "Contraseña incorrecta.",
      });
    }

    //Generar JWT
    const token = await generarJwt(usuarioFind.id, usuarioFind.name);

    res.status(200).json({
      ok: true,
      msg: "Login exitoso!",
      uid: usuarioFind.id,
      name: usuarioFind.name,
      admin: usuarioFind.admin,
      token,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      ok: false,
      msg: "Error por favor hable con el administrador.",
    });
  }
};

const crearUsuario = async (req, res = response) => {
  const { email, password } = req.body;
  try {
    let usuarioFind = await Usuario.findOne({ email });

    if (usuarioFind) {
      return res.status(400).json({
        ok: false,
        msg: "Un usuario ya existe con ese email.",
      });
    }
    const usuario = new Usuario(req.body);

    //Encriptar contraseña
    const salt = bcrypt.genSaltSync();
    usuario.password = bcrypt.hashSync(password, salt);
    usuario.admin = false;

    await usuario.save();

    //Generar JWT
    const token = await generarJwt(usuario.id, usuario.name);

    res.status(201).json({
      ok: true,
      uid: usuario.id,
      name: usuario.name,
      token,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      ok: false,
      msg: "Error por favor hable con el administrador.",
    });
  }
};

const revalidarToken = async (req, res = response) => {
  const uid = req.uid;
  const name = req.name;

  //Generar JWT
  const token = await generarJwt(uid, name);

  res.json({
    ok: true,
    token,
  });
};

module.exports = { crearUsuario, loginUsuario, revalidarToken };
