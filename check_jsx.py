
import re

def check_balance(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    stack = []
    # Simple regex for finding tags. 
    # Captures: 1=Closing slash (/), 2=Tag Name, 3=Self-closing slash (/)
    tag_re = re.compile(r'<(/)?([a-zA-Z0-9\.]+)(?:[^>]*?(/)?)?>')

    for i, line in enumerate(lines):
        # Remove anything inside {...} to avoid confusion with JS logic (simplification)
        # This is flawed for complex JSX but might catch the div issue.
        # Actually, let's just parse tags.
        
        # We need to ignore tags inside strings or comments, but that's hard.
        # Let's try a naive approach first.
        
        matches = tag_re.finditer(line)
        for match in matches:
            is_closing = match.group(1) == '/'
            tag_name = match.group(2)
            is_self_closing = match.group(3) == '/'

            if tag_name in ['br', 'hr', 'img', 'input', 'link', 'meta']: # Void elements
                continue
                
            if is_self_closing:
                continue

            if is_closing:
                if not stack:
                    print(f"Error: Unexpected closing tag </{tag_name}> at line {i+1}")
                    return
                
                last_tag = stack.pop()
                if last_tag != tag_name:
                    print(f"Error: Mismatched closing tag. Expected </{last_tag}> but found </{tag_name}> at line {i+1}")
                    return
            else:
                stack.append(tag_name)

    if stack:
        print(f"Error: Unclosed tags at EOF: {stack}")
    else:
        print("Structure seems balanced.")

check_balance('c:/Aldo/PetMate/petmate-landing-mvp/pages/sitter.tsx')
