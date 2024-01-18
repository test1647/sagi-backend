const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    fname: { type: String, required: true },
    lname: { type: String, required: true },
    title:{type:String,required:true},
    email: { type: String, required: true },
    phone: { type: String, required: true },
  isDeleted: { type: Boolean, default: false },
  dateAdded: { type: Date, default: Date.now },
});
const Form6 = mongoose.model("Form6", userSchema);

module.exports = Form6;
