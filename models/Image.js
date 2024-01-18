const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  Username: { type: String, required: true },
  Email: { type: String, required: true },
  Image: { type: String, required: true },
  isDeleted: { type: Boolean, default: false },
  dateAdded: { type: Date, default: Date.now },
});
const Image = mongoose.model("Image", userSchema);

module.exports = Image;
