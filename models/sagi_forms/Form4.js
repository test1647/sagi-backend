const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    fname: { type: String, required: true },
    lname: { type: String, required: true },
    mId:{type:String,required:true},
    newfname: { type: String, required: true },
    newlname: { type: String, required: true },
    reason:{type:String},
  isDeleted: { type: Boolean, default: false },
  dateAdded: { type: Date, default: Date.now },
});
const Form4 = mongoose.model("Form4", userSchema);

module.exports = Form4;
