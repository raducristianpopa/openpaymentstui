import { Project, SyntaxKind } from "ts-morph";

const MIGRATIONS_FILE = "./src/database/index.ts";

let name = process.argv[2];
if (!name) {
  console.log("Please provide a file name.");
  console.log("Usage: bun migration [name]");
  process.exit(1);
}

const project = new Project();
const sourceFile = project.addSourceFileAtPath(MIGRATIONS_FILE);

const variable = sourceFile.getVariableDeclarationOrThrow("MIGRATIONS");
const arr = variable.getInitializerIfKindOrThrow(
  SyntaxKind.ArrayLiteralExpression,
);

arr.addElement(`{ 
  name: ${JSON.stringify(YYYYMMDDhhmmss() + "_" + name)},
  sql: \`\`,
}`);

sourceFile.saveSync();
console.log(`Added migration "${name}" to migration list`);

function YYYYMMDDhhmmss() {
  const now = new Date();

  return (
    now.getUTCFullYear().toString() +
    (now.getUTCMonth() + 1).toString().padStart(2, "0") +
    now.getUTCDate().toString().padStart(2, "0") +
    now.getUTCHours().toString().padStart(2, "0") +
    now.getUTCMinutes().toString().padStart(2, "0") +
    now.getUTCSeconds().toString().padStart(2, "0")
  );
}
