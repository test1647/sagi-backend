const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // New field for admin ID
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Assuming you have a User model
  messages: [
    {
      sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      message: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
    },
  ],
  AssociationCode: { type: String, required: true },
  Country: { type: String, required: true },
  City: { type: String, required: true },
  isDeleted: { type: Boolean, default: false },
  dateAdded: { type: Date, default: Date.now },
});

const Group = mongoose.model("Group", groupSchema);

module.exports = Group;
