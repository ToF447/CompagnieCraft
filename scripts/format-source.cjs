/** Development-only formatter. Refuse any change to the executable syntax tree. */
const fs = require('node:fs');
const path = require('node:path');
const acorn = require('acorn');
const prettier = require('prettier');

const root = path.resolve(__dirname, '..');
const check = process.argv.includes('--check');

function sources(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith('.') || ['server', 'assets', 'node_modules'].includes(entry.name))
      return [];
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? sources(file) : /\.(?:js|mjs|cjs)$/.test(file) ? [file] : [];
  });
}

function executableTree(source, file) {
  const ast = acorn.parse(source, {
    ecmaVersion: 'latest',
    sourceType: file.endsWith('.mjs') ? 'module' : 'script',
    allowHashBang: true,
  });
  // Prettier can regroup a && (b && c) as (a && b) && c. Flatten only
  // logical operators: their order and short-circuit behavior are unchanged.
  // Never flatten arithmetic, whose rounding/coercion may depend on grouping.
  function normalize(node) {
    if (!node || typeof node !== 'object') return node;
    if (Array.isArray(node)) return node.map(normalize);
    if (node.type === 'LogicalExpression') {
      const terms = [];
      const collect = (part) => {
        if (part.type === 'LogicalExpression' && part.operator === node.operator) {
          collect(part.left);
          collect(part.right);
        } else terms.push(normalize(part));
      };
      collect(node);
      return { type: 'LogicalExpression', operator: node.operator, terms };
    }
    const result = Object.fromEntries(
      Object.entries(node).map(([key, value]) => [key, normalize(value)]),
    );
    if (node.type === 'Property' && !node.computed && node.key.type === 'Identifier') {
      result.key = { type: 'Literal', value: node.key.name };
    }
    if (node.type === 'Property' && !node.computed && node.key.type === 'Literal') {
      result.key = { type: 'Literal', value: String(node.key.value) };
    }
    return result;
  }
  return JSON.stringify(normalize(ast), (key, value) => {
    if (['start', 'end', 'raw'].includes(key)) return undefined;
    return typeof value === 'bigint' ? value.toString() : value;
  });
}

async function main() {
  let changed = 0;
  const files = [
    ...['dist', 'worker', 'scripts'].flatMap((name) => sources(path.join(root, name))),
    ...fs
      .readdirSync(root)
      .filter((name) => /\.(?:cjs|mjs)$/.test(name))
      .map((name) => path.join(root, name)),
  ];
  for (const file of files) {
    const before = fs.readFileSync(file, 'utf8');
    const after = await prettier.format(before, {
      filepath: file,
      printWidth: 100,
      singleQuote: true,
      trailingComma: 'all',
    });
    if (executableTree(before, file) !== executableTree(after, file)) {
      throw new Error(
        `${path.relative(root, file)}: executable syntax changed; file left untouched`,
      );
    }
    if (before === after) continue;
    changed++;
    if (!check) fs.writeFileSync(file, after);
  }
  console.log(
    `${files.length} source files checked; ${changed} ${check ? 'need formatting' : 'formatted'}; executable syntax preserved.`,
  );
  if (check && changed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
