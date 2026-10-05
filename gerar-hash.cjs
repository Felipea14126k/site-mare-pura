const { scryptSync, randomBytes } = require("node:crypto");
const readline = require("node:readline");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question("Digite a nova senha: ", (senha) => {
  const salt = randomBytes(16);
  const hash = scryptSync(senha, salt, 64);
  console.log("\nSeu hash (copie tudo, inclusive o ':'):\n");
  console.log(salt.toString("hex") + ":" + hash.toString("hex"));
  rl.close();
});