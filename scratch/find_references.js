const fs = require('fs');
const path = require('path');

function searchDir(dir, terms) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file === 'dist' || file === '.git') continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchDir(fullPath, terms);
    } else if (/\.(js|ts|json|html|css|md|env)$/.test(file)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const term of terms) {
        if (content.toLowerCase().includes(term.toLowerCase())) {
          console.log(`Found "${term}" in ${fullPath}`);
        }
      }
    }
  }
}

searchDir('c:/Users/Vatsal/grownxCRM/CRM-Project', ['apextech', 'user@grownox.com', 'Funnel Tracker']);
