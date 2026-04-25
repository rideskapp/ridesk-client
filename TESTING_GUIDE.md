# 🧪 Comprehensive Calendar Testing Guide

## Overview
This guide will help you test the new comprehensive calendar system in the `ridesk-client` project. The calendar now includes advanced features like time slot management, instructor availability, lesson creation wizard, and more.

## 🚀 Quick Start

### 1. Prerequisites
Before testing, ensure you have:
- ✅ `ridesk-server` running on port 3001
- ✅ `ridesk-client` running on port 3000
- ✅ Database with proper migrations applied
- ✅ At least one school, instructor, and student created

### 2. Start the Applications
```bash
# Terminal 1 - Start the server
cd ridesk-server
npm run dev

# Terminal 2 - Start the client
cd ridesk-client
npm run dev
```

## 📋 Test Data Setup

### Step 1: Create Test School
1. Go to `http://localhost:3000/school`
2. Create a new school with:
   - Name: "Test Surf School"
   - Location: "Test Location"
   - Disciplines: Kitesurf, Surf, Wingfoil

### Step 2: Create Test Instructors
1. Go to `http://localhost:3000/instructors`
2. Create at least 2 instructors:
   - **Instructor 1**: Alex Smith (Kitesurf specialist)
   - **Instructor 2**: Maria Garcia (Surf specialist)
   - **Instructor 3**: John Doe (Wingfoil specialist)

### Step 3: Create Test Students
1. Go to `http://localhost:3000/students`
2. Create at least 3 students:
   - **Student 1**: Emma Wilson (Beginner)
   - **Student 2**: Tom Brown (Intermediate)
   - **Student 3**: Sarah Johnson (Advanced)

### Step 4: Set Up Instructor Availability
1. Go to `http://localhost:3000/availability`
2. For each instructor, add availability slots:
   - **Morning slots**: 9:00 AM - 12:00 PM
   - **Afternoon slots**: 2:00 PM - 6:00 PM
   - **Duration**: At least 3-4 days of availability

## 🧪 Testing Scenarios

### Scenario 1: Basic Calendar View
**Objective**: Verify the calendar loads and displays correctly

**Steps**:
1. Navigate to `http://localhost:3000/calendar`
2. Verify the calendar loads without errors
3. Check that the current date is highlighted
4. Verify the day/week view toggle works
5. Test date navigation (Previous/Next/Today buttons)

**Expected Results**:
- ✅ Calendar loads with time slots (9 AM - 6 PM)
- ✅ Instructor columns are displayed
- ✅ Available slots show "Add Lesson" buttons
- ✅ No console errors

### Scenario 2: Instructor Filtering
**Objective**: Test instructor filtering functionality

**Steps**:
1. In the calendar, use the instructor filter dropdown
2. Select "Alex Smith" from the filter
3. Verify only Alex's column is visible
4. Change back to "All Instructors"
5. Verify all instructor columns are visible

**Expected Results**:
- ✅ Filter dropdown shows all instructors
- ✅ Filtering works correctly
- ✅ Calendar updates when filter changes

### Scenario 3: Discipline Filtering
**Objective**: Test discipline filtering

**Steps**:
1. Use the discipline filter dropdown
2. Select "Kitesurf" from the filter
3. Verify only kitesurf-related lessons are shown
4. Test other disciplines (Surf, Wingfoil)
5. Reset to "All"

**Expected Results**:
- ✅ Discipline filter works correctly
- ✅ Only relevant lessons are displayed
- ✅ Filter resets properly

### Scenario 4: Create Lesson via Wizard
**Objective**: Test the lesson creation wizard

**Steps**:
1. Click the "Create Lesson" button
2. Complete the 4-step wizard:
   - **Step 1**: Select instructor, date, time, duration
   - **Step 2**: Select student
   - **Step 3**: Select lesson type (product)
   - **Step 4**: Review and confirm
3. Click "Create Lesson"

**Expected Results**:
- ✅ Wizard opens and displays all steps
- ✅ Form validation works (required fields)
- ✅ Instructor availability is checked
- ✅ Lesson is created successfully
- ✅ Calendar refreshes with new lesson

### Scenario 5: Create Lesson via Time Slot
**Objective**: Test creating lessons by clicking on available time slots

**Steps**:
1. Find an available time slot (shows "Add Lesson" button)
2. Click on the slot
3. Complete the lesson creation process
4. Verify the lesson appears in the calendar

**Expected Results**:
- ✅ Clicking available slots opens lesson creation
- ✅ Pre-selected data is populated correctly
- ✅ Lesson is created and displayed

