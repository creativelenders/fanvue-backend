const fs = require('fs');
const glob = require('glob'); // wait, node doesn't have glob built in. I'll just read dir.
const path = require('path');

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
  // Fix request.user.id -> request.user!.sub
  content = content.replace(/request\.user\.id/g, 'request.user!.sub');
  content = content.replace(/req\.user\.id/g, 'req.user!.sub');
  
  // Fix request.user.workspaceId -> request.user!.workspaceId
  content = content.replace(/request\.user\.workspaceId/g, 'request.user!.workspaceId');
  content = content.replace(/req\.user\.workspaceId/g, 'req.user!.workspaceId');
  
  // Fix request.user possibly undefined for other properties
  content = content.replace(/request\.user\./g, 'request.user!.');
  content = content.replace(/req\.user\./g, 'req.user!.');

  fs.writeFileSync(file, content);
});
console.log("Fixed user references.");
