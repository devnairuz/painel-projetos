// Seletor de repositório: Mongo quando conectado, senão memória (fallback).
const { memoryRepo } = require("./memoryRepo");
const { mongoRepo } = require("./mongoRepo");

let active = memoryRepo;

async function initRepo({ useMongo }) {
  active = useMongo ? mongoRepo : memoryRepo;
  await active.init();
  return active;
}

function getRepo() {
  return active;
}

module.exports = { initRepo, getRepo };
