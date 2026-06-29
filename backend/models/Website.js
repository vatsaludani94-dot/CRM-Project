const mongoose = require('mongoose');

const WebsiteSectionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Hero', 'Features', 'Pricing', 'Testimonials', 'FAQ', 'Contact', 'Footer', 'Blog'],
    required: true,
  },
  title: String,
  subtitle: String,
  content: mongoose.Schema.Types.Mixed, // Stores block content like items lists, button text, body, etc.
  style: {
    backgroundColor: { type: String, default: '#ffffff' },
    textColor: { type: String, default: '#0f172a' },
  }
});

const WebsiteSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    subdomain: {
      type: String,
      lowercase: true,
      trim: true,
    },
    domain: {
      type: String,
      lowercase: true,
      trim: true,
    },
    published: {
      type: Boolean,
      default: false,
    },
    template: {
      type: String,
      enum: ['SaaS', 'Agency', 'Consulting', 'Corporate', 'Education', 'Startup'],
      default: 'SaaS',
    },
    seo: {
      title: { type: String, default: '' },
      description: { type: String, default: '' },
      keywords: { type: String, default: '' },
    },
    sections: [WebsiteSectionSchema],
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
    }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Website', WebsiteSchema);
