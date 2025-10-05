# 👥 **USER ROLES & PERMISSIONS GUIDE**

## **🔐 LOGIN CREDENTIALS**

### **✅ WORKING LOGIN ACCOUNTS:**

| **Role** | **Username** | **Email** | **Password** | **Access Level** |
|----------|--------------|-----------|--------------|------------------|
| **Super Admin** | admin | admin@savingsgroup.com | any | **FULL SYSTEM ACCESS** |
| **Admin** | david_member | david@email.com | any | **MULTI-GROUP OVERSIGHT** |
| **Admin** | grace_member | grace@email.com | any | **MULTI-GROUP OVERSIGHT** |
| **Chairperson** | mary_chair | mary@email.com | any | **GROUP LEADERSHIP** |
| **Secretary** | sarah_secretary | sarah@email.com | any | **MEETING & RECORDS** |
| **Treasurer** | john_treasurer | john@email.com | any | **FINANCIAL MANAGEMENT** |
| **Member** | peter_member | peter@email.com | any | **PERSONAL DASHBOARD** |
| **Member** | jane_member | jane@email.com | any | **PERSONAL DASHBOARD** |

---

## **🎯 ROLE PERMISSIONS BREAKDOWN**

### **🔑 SUPER ADMIN (admin@savingsgroup.com)**
**UNIQUE RIGHTS:**
- ✅ **System Management** - Full database access, user creation/deletion
- ✅ **All Groups Access** - View and manage ALL savings groups
- ✅ **User Management** - Create, edit, delete any user account
- ✅ **System Reports** - Database statistics, performance metrics
- ✅ **Global Settings** - System configuration and maintenance
- ✅ **Financial Oversight** - View all group finances across the system
- ✅ **Meeting Scheduler** - Schedule meetings for ANY group
- ✅ **Data Export** - Export system-wide data and reports

**DASHBOARD FEATURES:**
- System Overview with real-time database stats
- All groups management interface
- User creation and role assignment
- System-wide financial reports
- Global meeting scheduler

---

### **👑 ADMIN (david@email.com, grace@email.com)**
**UNIQUE RIGHTS:**
- ✅ **Multi-Group Oversight** - Manage multiple assigned groups
- ✅ **Regional Management** - Oversee groups in specific regions
- ✅ **Group Creation** - Create new savings groups
- ✅ **Member Management** - Add/remove members from groups
- ✅ **Financial Reports** - View financial data for assigned groups
- ✅ **Meeting Scheduler** - Schedule meetings for assigned groups
- ❌ **System Settings** - Cannot modify system configuration
- ❌ **User Creation** - Cannot create new user accounts

**DASHBOARD FEATURES:**
- Multi-group performance dashboard
- Regional analytics and reports
- Group creation and management tools
- Member oversight across groups
- Financial tracking for assigned groups

---

### **👑 CHAIRPERSON (mary@email.com)**
**UNIQUE RIGHTS:**
- ✅ **Group Leadership** - Full control over their specific group
- ✅ **Meeting Scheduler** - MS Teams-like meeting scheduling
- ✅ **Member Management** - View member performance, attendance
- ✅ **Financial Overview** - View group finances (not detailed transactions)
- ✅ **Loan Approvals** - Approve/reject loan applications
- ✅ **Group Decisions** - Initiate voting on group matters
- ✅ **Cycle Management** - Start/end savings cycles
- ❌ **Other Groups** - Cannot access other groups' data
- ❌ **User Creation** - Cannot create new accounts

**DASHBOARD FEATURES:**
- Group performance metrics
- Meeting scheduler with auto-invitations
- Member attendance and eligibility tracking
- Loan application review interface
- Group voting and decision tools

---

