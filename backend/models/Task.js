const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  sportCategory: String,
  dueDate: Date,
  completed: { type: Boolean, default: false },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Task', schema);
