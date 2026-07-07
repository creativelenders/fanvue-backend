const fs = require('fs');
const { execSync } = require('child_process');

// Fix traffic.controller.ts
let traffic = fs.readFileSync('./src/controllers/traffic.controller.ts', 'utf8');
traffic = traffic.replace('campaign: "Growth', 'utmCampaign: "Growth');
fs.writeFileSync('./src/controllers/traffic.controller.ts', traffic);

// Fix fans.controller.ts
let fans = fs.readFileSync('./src/controllers/fans.controller.ts', 'utf8');
fans = fans.replace('const sortCol = fans[sort as keyof typeof fans] || fans.score;', 'const sortCol = (fans as any)[sort] || fans.score;');
fans = fans.replace('const [newList] = await db.insert(require("../db/schema").fanLists)', 'const result = await db.insert(require("../db/schema").fanLists)');
fans = fans.replace('return reply.send({ success: true, data: newList });', 'return reply.send({ success: true, data: (result as any)[0] });');
fs.writeFileSync('./src/controllers/fans.controller.ts', fans);

// Fix workspaces.controller.ts
let workspaces = fs.readFileSync('./src/controllers/workspaces.controller.ts', 'utf8');
workspaces = workspaces.replace('await import("../db/client");', 'await import("../db/client.js");');
workspaces = workspaces.replace('await import("../db/schema");', 'await import("../db/schema/index.js");');
workspaces = workspaces.replace('await import("drizzle-orm");', 'await import("drizzle-orm/index.js");');
fs.writeFileSync('./src/controllers/workspaces.controller.ts', workspaces);

// Fix routes type mismatches by replacing FastifyRequest generics in controllers
const controllersToStrip = [
  './src/controllers/chat.controller.ts',
  './src/controllers/content.controller.ts',
  './src/controllers/prompts.controller.ts'
];
controllersToStrip.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/FastifyRequest<\{[^>]*\}>/g, 'FastifyRequest');
  fs.writeFileSync(file, content);
});

// Run tsc to see remaining errors
try {
  execSync('npx tsc', { stdio: 'inherit' });
  console.log("All TS errors fixed!");
} catch (e) {
  console.log("Still have errors...");
}
