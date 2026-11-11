// Generated client artifacts only; Alex's implementation/OpenAPI owns the contract.
import { readFile, writeFile } from 'node:fs/promises';
import openapiTS, { astToString } from 'openapi-typescript';

const source = new URL('../../fixtures/contracts/openapi.json', import.meta.url);
const schema = JSON.parse(await readFile(source, 'utf8'));
const header = '// Generated from fixtures/contracts/openapi.json. Run npm run generate:client. Do not edit.\n';
const outputs = [
  ['backend.d.ts', header + astToString(await openapiTS(schema, { defaultNonNullable: false }))],
  ['job-statuses.ts', header + `export const jobStatuses = ${JSON.stringify(schema.components.schemas.JobOut.properties.status.enum)} as const;\n`],
];
for (const [name, value] of outputs) {
  const target = new URL(name, import.meta.url);
  if (process.argv.includes('--check')) {
    if (await readFile(target, 'utf8').catch(() => '') !== value) throw new Error(`${name} is stale. Run npm run generate:client.`);
  } else await writeFile(target, value);
}
console.log(process.argv.includes('--check') ? 'Client contract is current.' : 'Generated client contract.');
