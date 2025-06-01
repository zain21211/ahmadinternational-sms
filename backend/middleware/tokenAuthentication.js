require('dotenv').config();

const jwt = require('jsonwebtoken'); // You'll need to add this package

// Authentication middleware
const authenticateToken = (req, res, next) => {
    console.log("authentication in  process")

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token == null) return res.sendStatus(401);
    
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      console.log("Authenticated user:", user); // Log the authenticated user for debugging
      next();
    });
  }

module.exports = authenticateToken;