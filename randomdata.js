const mongoose = require("mongoose");
const faker = require("faker"); // For generating random data
const dbConnection = require("./db/db");

const Pose = require("./models/Pose"); // Create a model for your Pose data

async function insertRandomData() {
  try {
    // Connect to the MongoDB server
    await dbConnection;

    // Clear existing data (optional)
    await Pose.deleteMany({});

    // Insert random data into the "Pose" collection
    const numberOfRecords = 10; // You can adjust the number of records you want to insert

    for (let i = 0; i < 5; i++) {
      const pose = new Pose({
        username: faker.username.username(),
        email: faker.email.email(),
        password: faker.password.password(),
        

        // Add other fields as needed
      });

      await pose.save();
    }

    console.log(`Inserted ${numberOfRecords} random records into the "Pose" collection`);
  } catch (error) {
    console.error("Error inserting random data:", error);
  } finally {
    // Disconnect from the MongoDB server when done
    mongoose.connection.close();
  }
}

insertRandomData();
