const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'pages/sitter.tsx');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

// Line numbers are 1-based, array indices are 0-based.
// Delete: 1738 to 1915.
// Insert After: 1934.

// Lines to Move (Services Block)
// Start Index: 1737 (Line 1738)
// End Index: 1914 (Line 1915)
const servicesBlockRange = { start: 1737, end: 1914 };

// Insert Point
// After Line 1934. Index 1933.
const insertPointIndex = 1933;

if (lines.length < 2000) {
    console.error("File seems too short, aborting to prevent damage.");
    process.exit(1);
}

const servicesBlock = lines.slice(servicesBlockRange.start, servicesBlockRange.end + 1);
const beforeBlock = lines.slice(0, servicesBlockRange.start);
const middleBlock = lines.slice(servicesBlockRange.end + 1, insertPointIndex + 1);
const afterBlock = lines.slice(insertPointIndex + 1);

// Reconstruct
const newContent = [
    ...beforeBlock,
    ...middleBlock,
    ...servicesBlock,
    ...afterBlock
].join('\n');

fs.writeFileSync(filePath, newContent, 'utf8');
console.log(`Moved ${servicesBlock.length} lines from ${servicesBlockRange.start + 1}-${servicesBlockRange.end + 1} to after ${insertPointIndex + 1}.`);
