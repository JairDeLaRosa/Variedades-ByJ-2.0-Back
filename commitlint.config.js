module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-enum": [
      1,
      "always",
      [
        "auth",
        "ventas",
        "salidas",
        "productos",
        "files",
        "cloudinary",
        "db",
        "api",
        "deps",
        "ci",
        "docs",
      ],
    ],
    "header-max-length": [2, "always", 72],
  },
};
