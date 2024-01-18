const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  Name: { type: String, required: true },
  Description: { type: String, required: true },
  Image: { type: String, required: true }, // Assuming you want to store the image URL
  isDeleted: { type: Boolean, default: false },
  Death_Date:{type: Date, required: true},
  dateAdded: { type: Date, default: Date.now },
});
const DeathList = mongoose.model("DeathList", userSchema);

module.exports = DeathList;
