import mongoose from 'mongoose';
import {config} from 'dotenv';
config();

// MongoDB Atlas connection string
// Format: mongodb+srv://username:password@cluster.mongodb.net/database?options
const Url = process.env.MONGODB_URI || process.env.URL;

if (!Url) {
    console.error("MongoDB connection string is not defined in environment variables!");
    console.error("Please set MONGODB_URI or URL in your .env file");
    process.exit(1);
}

// MongoDB connection options for Atlas
const options = {
    // These options are recommended for MongoDB Atlas
    serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
};

mongoose.connect(Url, options)
    .then(() => {
        console.log("MongoDB Atlas connected successfully!");
    })
    .catch((err) => {
        console.error("MongoDB Atlas connection error:", err.message);
        process.exit(1);
    });

const db = mongoose.connection;

db.on("connected", () => {
    console.log("MongoDB is connected");
});

db.on("error", (err) => {
    console.error("MongoDB connection Error:", err.message);
});

db.on("disconnected", () => {
    console.log("MongoDB is disconnected");
});

// Handle process termination
process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('MongoDB connection closed due to app termination');
    process.exit(0);
});

export default db;