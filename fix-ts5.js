const fs = require('fs');
const { execSync } = require('child_process');

let content = fs.readFileSync('./src/controllers/automation.controller.ts', 'utf8');

// Add ppvCampaigns to imports
content = content.replace('onboardingFunnels } from "../db/schema";', 'onboardingFunnels, ppvCampaigns } from "../db/schema";');

// Remove description from onboardingFunnels insert
content = content.replace(/description: "Onboarding for new subscribers",/g, '');

fs.writeFileSync('./src/controllers/automation.controller.ts', content);

try {
  execSync('npx tsc', { stdio: 'inherit' });
  console.log("All TS errors fixed!");
} catch (e) {
  console.log("Still have errors...");
}
