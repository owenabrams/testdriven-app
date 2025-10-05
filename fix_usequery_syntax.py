import os
import re

def fix_usequery_syntax(file_path):
    """Fix useQuery syntax from v4 to v5 format"""
    try:
        with open(file_path, 'r') as f:
            content = f.read()
        
        original_content = content
        
        # Pattern 1: useQuery('string', function, options)
        pattern1 = r"useQuery\(\s*['\"]([^'\"]+)['\"]\s*,\s*([^,]+),\s*(\{[^}]*\})\s*\)"
        def replace1(match):
            key = match.group(1)
            fn = match.group(2)
            options = match.group(3)
            return f"useQuery({{\n    queryKey: ['{key}'],\n    queryFn: {fn},\n    {options[1:-1]}\n  }})"
        
        content = re.sub(pattern1, replace1, content, flags=re.DOTALL)
        
        # Pattern 2: useQuery(['array'], function, options)
        pattern2 = r"useQuery\(\s*(\[[^\]]+\])\s*,\s*([^,]+),\s*(\{[^}]*\})\s*\)"
        def replace2(match):
            key = match.group(1)
            fn = match.group(2)
            options = match.group(3)
            return f"useQuery({{\n    queryKey: {key},\n    queryFn: {fn},\n    {options[1:-1]}\n  }})"
        
        content = re.sub(pattern2, replace2, content, flags=re.DOTALL)
        
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
    'client/src/components/Admin/AdminStatsCards.js',
    'client/src/components/Groups/GroupMembers.js',
    'client/src/pages/Groups/GroupsPage.js',
    'client/src/pages/SavingsGroups/MySavings/MySavingsPage.js',
    'client/src/pages/Notifications/NotificationsPage.js'
]

fixed_count = 0
for file_path in files_to_fix:
    if os.path.exists(file_path):
        if fix_usequery_syntax(file_path):
            fixed_count += 1
    else:
        print(f"❌ File not found: {file_path}")

print(f"\n🎉 Fixed {fixed_count} files!")
