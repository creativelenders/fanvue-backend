const fs = require('fs');
const { execSync } = require('child_process');

let content = fs.readFileSync('./src/controllers/automation.controller.ts', 'utf8');

content = content.replace('ppvCampaigns, bumpRules } from "../db/schema";', 'ppvCampaigns, bumpRules, keywordTriggers, messageGuardRules, socialFunnels } from "../db/schema";');

fs.writeFileSync('./src/controllers/automation.controller.ts', content);

try {
  execSync('npx tsc', { stdio: 'inherit' });
  console.log("All TS errors fixed!");
  
  execSync('rm fix-ts*.js');
} catch (e) {
  console.log("Still have errors...");
}
