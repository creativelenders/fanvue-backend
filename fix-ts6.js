const fs = require('fs');
const { execSync } = require('child_process');

let content = fs.readFileSync('./src/controllers/automation.controller.ts', 'utf8');

// Add bumpRules
content = content.replace('ppvCampaigns } from "../db/schema";', 'ppvCampaigns, bumpRules } from "../db/schema";');

// Remove description lines
content = content.split('\n').filter(line => !line.includes('description:')).join('\n');

fs.writeFileSync('./src/controllers/automation.controller.ts', content);

try {
  execSync('npx tsc', { stdio: 'inherit' });
  console.log("All TS errors fixed!");
  
  // Clean up
  execSync('rm fix-ts*.js');
} catch (e) {
  console.log("Still have errors...");
}
