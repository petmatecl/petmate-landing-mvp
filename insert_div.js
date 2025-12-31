
const fs = require('fs');

const filename = 'c:/Aldo/PetMate/petmate-landing-mvp/pages/sitter.tsx';
const insertLine = 1625; // 1-based

const content = fs.readFileSync(filename, 'utf-8');
const lines = content.split('\n');

// Adjust for 0-based index
const insertIdx = insertLine - 1;

console.log(`Inserting </div> at line ${insertLine}`);
if (lines.length > insertIdx) {
    console.log("Context before:", lines[insertIdx - 1]);
}

const newLines = [...lines.slice(0, insertIdx), '                </div>', ...lines.slice(insertIdx)];

fs.writeFileSync(filename, newLines.join('\n'), 'utf-8');
console.log("Insertion done.");
