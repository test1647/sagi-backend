const express = require("express");
const http = require("http");
require('dotenv').config({ path: 'node.env' });
const path = require("path");
const { Server } = require('socket.io');
const multer = require("multer");
const cors = require("cors");
const City =require("./models/City")
const paypal = require('paypal-rest-sdk');
const User = require("./models/User");
const app = express();
const bodyParser = require('body-parser');
const fs = require("fs");
const server = http.createServer(app); // Ensure 'server' is defined here
const io = new Server(server);
require('dotenv').config(); // Ensure that environment variables are loaded
const stripeApi = require('./models/stripeApi'); // Adjust the path accordingly
paypal.configure({
  mode: 'sandbox', // Change to 'live' for production
  client_id: 'YOUR_CLIENT_ID',
  client_secret: 'YOUR_CLIENT_SECRET',
});
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

require("./db/conn");
const jwtToken = require("jsonwebtoken");
const port = process.env.PORT || 3000;
const static_path = path.join(__dirname, "../public");

app.use(express.static(static_path));
app.use(cors());
app.use(express.json());
app.use('/api', stripeApi);
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", (req, res, next) => {
  console.log("Requested image:", req.url);
  express.static(path.join(__dirname, "uploads"))(req, res, next);
});
app.get("/", (req, res) => {
  res.send("Hello from me");
});

