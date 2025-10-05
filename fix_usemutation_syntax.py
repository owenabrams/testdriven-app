import os
import re

def fix_usemutation_syntax(file_path):
    """Fix useMutation syntax from v4 to v5 format"""
    try:
        with open(file_path, 'r') as f:
            content = f.read()
        
        original_content = content
        
        # Pattern: useMutation(function, options)
        # This is more complex because we need to handle multi-line patterns
        pattern = r'useMutation\(\s*([^,]+),\s*(\{[^}]*(?:\{[^}]*\}[^}]*)*\})\s*\)'
        
        def replace_mutation(match):
            fn = match.group(1).strip()
            options = match.group(2).strip()
            
            # Remove the outer braces from options and add mutationFn
            options_inner = options[1:-1].strip()
            
            return f'useMutation({{\n    mutationFn: {fn},\n    {options_inner}\n  }})'
        
        # Use DOTALL flag to handle multiline patterns
        content = re.sub(pattern, replace_mutation, content, flags=re.DOTALL)
        
        if content != original_content:
            with open(file_path, 'w') as f:
                f.write(content)
            print(f"✅ Fixed: {file_path}")
            return True
        else:
            print(f"⏭️  No changes needed: {file_path}")
            return False
            
    except Exception as e:
        print(f"❌ Error fixing {file_path}: {e}")
        return False

# Files that need fixing based on our search
files_to_fix = [
    'client/src/components/Loans/LoanApplicationForm.js',
    'client/src/components/Admin/MemberManagement.js',
    'client/src/components/Admin/FinancialSupport.js',
    'client/src/components/Admin/GroupOversight.js',
    'client/src/components/Groups/CreateGroupDialog.js',
    'client/src/components/Groups/GroupMembers.js',
    'client/src/pages/Notifications/NotificationsPage.js'
]

fixed_count = 0
for file_path in files_to_fix:
    if os.path.exists(file_path):
        if fix_usemutation_syntax(file_path):
            fixed_count += 1
    else:
        print(f"❌ File not found: {file_path}")

print(f"\n🎉 Fixed {fixed_count} files!")
