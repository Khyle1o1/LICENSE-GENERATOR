# AOG Tech License Generator - Professional Web Application

A professional web-based license key generator for the AOG Tech POS System. This standalone application allows you to generate, manage, and distribute license keys to your customers with ease.

## ✨ Features

### 🎨 Professional Interface
- Modern, responsive design with beautiful animations
- Mobile-friendly interface that works on all devices
- Intuitive user experience with real-time validation
- Professional branding and styling

### 🔑 License Generation
- **Multiple License Tiers**: Basic, Advanced, Multi-user, All Features
- **Flexible Validity**: 30 days (trial) to 3 years (enterprise) or custom duration
- **Cryptographic Security**: HMAC-SHA256 signed license keys
- **Unique Format**: 25-character keys formatted as XXXXX-XXXXX-XXXXX-XXXXX-XXXXX

### 📊 Management Features
- **License History**: Track all generated licenses with details
- **One-Click Copy**: Copy license keys to clipboard instantly
- **Download License Info**: Generate downloadable license documents
- **Email Integration**: Pre-filled email templates for customers
- **Search & Filter**: Easy management of license records

### 🛡️ Security
- Same cryptographic security as the main POS system
- Hardware fingerprinting compatible
- Tamper-proof license validation
- Local storage for license history

## 🚀 Quick Start

### 1. Setup
1. Download or clone the `license-generator` folder
2. No installation required - runs directly in any modern web browser
3. For production, change the SECRET_KEY in `script.js`

### 2. Usage
1. Open `index.html` in your web browser
2. Fill in customer details:
   - Customer email (required)
   - Customer name (required)
   - License validity period
   - Feature set
3. Click "Generate License Key"
4. Copy the generated key and provide it to your customer

### 3. Customer Instructions
Provide customers with these simple activation steps:
1. Launch the AOG Tech POS System
2. Enter the license key when prompted
3. Click "Activate License"

## 📱 Screenshots

### Main Interface
- Clean, professional form for license generation
- Real-time validation with visual feedback
- Dropdown options for common license durations

### License Result
- Prominently displayed license key with copy button
- Complete customer and license details
- Action buttons for download and email

### License History
- Chronological list of all generated licenses
- Quick access to customer information
- Easy management and tracking

## 🔧 Configuration

### Production Setup

**⚠️ IMPORTANT**: Before deploying to production, change the secret key:

```javascript
// In script.js, change this line:
const SECRET_KEY = 'YOUR-UNIQUE-PRODUCTION-SECRET-KEY-HERE';
```

Make sure this matches the SECRET_KEY in your main POS system's `LicenseService.ts`.

### Customization Options

#### Branding
- Update company name in `index.html`
- Modify colors in `styles.css`
- Replace logo icon in header

#### License Options
- Modify validity periods in the dropdown
- Add or remove feature combinations
- Customize email templates

#### Features Available
- `basic`: Basic POS functionality
- `advanced`: Advanced reporting and analytics  
- `multi-user`: Multiple user management
- `all`: All features unlocked

## 📄 License Key Format

Generated keys follow the format: `XXXXX-XXXXX-XXXXX-XXXXX-XXXXX`

Example: `A1B2C-3D4E5-F6G7H-8I9J0-K1L2M`

- **25 characters total**: 20 characters + 5 character checksum
- **Cryptographically secure**: HMAC-SHA256 based generation
- **User-friendly**: Easy to read and type
- **Tamper-proof**: Invalid if modified

## 💼 Business Workflow

### 1. Customer Purchase
```
Customer Order → Generate License → Send Key → Customer Activation
```

### 2. Trial Licenses
```javascript
// 30-day trial with basic features
Features: basic
Duration: 30 days
```

### 3. Standard Licenses  
```javascript
// 1-year license with full features
Features: all
Duration: 365 days
```

### 4. Enterprise Licenses
```javascript
// Multi-year enterprise license
Features: all
Duration: 730+ days
```

## 🔄 Integration with POS System

The generated license keys are fully compatible with the main POS system:

1. **Same cryptographic foundation**: Uses identical HMAC-SHA256 signing
2. **Compatible validation**: Keys validate correctly in the POS system
3. **Feature compatibility**: All feature flags work as expected
4. **Security alignment**: Same security standards and practices

## 📞 Customer Support Workflow

### For License Issues:
1. **Check License History**: Verify the license was generated correctly
2. **Validate Format**: Ensure customer entered the key correctly
3. **Check Expiry**: Verify the license hasn't expired
4. **Generate New Key**: If needed, generate a replacement license

### Common Customer Questions:
- **"License won't activate"**: Check format and system date
- **"License expired"**: Generate new license with extended validity
- **"Need to transfer license"**: Contact support for manual transfer

## 🎯 Advanced Features

### Keyboard Shortcuts
- **Ctrl/Cmd + Enter**: Generate license key
- **Escape**: Close result and start new generation
- **Tab Navigation**: Efficient form navigation

### Automatic Features
- **Email validation**: Real-time email format checking
- **Name formatting**: Auto-capitalize customer names
- **Smart defaults**: 1-year validity with all features selected
- **History tracking**: Automatic storage of generated licenses

### Export Options
- **Download**: Text file with complete license information
- **Email**: Pre-filled email with activation instructions
- **Copy**: One-click license key copying

## 🔒 Security Best Practices

### For Production Use:
1. **Change Secret Key**: Use a unique, complex secret key
2. **HTTPS Only**: Deploy over secure connections
3. **Access Control**: Restrict access to authorized personnel only
4. **Regular Backups**: Backup license history regularly
5. **Key Rotation**: Consider periodic secret key rotation

### Customer Privacy:
- License history stored locally (not on servers)
- No customer data transmitted externally
- Email integration uses local client only

## 🛠️ Technical Details

### Browser Compatibility
- **Chrome/Edge**: Full support (recommended)
- **Firefox**: Full support
- **Safari**: Full support
- **Mobile browsers**: Responsive design works on all devices

### Storage
- **Local Storage**: License history (up to 50 recent licenses)
- **No Server Required**: Completely client-side application
- **Cross-Platform**: Works on Windows, Mac, Linux

### Performance
- **Instant Generation**: Sub-second license key generation
- **Smooth Animations**: 60fps interface animations
- **Responsive**: Works efficiently on slower devices

## 📈 Usage Analytics

Track your license generation with the built-in history:
- **Total licenses generated**
- **License types distribution**
- **Generation dates and patterns**
- **Customer information tracking**

## 🆘 Troubleshooting

### Common Issues:

**Q: License key not generating**
- A: Check browser console for JavaScript errors
- A: Ensure all required fields are filled

**Q: Copy to clipboard not working**
- A: Grant clipboard permissions in browser
- A: Use manual selection as fallback

**Q: Email button not opening**
- A: Ensure default email client is configured
- A: Copy email content manually if needed

**Q: History not saving**
- A: Check if browser allows local storage
- A: Clear browser cache and try again

## 📞 Support

For technical support or questions:
- **Email**: support@aogtech.com
- **Documentation**: See main LICENSE_SYSTEM_README.md
- **Issue reporting**: Include browser info and steps to reproduce

---

**© 2024 AOG Tech. Professional License Management Solution.** 