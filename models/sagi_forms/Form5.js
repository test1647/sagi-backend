const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    fname: { type: String, required: true },
    lname: { type: String, required: true },
    mId:{type:String,required:true},
    association_code: { type: String, required: true },
    association_name: { type: String, required: true },
  isDeleted: { type: Boolean, default: false },
  dateAdded: { type: Date, default: Date.now },
});
const Form5 = mongoose.model("Form5", userSchema);

module.exports = Form5;
