# 🚀 Quick Setup Guide for Comprehensive Calendar

## Overview
This guide will help you quickly set up and test the new comprehensive calendar system in the `ridesk-client` project.

## 🎯 Two Setup Options

### Option 1: Server-Side Seeding (Recommended)
**Use this if you want to avoid authentication issues**

### Option 2: Client-Side API Calls
**Use this if you prefer API-based setup**

---

## 🏆 Option 1: Server-Side Seeding (Recommended)

### Step 1: Start the Server
```bash
cd ridesk-server
npm run dev
```

### Step 2: Seed the Database
```bash
# In a new terminal, from ridesk-server directory
npm run seed
```

**This will create:**
- ✅ 1 test school
- ✅ 3 test instructors with availability
- ✅ 3 test students  
- ✅ 4 test products
- ✅ 7 days of availability slots
- ✅ 3 sample lessons

### Step 3: Start the Client
```bash
cd ridesk-client
npm run dev
```

### Step 4: Test the Calendar
1. Go to `http://localhost:3000/calendar`
2. You should see the comprehensive calendar with:
   - Time slot grid (9 AM - 6 PM)
   - Instructor columns
   - Available slots (click to create lessons)
   - Sample lessons already created

---

## 🔧 Option 2: Client-Side API Setup

### Step 1: Start Both Applications
```bash
# Terminal 1 - Server
cd ridesk-server
npm run dev

# Terminal 2 - Client
cd ridesk-client
npm run dev
```

### Step 2: Run the Client Setup Script
```bash
# From ridesk-client directory
node scripts/setup-test-data.js
```

**Note**: This requires authentication tokens and may fail if not properly authenticated.

---

## 🧪 Testing the Calendar

### Basic Tests
1. **Load Calendar**: Verify it loads without errors
2. **View Modes**: Toggle between Day/Week views
3. **Navigation**: Use Previous/Next/Today buttons
4. **Filtering**: Test instructor and discipline filters

### Advanced Tests
1. **Create Lesson**: Click "Create Lesson" button
2. **Time Slot Creation**: Click available time slots
3. **Lesson Wizard**: Complete the 4-step wizard
4. **Lesson Details**: Click existing lessons to view details
5. **Availability**: Check instructor availability integration

### Mobile Tests
1. **Responsive Design**: Test on mobile/tablet
2. **Touch Interactions**: Verify touch-friendly interface
3. **Navigation**: Test mobile navigation

## 🐛 Troubleshooting

### Common Issues

1. **Calendar Not Loading**
   - Check browser console for errors
   - Verify server is running on port 3001
   - Check database connection

2. **No Instructors/Students**
   - Run the seeding script: `npm run seed`
   - Check database for data
   - Verify API endpoints

3. **Authentication Errors**
   - Use server-side seeding instead
   - Check authentication tokens
   - Verify user permissions

4. **Availability Not Showing**
   - Check instructor availability data
   - Verify availability API
   - Check database migrations

### Debug Steps

1. **Check Server Logs**
   ```bash
   # Look for errors in server console
   cd ridesk-server
   npm run dev
   ```

2. **Check Database**
   ```sql
   -- Verify data exists
   SELECT COUNT(*) FROM instructors;
   SELECT COUNT(*) FROM students;
   SELECT COUNT(*) FROM instructor_availability;
   ```

3. **Check Browser Console**
   - Open DevTools (F12)
   - Look for JavaScript errors
   - Check Network tab for failed requests

## 📊 What You Should See

### Calendar Interface
- **Header**: Title, description, and "Create Lesson" button
- **Controls**: Date navigation, view toggles, filters
- **Time Grid**: 9 AM - 6 PM with instructor columns
- **Available Slots**: Clickable "Add Lesson" buttons
- **Existing Lessons**: Displayed with status badges

### Sample Data
- **Instructors**: Alex Smith, Maria Garcia, John Doe
- **Students**: Emma Wilson, Tom Brown, Sarah Johnson
- **Lessons**: 3 sample lessons for today/tomorrow
- **Availability**: 7 days of morning/afternoon slots

## 🎉 Success Criteria

The setup is successful when:
- ✅ Calendar loads without errors
- ✅ Instructors are visible in columns
- ✅ Available slots show "Add Lesson" buttons
- ✅ Sample lessons are displayed
- ✅ Filtering works correctly
- ✅ Lesson creation wizard opens
- ✅ Mobile responsive design works

## 📚 Next Steps

After successful setup:
1. **Explore Features**: Try all calendar features
2. **Create Lessons**: Test lesson creation workflow
3. **Test Filtering**: Use instructor/discipline filters
4. **Mobile Testing**: Test on different devices
5. **Performance**: Check with larger datasets

## 🆘 Need Help?

If you encounter issues:
1. Check the troubleshooting section above
2. Review server and browser console logs
3. Verify database data exists
4. Check the detailed `TESTING_GUIDE.md`
5. Review the `CALENDAR_IMPLEMENTATION.md` for technical details

---

**Happy Testing! 🏄‍♂️ The comprehensive calendar system is now ready for use.**
