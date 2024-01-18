const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    fname: { type: String, required: true },
    lname: { type: String, required: true },
    mId:{type:String,required:true},
    reason:{type:String},
    comments:{type:String},
    isDeleted: { type: Boolean, default: false },
    dateAdded: { type: Date, default: Date.now },
});
const Form2 = mongoose.model("Form2", userSchema);

module.exports = Form2;
