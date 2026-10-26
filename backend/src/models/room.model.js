const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomid: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  roomname: {
    type: String,
    required: true,
    trim: true
  },
  roomHostid: {
    type: String,
    required: true,
    index: true
  },
  roomHostName: {
    type: String,
    default: ''
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  password: {
    type: String,
    default: ''
  },
  // Specifically requested date and time string formats
  roomCreatedOnDate: {
    type: String,
    required: true
  },
  roomCreatedOnTime: {
    type: String,
    required: true
  },
  // Store canvas snapshot elements for rejoining or ongoing work
  canvasState: {
    type: Array,
    default: []
  }
}, {
  timestamps: true
});

const Room = mongoose.model('Room', roomSchema);
module.exports = Room;
