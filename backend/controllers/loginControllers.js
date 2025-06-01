require("dotenv").config();

const mssql = require("mssql");
const jwt = require("jsonwebtoken");
const dbConnection = require("../database/connection"); // Import your database connection

// Login controller
const loginController = async (req, res) => {
  const { password, checked } = req.body;


  if (!password) {
    return res
      .status(400)
      .json({ message: "password are required." });
  }

  const options = !checked ? { expiresIn: '1h' } : {};

  try {

    // Use the connection passed from main.js
    const pool = await dbConnection();

    // Query the database for the user based on the username
    const result = await pool
      .request()
      .input("password", mssql.NVarChar, password)
      .query("SELECT username, USERTYPE FROM USERS WHERE PASSWORD = @password");

    // Check if user exists
    const user = result.recordset[0];
    if (!user) {
      return res.status(401).json({ message: "Invalid password." });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username, userType: user.USERTYPE },
      process.env.JWT_SECRET,
      options
    );
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    res.status(200).json({ message: "Login successful.", token, options });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

module.exports = loginController;
