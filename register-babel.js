require("@babel/register")({
  configFile: "./babel.config.js",
  exclude: [/node_modules\/(?![@leansdk\/leanes])/],
  ignore: [],
});
