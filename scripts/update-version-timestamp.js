const fs = require('fs');
const path = require('path');

// Read package.json
const packagePath = path.join(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// Get current timestamp in format:// 生成时间戳（格式：YYYYMMDD-HHMM）
const now = new Date();
const year = now.getFullYear();
const month = String(now.getMonth() + 1).padStart(2, '0');
const day = String(now.getDate()).padStart(2, '0');
const hours = String(now.getHours()).padStart(2, '0');
const minutes = String(now.getMinutes()).padStart(2, '0');

const timestamp = `${year}${month}${day}-${hours}${minutes}`;
console.log(`Generated timestamp: ${timestamp}`);
// Update version with timestamp
const baseVersion = packageJson.version.split('-')[0]; // Get base version (e.g., "1.0.0")
packageJson.version = `${baseVersion}-${timestamp}`;

// Write back to package.json
fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');

console.log(`✅ Updated version to: ${packageJson.version}`);
