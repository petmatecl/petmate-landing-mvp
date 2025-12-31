
import os

filename = 'c:/Aldo/PetMate/petmate-landing-mvp/pages/sitter.tsx'
start_line = 669
end_line = 887

with open(filename, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Adjust for 0-based index
start_idx = start_line - 1
end_idx = end_line 

# Validate content?
print(f"Replacing lines {start_line} to {end_line}")
print("First line to remove:", lines[start_idx].strip())
print("Last line to remove:", lines[end_idx-1].strip())

new_content = [
    '                            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">\n',
    '                                <h2 className="text-xl font-bold">Sidebar Placeholder</h2>\n',
    '                            </div>\n'
]

final_lines = lines[:start_idx] + new_content + lines[end_idx:]

with open(filename, 'w', encoding='utf-8') as f:
    f.writelines(final_lines)

print("Replacement done.")
