const mongoose = require('mongoose');

const SurveyQuestionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Text', 'Multiple Choice', 'NPS (0-10)', 'Rating (1-5)', 'Quiz Option'],
    required: true,
  },
  text: { type: String, required: true },
  choices: [String], // for multiple choice or quiz options
  correctAnswer: String, // for quizzes
  scoreValue: { type: Number, default: 0 }, // for scoring quizzes
  branchingLogic: {
    conditionChoice: String, // option selected to trigger branch
    jumpToQuestionIndex: Number, // 0-based question index to jump to
  }
});

const SurveySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['Customer Satisfaction', 'NPS', 'Feedback', 'Polls', 'Quizzes'],
      required: true,
    },
    questions: [SurveyQuestionSchema],
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
    }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Survey', SurveySchema);