app.listen(8000, () => {
  console.log(`Server is running on 8000`);
});
const createUploadsFolder = () => {
  const folderPath = path.join(__dirname, "uploads");
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath);
  }
};
// Create the "uploads" folder
createUploadsFolder();
io.on('connection', (socket) => {
  console.log('A user connected');

  // Handle new messages from clients
  socket.on('newMessage', (message) => {
    // Broadcast the new message to all connected clients
    io.emit('newMessage', message);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const folderPath = path.join(__dirname, "uploads");
    cb(null, folderPath);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage });
const jwt = require("jsonwebtoken"); 
const DeathList = require("./models/DeathList");
const Form1 = require("./models/sagi_forms/Form1");
const Form2 = require("./models/sagi_forms/Form2");
const Form3 = require("./models/sagi_forms/Form3");
const Form4 = require("./models/sagi_forms/Form4");
const Form5 = require("./models/sagi_forms/Form5");
const Form6 = require("./models/sagi_forms/Form6");
const secretKey = process.env.JWT_SECRET_KEY;
const Image = require("./models/Image");
const Payment = require("./models/Payment");
const Group = require("./models/Group");

const authenticateToken = (req, res, next) => {
  const token = req.header("Authorization");
  console.log("Received Token:", token);

  if (!token || !token.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Access denied. Token missing or invalid format." });
  }

  const tokenWithoutBearer = token.substring(7); // Remove "Bearer " prefix

  try {
    const decoded = jwt.verify(tokenWithoutBearer, secretKey);
    console.log("Decoded Token:", decoded);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token." });
  }
};
app.post("/signup", upload.single("image"), async (req, res) => {
  try {
    const { FName, LName, password, email, phoneNumber, Identity, address } = req.body;
    const { filename } = req.file; // File saved by multer middleware

    // Check if a user with the same email, phone number, or identity already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phoneNumber }, { Identity }],
    });

    if (existingUser) {
      if (existingUser.Identity === Identity) {
        return res.status(400).json({ message: 'Identity already registered' });
      } else if (existingUser.phoneNumber === phoneNumber) {
        return res.status(400).json({ message: 'Phone number already registered' });
      } else if (existingUser.email === email) {
        return res.status(400).json({ message: 'Email already registered' });
      }
    }

    // Create a new user instance using the User model
    const newUser = new User({
      FName,
      LName,
      password,
      Image: filename,
      email,
      phoneNumber,
      Identity,
      // dob,
      address,
    });

    // Save the new user to the database
    await newUser.save();
    const token = jwt.sign({ userId: newUser._id }, secretKey, {
      expiresIn: "1h",
    });
    // Initiate the Stripe payment session
    const items = [
      {
        price: 'price_1OWGe5CYfYj7LbEhPF9XrpMs', // Your product price ID
        quantity: 1,
      },
      // Add more items if needed
    ];
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: items,
      mode: 'payment',
      success_url: 'http://localhost:8000/payment-success',
      cancel_url: 'http://localhost:8000/payment-cancel',
    });
    // Save the payment record to the database
    const payment = new Payment({
      sessionId: session.id,
      userId: newUser._id, // Include userId in the payment record
      // Add more payment-related fields as needed
    });

    await payment.save();

    // Update the user's payment status
    newUser.IsPaid = true;
    await newUser.save();

    res.status(200).json({
      message: 'User registered successfully',
      uniqueID: newUser.uniqueID,
      sessionId: session.id,
      userId: newUser._id,
      token, // Include the token in the response

    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred' });
  }
});
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid User" });
    }
    if (user.returning_member) {
      return res.status(403).json({ success: false, message: "Returning members cannot log in" });
    }
    if (user.isDeleted) {
      return res.status(403).json({ success: false, message: "User account is deactivated" });
    }

    if (!user.IsActive) {
      return res.status(403).json({ success: false, message: "User account is not active" });
    }

    if (user.password !== password) {
      return res.status(401).json({ success: false, message: "Invalid Password" });
    }

    const token = jwt.sign({ userId: user._id }, secretKey, {
      expiresIn: "1h",
    });

    // Include user details in the response
    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        _id: user._id,
        FName: user.FName,
        LName: user.LName,
        email: user.email,
        uniqueID: user.uniqueID,
        phoneNumber: user.phoneNumber,
        Identity: user.Identity,
        address: user.address,
        IsActive: user.IsActive,
        dateAdded: user.dateAdded,
        Image: user.Image,
        userType: user.userType,

        // Include other user details as needed
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "An error occurred" });
  }
});
app.post("/returning_login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid User" });
    }

    if (user.isDeleted) {
      return res.status(403).json({ success: false, message: "User account is deactivated" });
    }

    if (!user.IsActive) {
      return res.status(403).json({ success: false, message: "User account is not active" });
    }

    // Check if the user is a returning member
    if (!user.returning_member) {
      return res.status(403).json({ success: false, message: "You are not a returning member" });
    }

    if (user.password !== password) {
      return res.status(401).json({ success: false, message: "Invalid Password" });
    }

    const token = jwt.sign({ userId: user._id }, secretKey, {
      expiresIn: "1h",
    });

    // Include user details in the response
    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        _id: user._id,
        FName: user.FName,
        LName: user.LName,
        email: user.email,
        uniqueID: user.uniqueID,
        phoneNumber: user.phoneNumber,
        Identity: user.Identity,
        address: user.address,
        IsActive: user.IsActive,
        dateAdded: user.dateAdded,
        Image: user.Image,
        userType: user.userType,

        // Include other user details as needed
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "An error occurred" });
  }
});
app.post('/logout', (req, res) => {
  // Assuming the token is sent in the Authorization header
  const authToken = req.headers.authorization;

  if (!authToken) {
    return res.status(401).json({ success: false, message: 'Unauthorized: No token provided' });
  }

  // Clear the token from local storage
  // This assumes you are using the same key ('token') to store the token in local storage
  localStorage.removeItem('token');

  res.status(200).json({ success: true, message: 'Logout successful', token: '' });
});
app.get("/check-auth", authenticateToken, (req, res) => {
  // If the code reaches here, it means the user is authenticated
  // You can return additional user information if needed
  res.json({ isAuthenticated: true, userId: req.userId });
});
app.get("/protected", authenticateToken, (req, res) => {
  res.json({ message: "This is a protected route.", userId: req.userId });
});
app.post("/city", async (req, res) => {
  try {
    const { cityname} = req.body;
    const newCity = new City({
      cityname
    });

    await newCity.save();

    res.status(200).json({ message: "City registered successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "An error occurred" });
  }
});
app.post('/users/:userId/toggle-status', async (req, res) => {
  const userId = req.params.userId;

  try {
    // Find the user by ID in the database
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Toggle the IsActive status
    user.IsActive = !user.IsActive;

    // Save the updated user to the database
    await user.save();

    res.json({ message: 'User status toggled successfully', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while toggling user status' });
  }
});
app.get("/users", async (req, res) => {
  try {
    const allUsers = await User.find({});

    // Add image paths to each user object
    const usersWithImagePaths = allUsers.map((user) => {
      const imagePath = user.Image ? path.join(__dirname, "uploads", user.Image) : null;
      return { ...user._doc, imagePath };
    });

    res.status(200).json(usersWithImagePaths);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "An error occurred while fetching users" });
  }
});
app.get("/cities", async (req, res) => {
  try {
    const cities = await City.find({}, 'cityname'); // Query all cities and project only the 'cityname' field
    res.status(200).json(cities);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "An error occurred while fetching cities" });
  }
});
app.post("/deathlist",upload.single("image"), async (req, res) => {
  try {
    const { Name, Description, Death_Date } = req.body;
    const { filename } = req.file; // File saved by multer middleware
    const newdeathlist = new DeathList({
       Name,
       Description,
      Image: filename,
      Death_Date,
    });

    await newdeathlist.save();

    res.status(200).json({ message: "Death List Upgraded successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "An error occurred" });
  }
});
app.get("/deathlist", async (req, res) => {
  try {
    const deathlist = await DeathList.find({}); // Query all cities and project only the 'cityname' field
    res.status(200).json(deathlist);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "An error occurred while fetching cities" });
  }
});
app.post("/form1", async (req, res) => {
  try {
    const { fname, lname,dob, returning_member,comments } = req.body;
    const newform = new Form1({
      fname,
      lname,
      dob,
      returning_member,
      comments
    });

    await newform.save();
    res.status(200).json({ message: "Registered Successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "An error occurred" });
  }
});
app.post('/form2', async (req, res) => {
  try {
    const { fname, lname, mId, reason, comments } = req.body;

    // Check if user with given fname, lname, and mId exists
    const existingUser = await User.findOne({ FName: fname, LName: lname, uniqueID: mId });

    if (existingUser) {
      // User exists, proceed with saving Form2
      const newForm = new Form2({
        fname,
        lname,
        mId,
        reason,
        comments,
      });

      await newForm.save();
      res.status(200).json({ message: 'Form submitted successfully' });
    } else {
      // User does not exist, return an error response
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred' });
  }
});
app.post("/form3", async (req, res) => {
  try {
    const { fname, lname,phone,email,dob, title } = req.body;
    const newform = new Form3({
      fname,
      lname,
      dob,
      title,
      email,
      phone
    });

    await newform.save();
    res.status(200).json({ message: "Registered Successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "An error occurred" });
  }
});
app.post("/form4", async (req, res) => {
  try {
    const { fname, lname, mId, newfname, newlname, reason } = req.body;

    // Check if user with given fname, lname, and mId exists
    const existingUser = await User.findOne({ FName: fname, LName: lname, uniqueID: mId });

    if (existingUser) {
      // User exists, proceed with saving Form4
      const newForm = new Form4({
        fname,
        lname,
        mId,
        newfname,
        newlname,
        reason,
      });

      await newForm.save();
      res.status(200).json({ message: "Form submitted successfully" });
    } else {
      // User does not exist, return an error response
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "An error occurred" });
  }
});
app.post("/form5", async (req, res) => {
  try {
    const { fname, lname, mId, association_code, association_name } = req.body;

    // Check if the user (mId, FName, LName) exists
    const user = await User.findOne({ uniqueID: mId, FName: fname, LName: lname });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Check if the association (association_code and association_name) exists
    const group = await Group.findOne({
      AssociationCode: association_code,
      name: association_name,
    });
    if (!group) {
      return res.status(400).json({ message: "Group not found" });
    }

    const newform = new Form5({
      fname,
      lname,
      mId,
      association_code,
      association_name,
    });

    await newform.save();
    res.status(200).json({ message: "Registered Successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "An error occurred" });
  }
});
app.post("/form6", async (req, res) => {
  try {
    const { fname, lname,title,email,phone } = req.body;
    const newform = new Form6({
      fname,
      lname,
      title,
      email,
      phone
    });

    await newform.save();
    res.status(200).json({ message: "Registered Successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "An error occurred" });
  }
});
app.get("/form1", async (req, res) => {
  try {
    const form = await Form1.find({});
    res.status(200).json(form);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "An error occurred while fetching cities" });
  }
});
app.get("/form2", async (req, res) => {
  try {
    const form = await Form2.find({});
    res.status(200).json(form);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "An error occurred while fetching cities" });
  }
});
app.get("/form3", async (req, res) => {
  try {
    const form = await Form3.find({});
    res.status(200).json(form);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "An error occurred while fetching cities" });
  }
});
app.get("/form4", async (req, res) => {
  try {
    const form = await Form4.find({});
    res.status(200).json(form);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "An error occurred while fetching cities" });
  }
});
app.get("/form5", async (req, res) => {
  try {
    const form = await Form5.find({});
    res.status(200).json(form);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "An error occurred while fetching cities" });
  }
});
app.get("/form5/:adminId", async (req, res) => {
  try {
    const { adminId } = req.params;

    // Check if the provided adminId is valid
    const group = await Group.findOne({ admin: adminId });
    if (!group) {
      return res.status(400).json({ message: "Invalid adminId" });
    }

    // Fetch Form5 data associated with the group
    const form5Data = await Form5.find({
      association_code: group.AssociationCode,
      association_name: group.name,
    });

    // Fetch additional details of the group admin (user)
    const adminDetails = await User.findById(adminId);

    // Fetch details of the user who submitted the Form5 data
    const formSubmitterDetails = [];
    for (const formData of form5Data) {
      const userDetail = await User.findOne({ uniqueID: formData.mId });
      formSubmitterDetails.push(userDetail);
    }

    res.status(200).json({ group, adminDetails, formSubmitterDetails, form5Data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "An error occurred" });
  }
});
app.get("/form6", async (req, res) => {
  try {
    const form = await Form6.find({});
    res.status(200).json(form);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "An error occurred while fetching cities" });
  }
});
app.post("/deathlist",upload.single("image"), async (req, res) => {
  try {
    const { Name, Description, } = req.body;
    const { filename } = req.file; // File saved by multer middleware
    // Create a new user instance using the User model
    const newUser = new DeathList({
       Name,
       Description,
       Image: filename,
    });

    // Save the new user to the database
    await newUser.save();

    res.status(200).json({
      message: 'User registered successfully',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred' });
  }
});
app.post("/upload", upload.single("file"), (req, res) => {
  // Check if req.file exists before destructuring
  if (req.file) {
    const { filename } = req.file;
    // Handle the filename as needed
    res.send(`File uploaded: ${filename}`);
  } else {
    res.status(400).send("No file uploaded");
  }
});
app.get("/payment", async (req, res) => {
  try {
    const form = await Payment.find({});
    res.status(200).json(form);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "An error occurred while fetching cities" });
  }
});
app.post('/api/groups/:groupId/messages', authenticateToken, async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const { sender, message } = req.body;

    // Validate that the sender exists
    const existingSender = await User.findById(sender);
    if (!existingSender) {
      return res.status(400).json({ error: 'Sender does not exist.' });
    }

    // Save the group message to the database
    const newMessage = {
      sender,
      message,
      timestamp: Date.now(),
    };

    const updatedGroup = await Group.findByIdAndUpdate(
      groupId,
      { $push: { messages: newMessage } },
      { new: true }
    );

    res.status(200).json(updatedGroup.messages);
  } catch (error) {
    console.error('Error sending group message:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
// Express route to create a new group
app.post('/api/groups', authenticateToken, async (req, res) => {
  const { name, description, AssociationCode,Country, City  } = req.body;

  try {
    const existingGroup = await Group.findOne({ AssociationCode });

    if (existingGroup) {
      return res.status(400).json({ error: 'Association code already exists. Choose a different one.' });
    }
    const existingGroupNameGroup = await Group.findOne({ name });

    if (existingGroupNameGroup) {
      return res.status(400).json({ error: 'Group name already exists. Choose a different one.' });
    }
    // The authenticated user creating the group is the admin
    const adminId = req.userId;

    // Filter out null values from members array
    const members = (req.body.members || []).filter((member) => member !== null);
    
    // Validate that each member exists
    const existingMembers = await User.find({ _id: { $in: members.map((member) => member._id) } });

    const nonExistingMembers = members.filter(
      (member) => !existingMembers.some((user) => user._id.toString() === member._id)
    );

    if (nonExistingMembers.length > 0) {
      return res.status(400).json({ error: 'One or more members do not exist.' });
    }

    const nonUniqueMembers = members.filter(
      (member, index, self) => self.findIndex((m) => m._id === member._id) !== index
    );

    if (nonUniqueMembers.length > 0) {
      return res.status(400).json({ error: 'One or more members are duplicated in the group.' });
    }

    const allMembers = [...existingMembers.map((user) => user._id), adminId];

    // If all members are valid, proceed with creating the group
    const newGroup = await Group.create({
      name,
      description,
      members: allMembers,
      admin: adminId,
      Country,
      City,
      AssociationCode,
    });

    // Respond with the newly created group
    res.status(201).json(newGroup);
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
app.get("/groups/:adminId", async (req, res) => {
  const adminId = req.params.adminId;

  try {
    const groups = await Group.find({ admin: adminId }).populate('members', 'email'); // Assuming you want to populate the members' emails
    res.json(groups);
  } catch (error) {
    console.error("Error fetching groups by admin ID:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
// Route to add members to an existing group
app.post('/api/groups/:groupId/add-members', authenticateToken, async (req, res) => {
  const groupId = req.params.groupId;
  const { members } = req.body;

  try {
    // Validate that each member exists
    const existingMembers = await User.find({
      $or: members.map((member) => ({
        FName: member.FName.trim(),
        LName: member.LName.trim(),
        email: member.email.trim().toLowerCase(),
        Identity: member.Identity.trim(),
      })),
    });
    

    const nonExistingMembers = members.filter(
      (member) =>
        !existingMembers.some(
          (user) =>
            user.FName === member.FName &&
            user.LName === member.LName &&
            user.email === member.email &&
            user.Identity === member.Identity
        )
    );

    if (nonExistingMembers.length > 0) {
      return res.status(400).json({ error: 'One or more members do not exist.', missingMembers: nonExistingMembers });
    }
    

    // If all members are valid, update the group with the new members
    const updatedGroup = await Group.findByIdAndUpdate(
      groupId,
      { $addToSet: { members: { $each: existingMembers.map((user) => user._id) } } },
      { new: true }
    );

    // Respond with the updated group
    res.status(200).json(updatedGroup);
  } catch (error) {
    console.error('Error adding members to group:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// GET API to fetch all groups and their details
app.get('/api/groups', async (req, res) => {
  try {
    // Retrieve all groups and populate details for admin and members
    const groups = await Group.find({ isDeleted: false })
      .populate({
        path: 'admin',
        select: 'FName LName Identity email phoneNumber Identity address IsActive', // Specify the fields you want to include
      })
      .populate({
        path: 'members',
        select: 'FName LName Identity email phoneNumber Identity address IsActive', // Specify the fields you want to include
      });

    // Map the result to include only the necessary details
    const mappedGroups = groups.map((group) => ({
      _id: group._id,
      name: group.name,
      description: group.description,
      Country: group.Country,
      City: group.City,
      AssociationCode: group.AssociationCode,
      admin: {
        _id: group.admin._id,
        FName: group.admin.FName,
        LName: group.admin.LName,
        Identity: group.admin.Identity,
        email: group.admin.email,
      },
      members: group.members.map((member) => ({
        _id: member._id,
        FName: member.FName,
        LName: member.LName,
        Identity: member.Identity,
        email: member.email,
      })),
      isDeleted: group.isDeleted,
      dateAdded: group.dateAdded,
    }));

    res.status(200).json(mappedGroups);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// POST API to change the status of a group
app.post('/api/groups/:groupId/toggle-status', async (req, res) => {
  const groupId = req.params.groupId;

  try {
    // Use findByIdAndUpdate to update only the isDeleted field
    const updatedGroup = await Group.findByIdAndUpdate(
      groupId,
      { $set: { isDeleted: !currentStatus } },
      { new: true }
    );

    if (!updatedGroup) {
      return res.status(404).json({ error: 'Group not found' });
    }

    res.json({ message: 'Group status toggled successfully', group: updatedGroup });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while toggling group status' });
  }
});
app.get('/groups/:groupId/messages', authenticateToken, async (req, res) => {
  try {
    const groupId = req.params.groupId;

    // Fetch the group based on the groupId
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Return the messages of the group
    res.status(200).json(group.messages || []);
  } catch (error) {
    console.error('Error fetching group messages:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
app.get("/groups/added/:userId", async (req, res) => {
  const userId = req.params.userId;

  try {
    // Find groups where the user is added as a member
    const groups = await Group.find({ members: userId }).populate('members', 'email');
    res.json(groups);
  } catch (error) {
    console.error("Error fetching groups where user is added:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
app.post('/create-checkout-session', async (req, res) => {
  try {
    console.log("Request received at /create-checkout-session");

    const { paymentMethodId, userId } = req.body; // Get userId from the request body
    console.log("Received Token:", req.header("Authorization"));
    console.log("Authenticated User ID:", userId);

    // Retrieve product details based on the paymentMethodId
    const items = [
      {
        price: 'price_1OWGe5CYfYj7LbEhPF9XrpMs', // Your product price ID
        quantity: 1,
      },
      // Add more items if needed
    ];

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: items,
      mode: 'payment',
      success_url: 'http://localhost:8000/success',
      cancel_url: 'http://localhost:8000/cancel',
    });

    console.log("Checkout Session Created:", session);

    const payment = new Payment({
      sessionId: session.id,
      userId: userId,
      // Add more payment-related fields as needed
    });

    // Save the payment record to the database
    await payment.save();
    console.log("Payment Record Saved to Database");

    res.json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Error creating checkout session' });
  }
});
app.get('/success', (req, res) => {
  // Handle the success page logic here
  // You can customize this logic based on your needs
  res.redirect('http://localhost:3000/authentication/sign-in'); // Redirect to the signup page
});
app.get('/payments', async (req, res) => {
  try {
    // Find all payment records
    const payments = await Payment.find();

    // Return the payment details
    res.status(200).json(payments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred' });
  }
});
// Example route to get all user details by userId
app.get('/user/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Return all user details
    res.status(200).json({
      user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred' });
  }
});
app.post('/returning-checkout-session', async (req, res) => {
  try {
    console.log("Request received at /create-checkout-session");

    const { paymentMethodId, userId } = req.body; // Get userId from the request body
    console.log("Received Token:", req.header("Authorization"));
    console.log("Authenticated User ID:", userId);

    // Retrieve product details based on the paymentMethodId
    const items = [
      {
        price: 'price_1OWfBZCYfYj7LbEhgfeLmOcO', // Your product price ID
        quantity: 1,
      },
      // Add more items if needed
    ];

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: items,
      mode: 'payment',
      success_url: 'http://localhost:8000/success',
      cancel_url: 'http://localhost:8000/cancel',
    });

    console.log("Checkout Session Created:", session);

    const payment = new Payment({
      sessionId: session.id,
      userId: userId,
      // Add more payment-related fields as needed
    });

    // Save the payment record to the database
    await payment.save();
    console.log("Payment Record Saved to Database");

    await User.findByIdAndUpdate(userId, { returning_member: false });

    res.json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Error creating checkout session' });
  }
});
