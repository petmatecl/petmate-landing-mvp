
const fs = require('fs');

const filename = 'c:/Aldo/PetMate/petmate-landing-mvp/pages/sitter.tsx';
const startLine = 669;
const endLine = 887;

const content = fs.readFileSync(filename, 'utf-8');
const lines = content.split('\n');

// Adjust for 0-based index
const startIdx = startLine - 1;
const endIdx = endLine; // Slice end is exclusive, match endLine inclusive if removing

console.log(`Replacing lines ${startLine} to ${endLine}`);
if (lines.length > startIdx) {
    console.log("First line to remove:", lines[startIdx].trim());
}
if (lines.length >= endIdx) {
    console.log("Last line to remove:", lines[endIdx - 1].trim());
}

const newContent = [
    '                            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">',
    '                                <h2 className="text-xl font-bold">Sidebar Placeholder</h2>',
    '                            </div>'
];

const finalLines = [...lines.slice(0, startIdx), ...newContent, ...lines.slice(endIdx)];

fs.writeFileSync(filename, finalLines.join('\n'), 'utf-8');
console.log("Replacement done.");
