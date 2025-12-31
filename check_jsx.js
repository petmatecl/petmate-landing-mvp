
const fs = require('fs');

function checkBalance(filename) {
    const content = fs.readFileSync(filename, 'utf-8');
    const lines = content.split('\n');
    const stack = [];

    // Simple regex: <div ... >, </div>, <img ... />, <br />
    // Group 1: Closing /
    // Group 2: Tag Name
    // Group 3: Self-closing /
    const tagRe = /<(\/)?([a-zA-Z0-9\.]+)(?:[^>]*?(\/)?)?>/g;

    const voidTags = new Set(['br', 'hr', 'img', 'input', 'link', 'meta', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr']);

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let match;
        // Reset regex index for each line? No, regex is stateful if global. 
        // But here we create new regex or just match string.
        // Actually, matching line by line is safer for reporting line numbers.

        // We need to be careful about matching tags inside strings.
        // This simple parser will fail on complex cases, but might catch the div issue.

        while ((match = tagRe.exec(line)) !== null) {
            const isClosing = match[1] === '/';
            const tagName = match[2];
            const isSelfClosing = match[3] === '/';

            if (voidTags.has(tagName) || isSelfClosing) {
                continue;
            }

            if (isClosing) {
                if (stack.length === 0) {
                    console.log(`Error: Unexpected closing tag </${tagName}> at line ${i + 1}`);
                    return;
                }

                const lastTag = stack.pop();
                if (lastTag !== tagName) {
                    console.log(`Error: Mismatched closing tag. Expected </${lastTag}> but found </${tagName}> at line ${i + 1}`);
                    // return; // Keep going to see more errors? No, usually cascading.
                }
            } else {
                stack.push(tagName);
            }
        }
    }

    if (stack.length > 0) {
        console.log(`Error: Unclosed tags at EOF: ${JSON.stringify(stack)}`);
    } else {
        console.log("Structure seems balanced.");
    }
}

checkBalance('c:/Aldo/PetMate/petmate-landing-mvp/pages/sitter.tsx');
