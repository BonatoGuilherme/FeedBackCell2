const especificacoesService = require("../services/especificacoesService");

const PERMITIDOS = /^[\p{L}\p{N} ._+()\-/]*$/u;

function limpar(valor) {
  return typeof valor === "string" ? valor.replace(/\s+/g, " ").trim() : "";
}

// GET /celulares/especificacoes?marca=Samsung&modelo=Galaxy%20S24
// (aceita também ?q=Galaxy%20S24, tratado como modelo sem marca)
async function buscar(req, res, next) {
  const marca = limpar(req.query.marca);
  const modelo = limpar(req.query.modelo) || limpar(req.query.q);

  if (modelo.length < 1 || modelo.length > 120 || marca.length > 80 || `${marca}${modelo}`.length < 2) {
    return res.status(400).json({ erro: "Informe marca e modelo do celular." });
  }
  if (!PERMITIDOS.test(marca) || !PERMITIDOS.test(modelo)) {
    return res.status(400).json({ erro: "O nome do celular contém caracteres inválidos." });
  }

  try {
    const somente3d = req.query.somente3d === "1";
    return res.status(200).json(await especificacoesService.buscarEspecificacoes({ marca, modelo, somente3d }));
  } catch (error) {
    return next(error);
  }
}

module.exports = { buscar };
