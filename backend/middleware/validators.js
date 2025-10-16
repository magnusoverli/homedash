import { body, param, query, validationResult } from 'express-validator';

export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Invalid input data',
      fields: errors.array().reduce((acc, err) => {
        acc[err.path] = err.msg;
        return acc;
      }, {}),
    });
  }
  next();
};

export const validateFamilyMember = () => [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
  body('color')
    .trim()
    .notEmpty()
    .withMessage('Color is required')
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Color must be a valid hex color'),
];

export const validateActivity = () => [
  body('member_id')
    .isInt({ min: 1 })
    .withMessage('Valid member ID is required'),
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('date')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Date must be in YYYY-MM-DD format'),
  body('start_time')
    .matches(/^\d{2}:\d{2}$/)
    .withMessage('Start time must be in HH:MM format'),
  body('end_time')
    .matches(/^\d{2}:\d{2}$/)
    .withMessage('End time must be in HH:MM format'),
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string'),
];

export const validateHomework = () => [
  body('member_id')
    .isInt({ min: 1 })
    .withMessage('Valid member ID is required'),
  body('subject')
    .trim()
    .notEmpty()
    .withMessage('Subject is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Subject must be between 1 and 100 characters'),
  body('assignment').trim().notEmpty().withMessage('Assignment is required'),
  body('week_start_date')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Week start date must be in YYYY-MM-DD format'),
  body('completed')
    .optional()
    .isBoolean()
    .withMessage('Completed must be a boolean'),
];

export const validateApiKey = () => [
  body('apiKey')
    .trim()
    .notEmpty()
    .withMessage('API key is required')
    .isLength({ min: 10 })
    .withMessage('API key appears to be invalid'),
];

export const validateSpondCredentials = () => [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Must be a valid email'),
  body('password')
    .trim()
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

export const validateMemberId = () => [
  param('memberId')
    .isInt({ min: 1 })
    .withMessage('Valid member ID is required'),
];

export const validateId = () => [
  param('id').isInt({ min: 1 }).withMessage('Valid ID is required'),
];

export const validateDateRange = () => [
  query('start_date')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Start date must be in YYYY-MM-DD format'),
  query('end_date')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('End date must be in YYYY-MM-DD format'),
];
