# Security Logs System - Complete Guide

## Security Logs Kya Track Karte Hain?

Security logs system aapke application ke **sabhi important security events** ko automatically track karta hai. Yeh system **audit trail** maintain karta hai jisse aap dekh sakte hain ki kya kya changes hui hain.

---

## Currently Tracked Events (Abhi Track Ho Raha Hai)

### 1. **Login Events** ✅ (Already Implemented)
- **login_success**: Jab user successfully login karta hai
- **login_failed**: Jab login fail hota hai (wrong password, etc.)
- **Logs**: IP address, user agent, timestamp, email

---

## Events Jo Track Hone Chahiye (Important Actions)

### 2. **User Management Actions** (Admin Panel)
- **User Delete**: Jab admin kisi user ko delete karta hai
- **User Update**: Jab admin user ki information update karta hai
- **User Role Change**: Jab user ka role change hota hai (tourist/local)
- **User Status Change**: Jab user ko ban/unban kiya jata hai

### 3. **Admin Management Actions**
- **Admin Role Change**: Jab kisi user ko admin banaya jata hai ya admin role change hota hai
- **Permission Change**: Jab admin ki permissions change hoti hain
- **Admin Created**: Jab naya admin create hota hai

### 4. **Settings Changes** (Critical)
- **Settings Update**: Jab admin settings change karta hai
- **Maintenance Mode**: Jab maintenance mode on/off hota hai
- **Email Settings**: Jab SMTP settings change hoti hain
- **Security Settings**: Jab password requirements, login attempts, etc. change hote hain

### 5. **Backup Operations** (Critical)
- **backup_created**: Jab backup create hota hai
- **backup_restored**: Jab backup restore hota hai (CRITICAL - data replace hota hai)
- **backup_deleted**: Jab backup delete hota hai

### 6. **Data Export** (Important)
- **data_export**: Jab admin data export karta hai (CSV, JSON, etc.)
- **Security Logs Export**: Jab security logs export hote hain

### 7. **Password & Account Security**
- **password_change**: Jab user apna password change karta hai
- **password_reset**: Jab password reset hota hai
- **email_change**: Jab user apna email change karta hai
- **account_locked**: Jab account lock hota hai (too many failed attempts)
- **account_unlocked**: Jab account unlock hota hai

### 8. **Suspicious Activities**
- **suspicious_activity**: Jab koi suspicious activity detect hoti hai
  - Multiple failed login attempts from same IP
  - Unusual access patterns
  - Unauthorized access attempts

### 9. **API & File Operations**
- **api_access**: Jab sensitive API endpoints access hote hain
- **file_upload**: Jab large files ya sensitive files upload hote hain

### 10. **Other Important Events**
- **logout**: Jab user logout karta hai (optional, but useful for tracking)
- **profile_update**: Jab user apna profile update karta hai

---

## Security Logs Ka Structure

Har log entry mein yeh information hoti hai:

```javascript
{
  eventType: 'admin_action',        // Event ka type
  userId: ObjectId,                 // User jo action perform kar raha hai
  adminId: ObjectId,                // Admin jo action perform kar raha hai
  targetUserId: ObjectId,           // User jis par action ho rahi hai
  ipAddress: '192.168.1.1',        // IP address
  userAgent: 'Mozilla/5.0...',     // Browser info
  description: 'User deleted...',   // Human-readable description
  details: {                        // Additional data
    userId: '...',
    reason: '...'
  },
  severity: 'high',                 // low, medium, high, critical
  status: 'success',                // success, failed, warning, info
  location: {                       // Optional: Geo-location
    country: 'Pakistan',
    city: 'Karachi'
  },
  createdAt: Date                  // Timestamp
}
```

---

## Severity Levels

- **low**: Normal operations (login success, profile update)
- **medium**: Important actions (user update, settings change)
- **high**: Critical actions (user delete, role change)
- **critical**: Very critical (backup restore, security breach)

---

## Status Types

- **success**: Action successfully complete hui
- **failed**: Action fail ho gayi
- **warning**: Warning ya suspicious activity
- **info**: General information

---

## Implementation Status

### ✅ Already Implemented:
1. Login success/failure logging

### 🔄 Need to Add:
1. Admin user management actions
2. Settings changes
3. Backup operations (partially done in backupController)
4. Data export
5. Password changes
6. Role/permission changes

---

## Next Steps

Main ab important admin actions mein logging add karunga:
1. User delete/update operations
2. Admin role changes
3. Settings updates
4. Backup operations (enhance existing)
5. Data export operations

Yeh sab automatically log honge jab admin koi action perform karega.

