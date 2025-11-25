# 🖥️ How to Open Browser Console

## Quick Method (All Browsers)

### **Press F12**
- Just press the **F12** key on your keyboard
- Console will open automatically

### **Or Right-Click**
1. Right-click anywhere on the webpage
2. Click **"Inspect"** or **"Inspect Element"**
3. Console tab will be at the top

---

## Step-by-Step by Browser

### **Chrome / Edge / Brave**
1. Press **F12** (easiest)
2. OR: Click the **3 dots menu** (top right) → **More tools** → **Developer tools**
3. OR: Press **Ctrl+Shift+J** (Windows) or **Cmd+Option+J** (Mac)
4. Click the **"Console"** tab at the top

### **Firefox**
1. Press **F12**
2. OR: Press **Ctrl+Shift+K** (Windows) or **Cmd+Option+K** (Mac)
3. Console tab will be open

### **Safari**
1. Enable Developer menu first:
   - Safari → Preferences → Advanced
   - Check "Show Develop menu in menu bar"
2. Then: **Develop** → **Show JavaScript Console**
3. OR: Press **Cmd+Option+C**

---

## What You'll See

After opening console, you'll see:
- A panel at the bottom or side of the browser
- Tabs at the top: **Console**, **Network**, **Elements**, etc.
- Click on **"Console"** tab if it's not already selected

---

## How to Check API URL

1. **Open Console** (F12)
2. **Click in the console** (where you can type)
3. **Type or paste this:**
   ```javascript
   console.log('API URL:', import.meta.env.VITE_API_URL);
   ```
4. **Press Enter**
5. **Look for the output** - should show:
   ```
   API URL: https://gcs-api-server-989612961740.us-central1.run.app
   ```

---

## Visual Guide

```
┌─────────────────────────────────────┐
│  Browser Window                     │
│                                     │
│  [Your Website Content]            │
│                                     │
├─────────────────────────────────────┤
│  Console Panel (F12 opens this)    │
│  ┌───────────────────────────────┐ │
│  │ Console | Network | Elements  │ │ ← Tabs
│  ├───────────────────────────────┤ │
│  │ > console.log('API URL:', ...)│ │ ← Type here
│  │   API URL: https://...        │ │ ← Output here
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

---

## Troubleshooting

### Console is Empty?
- Make sure you're on the **Console** tab (not Network or Elements)
- Try refreshing the page (F5)

### Can't Type in Console?
- Click inside the console area first
- Look for the `>` prompt or blinking cursor

### Don't See Output?
- Make sure you pressed Enter after typing
- Check for any error messages in red

---

## Quick Test

1. Open your website: https://rauljr10980.github.io/property-route-planner/
2. Press **F12**
3. Click **Console** tab
4. Type: `console.log('Test:', import.meta.env.VITE_API_URL);`
5. Press **Enter**
6. You should see the API URL!