### **📝 SECRETARY (sarah@email.com)**
**UNIQUE RIGHTS:**
- ✅ **Meeting Management** - Schedule and document meetings
- ✅ **Record Keeping** - Meeting minutes, attendance tracking
- ✅ **Member Records** - Detailed participation tracking
- ✅ **Document Management** - Upload/manage group documents
- ✅ **Activity Tracking** - Record meeting activities and outcomes
- ✅ **Attendance Reports** - Generate attendance summaries
- ❌ **Financial Transactions** - Cannot handle money directly
- ❌ **Loan Processing** - Cannot approve loans

**DASHBOARD FEATURES:**
- Meeting scheduler and management
- Attendance tracking interface
- Document upload and management
- Meeting minutes templates
- Member participation reports

---

### **💰 TREASURER (john@email.com)**
**UNIQUE RIGHTS:**
- ✅ **Financial Management** - Complete money handling authority
- ✅ **Savings Tracking** - Record individual and group savings
- ✅ **Loan Processing** - Disburse loans, track repayments
- ✅ **Cashbook Management** - Real-time financial transactions
- ✅ **Fine Collection** - Record and track fines
- ✅ **Cycle Calculations** - Calculate share-outs and profits
- ✅ **Financial Reports** - Generate detailed financial statements
- ❌ **Meeting Scheduling** - Cannot schedule meetings
- ❌ **Member Management** - Cannot add/remove members

**DASHBOARD FEATURES:**
- Complete financial dashboard
- Savings and loan management interface
- Real-time cashbook with transactions
- Loan eligibility calculator
- Financial reporting tools

---

### **👤 MEMBER (peter@email.com, jane@email.com)**
**UNIQUE RIGHTS:**
- ✅ **Personal Dashboard** - View their own savings, loans, attendance
- ✅ **Meeting Invitations** - Receive and respond to meeting invites
- ✅ **Personal Records** - View their transaction history
- ✅ **Loan Applications** - Apply for loans (if eligible)
- ✅ **Group Information** - View their group's basic information
- ✅ **Voting Participation** - Vote on group matters
- ❌ **Other Members' Data** - Cannot see other members' finances
- ❌ **Group Management** - Cannot manage group operations
- ❌ **Meeting Scheduling** - Cannot schedule meetings

**DASHBOARD FEATURES:**
- Personal savings and loan overview
- Meeting invitations with RSVP
- Attendance rate and loan eligibility
- Personal transaction history
- Group membership information

---

## **🔄 PERMISSION HIERARCHY**

```
SUPER ADMIN (Full System Access)
    ↓
ADMIN (Multi-Group Management)
    ↓
GROUP OFFICERS (Single Group Management)
├── CHAIRPERSON (Leadership & Decisions)
├── SECRETARY (Records & Meetings)
└── TREASURER (Financial Management)
    ↓
MEMBERS (Personal Dashboard Only)
```

---

## **🎮 HOW TO TEST DIFFERENT ROLES**

### **1. LOGIN AS SUPER ADMIN:**
```
Email: admin@savingsgroup.com
Password: any
Expected: Full system dashboard with all groups and users
```

### **2. LOGIN AS CHAIRPERSON:**
```
Email: mary@email.com
Password: any
Expected: Group leadership dashboard with meeting scheduler
```

### **3. LOGIN AS TREASURER:**
```
Email: john@email.com
Password: any
Expected: Financial management dashboard with cashbook
```

### **4. LOGIN AS SECRETARY:**
```
Email: sarah@email.com
Password: any
Expected: Meeting and records management dashboard
```

### **5. LOGIN AS MEMBER:**
```
Email: peter@email.com
Password: any
Expected: Personal dashboard with savings and meeting invitations
```

---

## **🚀 KEY DIFFERENCES SUMMARY**

| **Feature** | **Super Admin** | **Admin** | **Chairperson** | **Secretary** | **Treasurer** | **Member** |
|-------------|-----------------|-----------|-----------------|---------------|---------------|------------|
| **System Overview** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **All Groups Access** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **User Management** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Meeting Scheduler** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Financial Management** | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| **Member Management** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Personal Dashboard** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**🎯 Each role sees a completely different interface tailored to their responsibilities and permissions!**