### Scenario 6: View Lesson Details
**Objective**: Test lesson details dialog

**Steps**:
1. Click on an existing lesson in the calendar
2. Verify the lesson details dialog opens
3. Check that all lesson information is displayed correctly
4. Close the dialog

**Expected Results**:
- ✅ Lesson details dialog opens
- ✅ All lesson information is displayed
- ✅ Dialog closes properly

### Scenario 7: Week View
**Objective**: Test week view functionality

**Steps**:
1. Switch to "Week" view using the toggle
2. Verify all 7 days of the week are displayed
3. Test navigation (Previous/Next week)
4. Verify lessons are displayed for each day
5. Switch back to "Day" view

**Expected Results**:
- ✅ Week view shows all 7 days
- ✅ Navigation works correctly
- ✅ Lessons are displayed for each day
- ✅ View switching works smoothly

### Scenario 8: Availability Management
**Objective**: Test instructor availability integration

**Steps**:
1. Go to `http://localhost:3000/availability`
2. Add availability for an instructor
3. Go back to calendar
4. Verify the instructor shows as available in the calendar
5. Remove availability
6. Verify the instructor shows as unavailable

**Expected Results**:
- ✅ Availability changes are reflected in calendar
- ✅ Available slots show "Add Lesson" buttons
- ✅ Unavailable slots show "Not Available"

## 🐛 Common Issues & Solutions

### Issue 1: Calendar Not Loading
**Symptoms**: Blank calendar or loading spinner
**Solutions**:
- Check browser console for errors
- Verify server is running on port 3001
- Check network requests in DevTools
- Ensure database migrations are applied

### Issue 2: No Instructors/Students Available
**Symptoms**: Empty dropdowns in lesson wizard
**Solutions**:
- Verify instructors and students are created
- Check API endpoints are working
- Ensure proper authentication

### Issue 3: Availability Not Showing
**Symptoms**: All slots show as unavailable
**Solutions**:
- Check availability data in database
- Verify availability API is working
- Ensure instructor availability is set up

### Issue 4: Lesson Creation Fails
**Symptoms**: Error when creating lessons
**Solutions**:
- Check form validation
- Verify all required fields are filled
- Check server logs for API errors
- Ensure instructor is available for selected time

## 🔍 Debugging Tips

### 1. Browser DevTools
- Open DevTools (F12)
- Check Console tab for errors
- Check Network tab for failed API calls
- Use React DevTools for component state

### 2. Server Logs
- Check server console for errors
- Verify API endpoints are responding
- Check database queries

### 3. Database Verification
```sql
-- Check instructors
SELECT * FROM instructors WHERE is_active = true;

-- Check students
SELECT * FROM students;

-- Check availability
SELECT * FROM instructor_availability WHERE active = true;

-- Check lessons
SELECT * FROM lessons ORDER BY date, time;
```

## 📊 Performance Testing

### Load Testing
1. Create 50+ lessons across multiple days
2. Test calendar performance with large datasets
3. Verify filtering performance
4. Check memory usage

### Responsive Testing
1. Test on mobile devices
2. Test on tablets
3. Verify responsive design works
4. Check touch interactions

## ✅ Success Criteria

The calendar implementation is successful when:
- ✅ All test scenarios pass
- ✅ No console errors
- ✅ Smooth user experience
- ✅ Proper error handling
- ✅ Responsive design works
- ✅ Performance is acceptable
- ✅ Data persistence works correctly

## 🚀 Next Steps

After successful testing:
1. Deploy to staging environment
2. Conduct user acceptance testing
3. Performance optimization if needed
4. Add additional features based on feedback
5. Deploy to production

## 📝 Test Report Template

```
Test Date: ___________
Tester: ___________
Environment: ___________

Test Results:
□ Scenario 1: Basic Calendar View - PASS/FAIL
□ Scenario 2: Instructor Filtering - PASS/FAIL
□ Scenario 3: Discipline Filtering - PASS/FAIL
□ Scenario 4: Create Lesson via Wizard - PASS/FAIL
□ Scenario 5: Create Lesson via Time Slot - PASS/FAIL
□ Scenario 6: View Lesson Details - PASS/FAIL
□ Scenario 7: Week View - PASS/FAIL
□ Scenario 8: Availability Management - PASS/FAIL

Issues Found:
- Issue 1: [Description]
- Issue 2: [Description]

Overall Status: PASS/FAIL
```

---

**Need Help?** Check the console logs, server logs, and database state to diagnose any issues. The comprehensive calendar system should provide a smooth, professional lesson management experience.
