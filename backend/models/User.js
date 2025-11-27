const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  name: String,
  email: { type: String, required: true, unique: true },
  passwordHash: String,
  googleId: String,
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('User', schema);
