const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    fname: { type: String },
    lname: { type: String },
    dob: { type: Date },
    returning_member:{type:Boolean, default: false},
    comments:{type:String},
  isDeleted: { type: Boolean, default: false },
  dateAdded: { type: Date, default: Date.now },
});
const Form1 = mongoose.model("Form1", userSchema);

module.exports = Form1;
