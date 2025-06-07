# 🚀 Quick Start Guide - AOG Tech License Generator

## ⚡ Instant Setup (5 minutes)

### 1. **Ready to Use - No Installation Required!**
The license generator is a complete web application that runs directly in your browser. No servers, no databases, no complex setup.

### 2. **Start Using Immediately**
```
1. Open `index.html` in any web browser
2. Fill in customer details
3. Click "Generate License Key"
4. Copy the key and send to customer
```

### 3. **First License Generation Test**
Try these demo values:
- **Email**: `demo@customer.com`
- **Name**: `Demo Customer`  
- **Duration**: `1 year (Standard)`
- **Features**: `All Features`

---

## 🛡️ Production Deployment (2 minutes)

### **IMPORTANT: Change Secret Key Before Production**

1. **Edit `script.js`** (line 2):
```javascript
// CHANGE THIS:
const SECRET_KEY = 'AOG-TECH-POS-SYSTEM-2024-SECRET-KEY-CHANGE-IN-PRODUCTION';

// TO THIS (use your unique key):
const SECRET_KEY = 'YOUR-UNIQUE-SECRET-KEY-HERE-MAKE-IT-COMPLEX';
```

2. **Make sure it matches your POS system** (`src/services/LicenseService.ts`):
```typescript
private static readonly SECRET_KEY = 'YOUR-UNIQUE-SECRET-KEY-HERE-MAKE-IT-COMPLEX';
```

That's it! You're ready for production.

---

## 📋 Daily Usage Workflow

### **For Each Customer License:**

1. **Open License Generator** (`index.html`)
2. **Enter Customer Info**:
   - Email address (required)
   - Full name (required)
3. **Select License Type**:
   - Trial: 30 days, basic features
   - Standard: 1 year, all features  
   - Enterprise: 2+ years, all features
4. **Generate & Deliver**:
   - Click "Generate License Key"
   - Copy key (auto-formatted)
   - Send to customer via email
5. **Customer Activates**:
   - Customer enters key in POS system
   - System validates and activates

### **Managing License History:**
- View all generated licenses in "Recent Licenses" section
- Download license information as text file
- Clear history when needed

---

## 🎯 Key Features You'll Love

✅ **Professional Interface** - Impressive, modern design  
✅ **Real-time Validation** - Prevents common errors  
✅ **One-Click Copy** - Instant clipboard copying  
✅ **Email Integration** - Pre-filled customer emails  
✅ **Download Support** - Generate license documents  
✅ **License History** - Track all generated licenses  
✅ **Mobile Friendly** - Works on any device  
✅ **Offline Capable** - No internet required  

---

## 🔧 File Structure
```
license-generator/
├── index.html          # Main application
├── styles.css          # Professional styling
├── script.js           # License generation logic
├── demo.html           # Feature demonstration
├── README.md           # Complete documentation
└── QUICK_START.md      # This guide
```

---

## 💡 Pro Tips

1. **Bookmark the Generator**: Add `index.html` to browser bookmarks for quick access
2. **Desktop Shortcut**: Create desktop shortcut to `index.html` for instant access  
3. **Custom Validity**: Use "Custom" option for special license durations
4. **Batch Generation**: Use browser tabs to generate multiple licenses quickly
5. **Backup History**: Regularly backup license history from browser storage

---

## 🆘 Quick Troubleshooting

**Q: License key not working in POS system?**  
A: Ensure SECRET_KEY matches between generator and POS system

**Q: Copy button not working?**  
A: Grant clipboard permissions in browser settings

**Q: History not saving?**  
A: Check if browser allows local storage (private browsing may block this)

**Q: Want to clear all data?**  
A: Click "Clear History" button or clear browser data for the site

---

## 📞 Support

- **Quick Help**: See main `README.md` for detailed documentation
- **Technical Issues**: Check browser console for error messages
- **License Problems**: Verify SECRET_KEY synchronization

---

**🎉 You're all set! Start generating professional license keys in under 5 minutes.**

**Next step**: Open `demo.html` for a guided tour, or jump straight into `index.html` to start generating licenses! 