const fs = require('fs');
const { execSync } = require('child_process');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.ts')) results.push(file);
    }
  });
  return results;
}

const files = walk('./src/controllers').concat(walk('./src/routes'));

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/request\.user!\.workspaceId/g, '(request as any).workspaceId');
  content = content.replace(/req\.user!\.workspaceId/g, '(req as any).workspaceId');
  fs.writeFileSync(file, content);
});

// Fix workspaces controller
let ws = fs.readFileSync('./src/controllers/workspaces.controller.ts', 'utf8');
ws = ws.replace('import("../db/client")', 'import("../db/client.js")');
ws = ws.replace('import("../db/schema")', 'import("../db/schema/index.js")');
fs.writeFileSync('./src/controllers/workspaces.controller.ts', ws);

// Fix permission middleware
let perm = fs.readFileSync('./src/middleware/permission.middleware.ts', 'utf8');
perm = perm.replace(/req\.user!\.role/g, 'request.user!.role');
fs.writeFileSync('./src/middleware/permission.middleware.ts', perm);

try {
  execSync('npx tsc', { stdio: 'inherit' });
  console.log("All TS errors fixed!");
} catch (e) {
  console.log("Still have errors...");
}
