var express = require('express');
var router = express.Router();
const sequelize = require("../config/database");
const userModel = require("../models/userModel")
const CustomFormField = require("../models/CustomFormField")
const LeadData = require("../models/LeadData")
const con = require("../config/database");
const bcrypt = require('bcryptjs');
const { DataTypes } = require("sequelize");
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const randomString =  require('randomstring')
const nodemailer = require('nodemailer');
const isAuth = require('../Middlewares/isAuth');

// login get request
router.get("/", function (req, res, next) {
  res.render("login", { title: "scaleedge" });
});

// post router login request
router.post("/login", async (req, res) => {

  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Please add email and password" })
    }
    // find user
    const findUser = await userModel.findOne({
      where: {
        [Op.or]: [{ email: email }, { employee_id: email }]
      }
    })
    if (!findUser) {
      return res.status(400).json({ error: "User does not exist" })
    }
    // check password
    const decryptPassword = await bcrypt.compare(password, findUser.password)
    if (!decryptPassword) {
      return res.status(400).json({ error: "Invalid credentials" })
    }
    req.session.user = true;

    res.status(200).json({ success: true, message: "Login successful" });

  } catch (error) {
    return res.status(400).json({ success: false, error: error.message })
  }
})

//sign up get request
router.get("/signup", (req, res) => {
  res.render("register")
})




//lead Managment get request
router.get("/leadManagement", isAuth, function (req, res, next) {
  res.render("leadManagement", { title: "scaleedge" });
});

// logout get request
router.get("/logout", (req, res) => {
  if (req.session.user) {
    req.session.destroy();
  }
  res.redirect("/");
});

router.get("/customizeLeadform", function (req, res, next) {
  // let userGroup = req.session.user_group;
  // console.log(userGroup);
  // let isAdmin = userGroup === "admin";
  res.render("customizeLeadform", { title: "sumit" });
});

// post custom field and alter lead table
router.post("/sendCustomField", async function (req, res, next) {
  try {
    const { labelName, name, divId, type } = req.body;
    // Insert into custom_form_field table
    await CustomFormField.create({
      labelName,
      name,
      divId,
      type
    });

    // Dynamically add a column to the lead_data table based on the labelName
    const columnDefinition = `ALTER TABLE lead_data ADD COLUMN ${labelName.replace(/\s+/g, "")} VARCHAR(255);`;

    await sequelize.query(columnDefinition);

    res.json({ success: true });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ success: false, error: "Database error" });
  }
});

//select all custom_form_field
router.get("/sendCustomField", async (req, res) => {
  try {
    // Use Sequelize model to execute the query
    const data = await CustomFormField.findAll();

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ success: false, error: "Database error" });
  }
});

//delete custom field
router.post("/sendCustomField/:id", async (req, res) => {
  const id = req.params.id;

  try {
    // Get the labelName for the div_id
    const customField = await CustomFormField.findOne({
      where: {
        div_id: id
      }
    });

    if (!customField) {
      return res.status(404).json({ success: false, error: "Custom field not found" });
    }

    const labelName = customField.labelName;

    // Delete the custom field from CustomFormField
    await CustomFormField.destroy({
      where: {
        div_id: id
      }
    });

    // Drop the column from the lead_data table
    await sequelize.query(`ALTER TABLE lead_data DROP COLUMN ${labelName.replace(/\s+/g, "")};`);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ success: false, error: "Database error" });
  }
});


//post lead data 
router.post('/lead_data', function (req, res) {
  const leadData = req.body;
  const customFieldsMap = {
    'leadName': 'lead_name',
    'contactNum': 'number',
    'contactemail': 'email',
    'selectstatus': 'lead_status'
  };

  // Construct SQL query to insert data into lead_data table
  let insertQuery = `INSERT INTO lead_data (`;

  // Prepare column names and values for the SQL query
  const columnNames = [];
  const columnValues = [];

  // Iterate through each field in leadData
  for (const field in leadData) {
    if (leadData.hasOwnProperty(field)) {
      // Map custom field names to fixed field names
      if (customFieldsMap.hasOwnProperty(field)) {
        columnNames.push(customFieldsMap[field]);
      } else {
        columnNames.push(field);
      }
      columnValues.push(`'${leadData[field]}'`);
    }
  }

  insertQuery += columnNames.join(', ');
  insertQuery += `) VALUES (`;
  insertQuery += columnValues.join(', ');
  insertQuery += `);`;

  // Execute the insert query
  con.query(insertQuery, function (error, results) {
    if (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: "Database error" });
    }

  });
  res.status(200).json({ success: true, message: "Lead data inserted successfully" });

});



// POST : Send OTP Vertification 

const otpMap = new Map()
router.post('/send-otp', (req, res) => {
    const email = req.body.email;

    // genrate the a random OTP
    const otp = randomString.generate({
      length:4,
      charset: 'numeric'
    });

    otpMap.set(email,otp)
    // send the OTP to email 
    const transporter  = nodemailer.createTransport({
      service: 'gmail',
      host:"smtp.gmail.com",
      port:465,
      secure:true,
      auth:{
        user:"shubhamsharma20007@gmail.com",
        pass:"oewgbwrftpzhteii"
      }
    })
    const mailOptions={
      from :"shubhamsharma20007@gmail.com",
      to :email,
      subject :"OTP Verification",
      text:"Your OTP is "+otp
    }

    transporter.sendMail(mailOptions,(error,info)=>{
      if(error){
        console.error('Error sending email',error)
      }
      else{
        console.log('Email sent:',info.response)
        res.status(200).json({message:"OTP sent successfully",otp: otp,success:true})
      }
    })


})


// POST : /otp-value

router.post('/otp-value', (req, res) => {
    const {inputOne,inputSecond,inputThird,inputFour} = req.body;
    // merge the data 
    const str = `${inputOne}${inputSecond}${inputThird}${inputFour}`;
    const lastValue = str.slice(-1); // Extract the last 4 characters
    console.log(lastValue);
    
})


// post router signup request

router.post("/signup", async (req, res) => {

  try {
      const email = req.body.email;
      const enteredOtp = req.body.otp;
      console.log(enteredOtp)
      const storedOtp = otpMap.get(email);
      console.log(storedOtp)
      if (enteredOtp === storedOtp) {
        otpMap.delete(email);
        const { username, number, password, confirmPassword } = req.body;

        if (!username || !email || !number || !password || !confirmPassword) {
          return res.status(400).json({ error: "Please add all the fields" });
        }

        // check if the password matches the confirm password
        if (password !== confirmPassword) {
          return res.status(400).json({ error: "Password and Confirm Password do not match" });
        }

        // check the number length
        if (number.length !== 10) {
          return res.status(400).json({ error: "Please enter a valid 10 digit number", success: false });
        }

        // check if the user already exists
        const userExist = await userModel.findOne({ where: { email } });
        if (userExist) {
          return res.status(400).json({ error: "User already exists" });
        }

        // hash the password
        const bcryptPassword = await bcrypt.hash(password, 10);

        // create a new user
        const uniqueId = `scaleedge${uuidv4().split("-")[1]}`;
        const newUser = await userModel.create({ username, email, number, password: bcryptPassword, employee_id: uniqueId });

        return res.status(200).json({ success: true, message: "User created successfully", user: newUser });
      } else {
        return res.status(400).json({ success: false, error: "Invalid OTP" });
      }
    } catch (error) {
      return res.status(400).json({ success: false, error: error.message });
    }
});

module.exports = router;
