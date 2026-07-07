const fs = require('fs');
const { execSync } = require('child_process');

let content = fs.readFileSync('./src/controllers/automation.controller.ts', 'utf8');

// Find all require("../db/schema").TABLE
const matches = content.match(/require\("\.\.\/db\/schema"\)\.([a-zA-Z0-9_]+)/g);
if (matches) {
  const tables = [...new Set(matches.map(m => m.split('.')[1]))];
  
  // Add to import
  content = content.replace('import { conversationFlows, autopilotConfig } from "../db/schema";', 
    `import { conversationFlows, autopilotConfig, ${tables.join(', ')} } from "../db/schema";`);
    
  // Replace in code
  content = content.replace(/require\("\.\.\/db\/schema"\)\./g, '');
  
  fs.writeFileSync('./src/controllers/automation.controller.ts', content);
}

try {
  execSync('npx tsc', { stdio: 'inherit' });
  console.log("All TS errors fixed!");
} catch (e) {
  console.log("Still have errors...");
}
