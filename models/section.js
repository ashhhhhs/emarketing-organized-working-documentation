const mongoose = require('mongoose');
const templateSchema = require('./template');

const sectionSchema = new mongoose.Schema({
  template: {
    type: templateSchema,
    required: true
  },
  data: {
    type: Map,
    of: mongoose.Schema.Types.Mixed //for different maps
  },
  order: {
    type: Number,
    required: true
  }
});

//same here as well
module.exports = sectionSchema; 