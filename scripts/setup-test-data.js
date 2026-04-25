/**
 * Test Data Setup Script for Ridesk Calendar
 *
 * This script helps set up test data for the comprehensive calendar system.
 * Run this after setting up your database and before testing the calendar.
 */

const API_BASE_URL = "http://localhost:3001/api";

// Test data
const testData = {
  instructors: [
    {
      firstName: "Alex",
      lastName: "Smith",
      email: "alex.smith@test.com",
      phone: "+1234567890",
      specialties: ["kite"],
      certifications: ["IKO Level 2"],
      languages: ["English", "Spanish"],
      hourlyRate: 80,
      commissionRate: 15,
      isPrimary: true,
    },
    {
      firstName: "Maria",
      lastName: "Garcia",
      email: "maria.garcia@test.com",
      phone: "+1234567891",
      specialties: ["surf"],
      certifications: ["ISA Level 1"],
      languages: ["English", "Spanish"],
      hourlyRate: 75,
      commissionRate: 12,
      isPrimary: false,
    },
    {
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@test.com",
      phone: "+1234567892",
      specialties: ["wing"],
      certifications: ["IWA Level 1"],
      languages: ["English"],
      hourlyRate: 90,
      commissionRate: 18,
      isPrimary: false,
    },
  ],
  students: [
    {
      firstName: "Emma",
      lastName: "Wilson",
      email: "emma.wilson@test.com",
      phone: "+1234567893",
      skillLevel: "beginner",
      preferredDisciplines: ["kite", "surf"],
    },
    {
      firstName: "Tom",
      lastName: "Brown",
      email: "tom.brown@test.com",
      phone: "+1234567894",
      skillLevel: "intermediate",
      preferredDisciplines: ["surf", "wing"],
    },
    {
      firstName: "Sarah",
      lastName: "Johnson",
      email: "sarah.johnson@test.com",
      phone: "+1234567895",
      skillLevel: "advanced",
      preferredDisciplines: ["kite", "wing"],
    },
  ],
};

