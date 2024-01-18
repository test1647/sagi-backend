const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  uniqueID: { type: String, required: true, unique: true, default: generateUniqueID },
  FName: { type: String, required: true },
  LName: { type: String, required: true },
  password: { type: String, required: true },
  email: { type: String, required: true },
  Image: { type: String, required: true }, // Assuming you want to store the image URL
  phoneNumber: { type: String, required: true }, 
  Identity: { type: String, required: true }, 
  address: { type: String, required: true },
  returning_member: { type: Boolean, default: false },
  IsActive: { type: Boolean, default: false },
  IsPaid: { type: Boolean, default: false },
  // dob: { type: Date, required: true },
  userType: { type: String, default: 'USER' },
  isDeleted: { type: Boolean, default: false },
  dateAdded: { type: Date, default: Date.now },
});

userSchema.pre('save', async function (next) {
  if (this.isNew && !this.uniqueID) {
    // Generate uniqueID if not provided
    this.uniqueID = generateUniqueID();
  }

  // Check if 90 days have passed since the user's creation date
  const currentDate = new Date();
  const creationDate = new Date(this.dateAdded);
  const daysPassed = Math.floor((currentDate - creationDate) / (24 * 60 * 60 * 1000));

  if (!this.IsActive && daysPassed >= 90) {
    // If not active and 90 days have passed, set IsActive to true
    this.IsActive = true;
  }

  next();
});

function generateUniqueID() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const length = Math.floor(Math.random() * (16 - 10 + 1)) + 10;
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const User = mongoose.model("User", userSchema);

module.exports = User;
