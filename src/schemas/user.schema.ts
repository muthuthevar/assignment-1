import mongoose, { Schema, Document } from "mongoose";

// Create the User schema
const UserSchema = new mongoose.Schema(
  {
    mobileNumber: {
      type: String,
      required: true,
      unique: true, // Ensure mobile number is unique
      match: /^[0-9]{10}$/, // Validate mobile number format (10 digits)
    },
    name: {
      type: String,
      required: true,
      trim: true, // Remove whitespace around the value
    },
    dob: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true, // Ensure email is unique
      lowercase: true, // Convert email to lowercase
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, // Basic email validation regex
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Create and export the User model
const User = mongoose.model("User", UserSchema);
export default User;
