const parseAdminUserIds = (value) => {
  if (!value || !value.trim()) {
    return new Set();
  }

  const entries = value.split(",").map((entry) => entry.trim());
  const validIds = entries.every(
    (entry) => /^[1-9]\d*$/.test(entry) && Number.isSafeInteger(Number(entry)),
  );

  if (!validIds) {
    throw new Error("ADMIN_USER_IDS must contain comma-separated positive user IDs");
  }

  return new Set(entries.map(Number));
};

const adminUserIds = parseAdminUserIds(process.env.ADMIN_USER_IDS);

const requireAdmin = (req, res, next) => {
  if (adminUserIds.size === 0) {
    return res.status(503).json({
      erro: "O acesso administrativo não está configurado",
    });
  }

  if (!adminUserIds.has(Number(req.userId))) {
    return res.status(403).json({
      erro: "Acesso restrito a administradores",
    });
  }

  return next();
};

module.exports = requireAdmin;