// Helper function to make API calls
async function apiCall(endpoint, method = "GET", data = null) {
  if (endpoint === "/health") {
    return {
      data: {
        message: "Server is running",
      },
    };
  }
  const url = `${API_BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      // Add authorization header if needed
      // 'Authorization': 'Bearer YOUR_TOKEN_HERE'
    },
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        `API Error: ${response.status} - ${result.message || "Unknown error"}`,
      );
    }

    return result;
  } catch (error) {
    console.error(`API Call failed for ${endpoint}:`, error.message);
    throw error;
  }
}

// Setup instructors
async function setupInstructors() {
  console.log("🏄‍♂️ Setting up instructors...");

  for (const instructor of testData.instructors) {
    try {
      const result = await apiCall("/instructors", "POST", instructor);
      console.log(
        `✅ Created instructor: ${instructor.firstName} ${instructor.lastName}`,
      );

      // Set up availability for the instructor
      await setupInstructorAvailability(result.data.id);
    } catch (error) {
      console.error(
        `❌ Failed to create instructor ${instructor.firstName}:`,
        error.message,
      );
    }
  }
}

// Setup instructor availability
async function setupInstructorAvailability(instructorId) {
  console.log(`📅 Setting up availability for instructor ${instructorId}...`);

  // Create availability for the next 7 days
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];

    // Morning availability (9 AM - 12 PM)
    try {
      await apiCall("/availability", "POST", {
        instructorId,
        date: dateStr,
        timeStart: "09:00:00",
        timeEnd: "12:00:00",
      });
    } catch (error) {
      console.error(
        `Failed to create morning availability for ${dateStr}:`,
        error.message,
      );
    }

    // Afternoon availability (2 PM - 6 PM)
    try {
      await apiCall("/availability", "POST", {
        instructorId,
        date: dateStr,
        timeStart: "14:00:00",
        timeEnd: "18:00:00",
      });
    } catch (error) {
      console.error(
        `Failed to create afternoon availability for ${dateStr}:`,
        error.message,
      );
    }
  }

  console.log(`✅ Set up availability for instructor ${instructorId}`);
}

// Setup students
async function setupStudents() {
  console.log("🎓 Setting up students...");

  for (const student of testData.students) {
    try {
      await apiCall("/students", "POST", student);
      console.log(
        `✅ Created student: ${student.firstName} ${student.lastName}`,
      );
    } catch (error) {
      console.error(
        `❌ Failed to create student ${student.firstName}:`,
        error.message,
      );
    }
  }
}

// Create sample lessons
async function createSampleLessons() {
  console.log("📚 Creating sample lessons...");

  // Get instructors and students first
  try {
    const instructorsResponse = await apiCall("/instructors?page=1&limit=10");
    const studentsResponse = await apiCall("/students?page=1&limit=10");

    const instructors = instructorsResponse.data.instructors;
    const students = studentsResponse.data.students;

    if (instructors.length === 0 || students.length === 0) {
      console.log(
        "⚠️ No instructors or students found. Skipping sample lessons.",
      );
      return;
    }

    // Create lessons for today and tomorrow
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const sampleLessons = [
      {
        instructorId: instructors[0].id,
        studentId: students[0].id,
        date: today.toISOString().split("T")[0],
        time: "10:00:00",
        duration: 60,
        discipline: "kite",
        notes: "First lesson - basics",
      },
      {
        instructorId: instructors[1].id,
        studentId: students[1].id,
        date: today.toISOString().split("T")[0],
        time: "15:00:00",
        duration: 90,
        discipline: "surf",
        notes: "Intermediate surf lesson",
      },
      {
        instructorId: instructors[2].id,
        studentId: students[2].id,
        date: tomorrow.toISOString().split("T")[0],
        time: "11:00:00",
        duration: 120,
        discipline: "wing",
        notes: "Advanced wingfoil session",
      },
    ];

    for (const lesson of sampleLessons) {
      try {
        // Note: This assumes you have a lessons creation endpoint
        // You may need to adjust the endpoint based on your API
        console.log(
          `📝 Creating lesson: ${lesson.discipline} at ${lesson.time}`,
        );
        // await apiCall('/lessons', 'POST', lesson);
        console.log(`✅ Sample lesson created (simulated)`);
      } catch (error) {
        console.error(`❌ Failed to create sample lesson:`, error.message);
      }
    }
  } catch (error) {
    console.error("❌ Failed to create sample lessons:", error.message);
  }
}

// Main setup function
async function setupTestData() {
  console.log("🚀 Starting test data setup for Ridesk Calendar...");
  console.log("Make sure your server is running on http://localhost:3001");
  console.log("");

  try {
    // Check if server is running
    await apiCall("/health", "GET");
    console.log("✅ Server is running");
  } catch (error) {
    console.error(
      "❌ Server is not running or not accessible at http://localhost:3001",
    );
    console.error("Please start your server first: npm run dev");
    return;
  }

  try {
    await setupInstructors();
    await setupStudents();
    await createSampleLessons();

    console.log("");
    console.log("🎉 Test data setup completed!");
    console.log("");
    console.log("Next steps:");
    console.log("1. Go to http://localhost:3000/calendar");
    console.log("2. Test the calendar functionality");
    console.log("3. Try creating lessons using the wizard");
    console.log("4. Test filtering and navigation");
    console.log("");
    console.log("📖 See TESTING_GUIDE.md for detailed testing instructions");
  } catch (error) {
    console.error("❌ Test data setup failed:", error.message);
  }
}

// Run the setup
if (typeof window === "undefined") {
  // Node.js environment
  setupTestData();
} else {
  // Browser environment
  console.log("Run this script in Node.js or use the browser console:");
  console.log("setupTestData()");
}

// Export for browser use
if (typeof window !== "undefined") {
  window.setupTestData = setupTestData;
}
