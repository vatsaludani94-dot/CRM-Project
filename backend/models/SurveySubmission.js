const mongoose = require('mongoose');

const SurveyAnswerSchema = new mongoose.Schema({
  questionIndex: { type: Number, required: true },
  questionText: { type: String, required: true },
  answerText: { type: String, required: true },
});

const SurveySubmissionSchema = new mongoose.Schema(
  {
    survey: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Survey',
      required: true,
    },
    respondentEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    npsScore: {
      type: Number, // Stores the 0-10 value if NPS question exists
    },
    answers: [SurveyAnswerSchema],
    score: {
      type: Number, // Stores cumulative score for quizzes
      default: 0,
    },
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
    }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('SurveySubmission', SurveySubmissionSchema);
