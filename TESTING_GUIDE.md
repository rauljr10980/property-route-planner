# 🧪 Testing Guide - Status Filtering & Routes

## ✅ Servers Starting

1. **Backend:** `http://localhost:3001` (processing files)
2. **Frontend:** `http://localhost:5173` (your app)

---

## 🧪 Test Steps

### 1. Verify Backend is Running

Open: http://localhost:3001/health

Should see:
```json
{"status":"ok","service":"GCS API"}
```

### 2. Test File Upload

1. Go to **File History** tab
2. Click **"Upload & Process File"**
3. Select your Excel file (with J, A, P statuses)
4. Watch progress bar
5. Wait for processing to complete

### 3. Test Status Filtering

1. Go to **Route Planner** tab
2. You should see:
   - **Status Filter Buttons:** J, A, P (with counts)
   - **Route Buttons:** "All J, A, P", "Filtered Route", "J Only", "A Only", "P Only"

3. **Test Filters:**
   - Click **J** button → Only J properties show on map
   - Click **A** button → Only A properties show
   - Click **P** button → Only P properties show
   - Click all three → All properties show

### 4. Test Route Creation

**Test "All J, A, P" Route:**
1. Click **"All J, A, P"** button
2. Google Maps should open with route for ALL properties
3. Verify all J, A, P properties are in route

**Test "Filtered Route":**
1. Filter to show only **J** properties
2. Click **"Filtered Route"** button
3. Google Maps should open with route for ONLY J properties

**Test Individual Routes:**
1. Click **"J Only"** → Route for only J properties
2. Click **"A Only"** → Route for only A properties
3. Click **"P Only"** → Route for only P properties

### 5. Test Visual Indicators

**Map Markers:**
- ✅ Red markers = J (Judgment)
- ✅ Yellow markers = A (Active)
- ✅ Green markers = P (Pending)

**Property List:**
- ✅ Status badges next to each property
- ✅ Color-coded by status
- ✅ Shows days since status change

**Property Details:**
- ✅ Click a property → See status card
- ✅ Shows current status, previous status, days since change

---

## ✅ Expected Results

### Status Filtering:
- ✅ Filter buttons toggle on/off
- ✅ Map updates when filters change
- ✅ Property list updates
- ✅ Counts update correctly

### Route Creation:
- ✅ "All J, A, P" includes all properties
- ✅ "Filtered Route" respects current filter
- ✅ Individual routes work for each status
- ✅ Routes open in Google Maps
- ✅ All properties with locations included

### Visual:
- ✅ Color-coded markers on map
- ✅ Status badges in property list
- ✅ Status details in property modal

---

## 🔍 Troubleshooting

**"No properties to route"**
- Make sure file was uploaded successfully
- Check properties have valid addresses
- Verify geocoding completed

**"Filter not working"**
- Check properties have `currentStatus` field
- Verify status values are 'J', 'A', or 'P'
- Check browser console for errors

**"Route not opening"**
- Check properties have `lat` and `lng` coordinates
- Verify geocoding completed
- Check Google Maps is accessible

**"Backend not responding"**
- Check backend is running: http://localhost:3001/health
- Restart backend: `cd server && npm start`
- Check terminal for errors

---

## 📋 Test Checklist

- [ ] Backend server running (port 3001)
- [ ] Frontend server running (port 5173)
- [ ] File uploaded successfully
- [ ] Properties loaded in Route Planner
- [ ] Status filter buttons work
- [ ] Map shows color-coded markers
- [ ] "All J, A, P" route works
- [ ] "Filtered Route" works
- [ ] Individual status routes work
- [ ] Property details show status
- [ ] Status badges appear in list

---

**Ready to test!** 🚀

The app should be opening in your browser now!

