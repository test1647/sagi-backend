const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  cityname: { type: String, required: true },
  isDeleted: { type: Boolean, default: false },
  dateAdded: { type: Date, default: Date.now },
});
const City = mongoose.model("City", userSchema);

module.exports = City;
