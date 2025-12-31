
const fs = require('fs');

function checkBraceBalance(filename) {
    const content = fs.readFileSync(filename, 'utf-8');
    const stack = [];

    // Simple verification. Doesn't account for strings/comments fully but helpful.
    // We will iterate char by char.

    let inString = false;
    let stringChar = '';
    let inComment = false; // // style
    // /* */ style is harder.

    for (let i = 0; i < content.length; i++) {
        const char = content[i];

        // Handle comments and strings (simplistic)
        // ... (Skipping complex tokenizer for speed, risking false positives in strings)
        // Let's just ignore braces if presumably in string?
        // No, let's just count all and see if they match global count.

        if (['{', '(', '['].includes(char)) {
            stack.push({ char, index: i });
        } else if (['}', ')', ']'].includes(char)) {
            if (stack.length === 0) {
                console.log(`Error: Unexpected closing ${char} at index ${i}`);
                continue;
            }
            const last = stack.pop();
            const expected = last.char === '{' ? '}' : last.char === '(' ? ')' : ']';
            if (expected !== char) {
                console.log(`Error: Mismatched closing ${char} at index ${i}. Expected ${expected} for opening at index ${last.index}`);
                // return;
            }
        }
    }

    if (stack.length > 0) {
        console.log(`Error: Unclosed braces at EOF: ${JSON.stringify(stack.slice(-5))}`); // Show last 5
    } else {
        console.log("Braces verified balanced.");
    }
}

checkBraceBalance('c:/Aldo/PetMate/petmate-landing-mvp/pages/sitter.tsx');
