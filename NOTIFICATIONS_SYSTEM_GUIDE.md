# System-Wide Notifications - Developer Guide

## 🔔 **Quick Start**

### **Frontend Usage:**
```javascript
import { useNotifications } from '../contexts/NotificationContext';

function MyComponent() {
  const { notifySuccess, notifySavingsActivity, unreadCount } = useNotifications();
  
  // Simple notification
  await notifySuccess("Transaction completed!");
  
  // Activity-specific notification
  await notifySavingsActivity("Savings recorded", groupId, `/groups/${groupId}`);
  
  // Show unread count
  return <Badge badgeContent={unreadCount}>🔔</Badge>;
}
```

### **Backend Usage:**
```python
from project.api.notifications import create_system_notification

# Create notification
create_system_notification(
    user_id=user.id,
    message="Your loan has been approved",
    notification_type='success',
    title='Loan Approved'
)
```

## 📡 **API Endpoints**

### **Get User Notifications:**
```bash
GET /notifications/user/{user_id}
Authorization: Bearer {token}
```

### **Get Unread Count:**
```bash
GET /notifications/user/{user_id}/unread-count
Authorization: Bearer {token}
```

### **Mark as Read:**
```bash
POST /notifications/{notification_id}/read
Authorization: Bearer {token}
```

### **Create Notification:**
```bash
POST /notifications
Authorization: Bearer {token}
Content-Type: application/json

{
  "userId": 3,
  "message": "Your savings has been recorded",
  "title": "Savings Deposited",
  "type": "success"
}
```

## 🎨 **Notification Types**

| Type | Color | Icon | Usage |
|------|-------|------|-------|
| `info` | Blue | ℹ️ | General information |
| `success` | Green | ✅ | Successful operations |
| `warning` | Orange | ⚠️ | Important alerts |
| `error` | Red | ❌ | Error messages |

## 📋 **Pre-built Templates**

### **Authentication:**
```javascript
NotificationTemplates.LOGIN_SUCCESS(username)
NotificationTemplates.LOGOUT_SUCCESS()
```

### **Savings Groups:**
```javascript
NotificationTemplates.GROUP_JOINED(groupName)
NotificationTemplates.SAVINGS_DEPOSITED(amount, groupName)
NotificationTemplates.MEETING_REMINDER(groupName, date)
```

### **Loans:**
```javascript
NotificationTemplates.LOAN_APPROVED(amount)
NotificationTemplates.LOAN_REPAYMENT_DUE(amount, dueDate)
```

### **System:**
```javascript
NotificationTemplates.SYSTEM_MAINTENANCE(startTime, duration)
NotificationTemplates.SECURITY_ALERT(action)
```

## 🔧 **Helper Functions**

### **Notify Multiple Users:**
```javascript
// Notify all group members
await NotificationHelpers.notifyGroupMembers(
  groupMembers,
  NotificationTemplates.MEETING_REMINDER(groupName, date)
);

// Notify only officers
await NotificationHelpers.notifyGroupOfficers(
  groupMembers,
  NotificationTemplates.LOAN_APPROVED(amount)
);
```

### **Batch Operations:**
```javascript
// Notify multiple users with same message
await NotificationHelpers.notifyUsers(
  [userId1, userId2, userId3],
  NotificationTemplates.SYSTEM_UPDATE(version)
);
```

## 🎯 **Real-time Features**

### **Auto-refresh:**
- Notifications refresh every 30 seconds
- Unread count updates automatically
- Toast notifications for new items

### **Toast Notifications:**
```javascript
// Automatic toast for new notifications
// Configured in NotificationContext.js
// Shows for 6 seconds with appropriate styling
```

## 📱 **UI Components**

### **Notification Badge:**
```javascript
// Already integrated in Layout.js
<IconButton onClick={() => navigate('/notifications')}>
  <Badge badgeContent={unreadCount} color="error">
    <NotificationsIcon />
  </Badge>
</IconButton>
```

### **Notifications Page:**
- **Route:** `/notifications`
- **Features:** Filter tabs, mark as read, delete, timestamps
- **Responsive:** Works on mobile and desktop

## 🗄️ **Database Schema**

### **Notification Model:**
```sql
CREATE TABLE notifications (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    service_id INTEGER,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    read_date DATETIME,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    action_url VARCHAR(500),
    action_data TEXT,
    expires_at DATETIME
);
```

## 🧪 **Testing**

### **API Testing:**
```bash
# Test notifications endpoint
curl -X GET http://localhost:5000/notifications/user/3 \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test unread count
curl -X GET http://localhost:5000/notifications/user/3/unread-count \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### **Frontend Testing:**
```bash
# E2E tests include notification functionality
npx cypress run --spec "cypress/e2e/login.cy.js"
```

## 🔒 **Security**

### **Authentication:**
- All endpoints require valid JWT token
- Users can only access their own notifications
- Admins can create system-wide notifications

### **Permissions:**
- Regular users: Read own notifications
- Admins: Create notifications for any user
- Super admins: Full notification management

## 📈 **Performance**

### **Optimization:**
- Pagination support (50 notifications per page)
- Efficient database queries with indexes
- Client-side caching with React Query
- Automatic cleanup of expired notifications

### **Monitoring:**
- Track notification delivery rates
- Monitor unread notification counts
- Log notification creation and read events

---

## 🚀 **Ready to Use!**

The notifications system is fully implemented and ready for production use. All components are integrated and tested. Simply start the application with `./start-local.sh` and navigate to `/notifications` to see it in action!
