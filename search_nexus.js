const fs = require('fs');
const path = require('path');

const excludeDirs = ['node_modules', '.git', '.angular', 'dist'];

function searchFiles(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (excludeDirs.includes(file)) continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchFiles(fullPath);
    } else if (file.endsWith('.ts') || file.endsWith('.html') || file.endsWith('.css') || file.endsWith('.js') || file.endsWith('.md')) {
      // Skip the search script itself
      if (file === 'search_nexus.js') continue;
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        if (line.toLowerCase().includes('nexus') || line.toLowerCase().includes('nxus')) {
          console.log(`${fullPath}:${index + 1}: ${line.trim()}`);
        }
      });
    }
  }
}

console.log('Searching for "nexus" or "nxus" in workspace...');
searchFiles(__dirname);
console.log('Search complete.');
