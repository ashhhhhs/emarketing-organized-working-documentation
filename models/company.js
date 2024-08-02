//schema 
const mongoose = require('mongoose');
const sectionSchema = require('./section');
const themeSchema = require('./theme');
const companySchema = new mongoose.Schema({
    name: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    logo: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
    },
    theme: themeSchema,
    sections: [sectionSchema],
  });
  //creating model of company
  const Company = mongoose.model('Company', companySchema);
  module.exports = Company;