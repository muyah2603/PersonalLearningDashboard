const mongoose = require('mongoose');

const suggestionSchema = new mongoose.Schema(
  {
    userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
  },
  { timestamps: true }
);

// Fix DB-IDX-1: find({ userId }).sort({ createdAt: -1 }) — getSuggestions
suggestionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Suggestion', suggestionSchema);