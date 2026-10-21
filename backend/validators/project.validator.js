import { body, validationResult } from 'express-validator';
import { isValidCSSColor } from '../utils/colorValidator.js';

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((err) => ({
        field: err.path || err.param,
        message: err.msg,
      })),
    });
  }
  next();
};

const validateKeywords = (val) => {
  if (val === null || val === undefined) return true;
  if (typeof val !== 'object' || Array.isArray(val)) {
    throw new Error('Keywords must be an object with heading and items');
  }
  const heading = typeof val.heading === 'string' ? val.heading.trim() : '';
  const items = val.items;

  // Heading required containing at least one word
  if (!heading || !/\S+/.test(heading)) {
    throw new Error('Keywords heading is required and must contain at least one word');
  }

  // Require at least one non-empty item
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Keywords must contain at least one item');
  }

  // Reject empty entries and trim whitespace
  const nonEmpties = items
    .map((it) => (typeof it === 'string' ? it.trim() : ''))
    .filter(Boolean);

  if (nonEmpties.length === 0) {
    throw new Error('Keywords must contain at least one non-empty item');
  }

  for (const item of items) {
    if (typeof item !== 'string' || !item.trim()) {
      throw new Error('Keyword items cannot be empty and whitespace must not be blank');
    }
  }

  return true;
};

const validatePalette = (val) => {
  if (val === null || val === undefined) return true;
  if (typeof val !== 'object' || Array.isArray(val)) {
    throw new Error('Palette must be an object with heading and colors');
  }
  if (val.heading !== undefined && val.heading !== null && typeof val.heading !== 'string') {
    throw new Error('Palette heading must be a string');
  }
  if (val.colors !== undefined) {
    if (!Array.isArray(val.colors)) {
      throw new Error('Palette colors must be an array');
    }
    for (const color of val.colors) {
      if (!color || typeof color !== 'object') {
        throw new Error('Each palette color must be an object');
      }
      if (typeof color.value !== 'string' || !color.value.trim()) {
        throw new Error('Color value is required');
      }
      if (!isValidCSSColor(color.value)) {
        throw new Error(`Invalid CSS color value: "${color.value}"`);
      }
      if (color.name !== undefined && color.name !== null && typeof color.name !== 'string') {
        throw new Error('Color name must be a string if provided');
      }
    }
  }
  return true;
};

const validateLists = (val) => {
  if (val === null || val === undefined) return true;
  if (!Array.isArray(val)) throw new Error('Lists must be an array');
  for (const list of val) {
    if (typeof list !== 'object' || Array.isArray(list)) {
      throw new Error('Each list must be an object');
    }
    if (list.heading !== undefined && list.heading !== null && typeof list.heading !== 'string') {
      throw new Error('List heading must be a string');
    }
    if (list.paragraph !== undefined && list.paragraph !== null && typeof list.paragraph !== 'string') {
      throw new Error('List paragraph must be a string');
    }
    if (Array.isArray(list.items)) {
      for (const item of list.items) {
        if (typeof item !== 'string' || !item.trim()) {
          throw new Error('List items cannot be empty');
        }
      }
    }
  }
  return true;
};

const validateSections = (val) => {
  if (val === null || val === undefined) return true;
  if (!Array.isArray(val)) throw new Error('Sections must be an array');
  for (const section of val) {
    if (typeof section !== 'object' || Array.isArray(section)) {
      throw new Error('Each section must be an object');
    }
    if (section.heading !== undefined && typeof section.heading !== 'string') {
      throw new Error('Section heading must be a string');
    }
    if (section.intro !== undefined && typeof section.intro !== 'string') {
      throw new Error('Section intro must be a string');
    }
    if (Array.isArray(section.paragraphs)) {
      for (const p of section.paragraphs) {
        if (typeof p !== 'string') throw new Error('Section paragraphs must be strings');
      }
    }
  }
  return true;
};

const validateImageBlocks = (val) => {
  if (val === null || val === undefined) return true;
  if (!Array.isArray(val)) throw new Error('Image blocks must be an array');
  for (const block of val) {
    if (typeof block !== 'object' || Array.isArray(block)) {
      throw new Error('Each image block must be an object');
    }
    if (block.heading !== undefined && typeof block.heading !== 'string') {
      throw new Error('Image block heading must be a string');
    }
    if (Array.isArray(block.paragraphs)) {
      for (const p of block.paragraphs) {
        if (typeof p !== 'string') throw new Error('Image block paragraph must be a string');
      }
    }
    if (Array.isArray(block.subheadings)) {
      for (const s of block.subheadings) {
        if (typeof s !== 'string') throw new Error('Image block subheading must be a string');
      }
    }
    if (Array.isArray(block.items)) {
      for (const it of block.items) {
        if (typeof it !== 'string') throw new Error('Image block item must be a string');
      }
    }
    if (block.caption !== undefined && typeof block.caption !== 'string') {
      throw new Error('Image block caption must be a string');
    }
    if (block.layout !== undefined && typeof block.layout !== 'string') {
      throw new Error('Image block layout must be a string');
    }
  }
  return true;
};

export const createProjectValidator = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Project title is required')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Project description is required'),
  body('shortDescription').optional().trim().isString(),
  body('category').optional().trim().isString().isLength({ max: 50 }).withMessage('Category cannot exceed 50 characters'),
  body('location').optional({ nullable: true }).trim().isString(),
  body('area').optional({ nullable: true }).trim().isString(),
  body('coverImage').optional({ nullable: true }).trim().isString(),
  body('images').optional().isArray(),
  body('gallery').optional().isArray(),
  body('contentBlocks').optional().isArray(),
  body('contentBlocks.*.type')
    .isIn(['heading', 'paragraph', 'image'])
    .withMessage('Content block type must be heading, paragraph, or image'),
  body('year')
    .optional({ nullable: true })
    .isInt({ min: 1900, max: 2100 })
    .withMessage('Year must be a 4-digit number between 1900 and 2100'),
  body('price')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('published')
    .optional()
    .isBoolean()
    .withMessage('Published must be a boolean'),
  body('keywords')
    .optional({ nullable: true })
    .custom(validateKeywords),
  body('palette')
    .optional({ nullable: true })
    .custom(validatePalette),
  body('lists')
    .optional({ nullable: true })
    .isArray()
    .custom(validateLists),
  body('sections')
    .optional({ nullable: true })
    .isArray()
    .custom(validateSections),
  body('imageBlocks')
    .optional({ nullable: true })
    .isArray()
    .custom(validateImageBlocks),
  handleValidationErrors,
];

export const updateProjectValidator = [
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ max: 200 }),
  body('description')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Description cannot be empty'),
  body('shortDescription').optional().trim().isString(),
  body('category').optional().trim().isString().isLength({ max: 50 }).withMessage('Category cannot exceed 50 characters'),
  body('location').optional({ nullable: true }).trim().isString(),
  body('area').optional({ nullable: true }).trim().isString(),
  body('coverImage').optional({ nullable: true }).trim().isString(),
  body('images').optional().isArray(),
  body('gallery').optional().isArray(),
  body('contentBlocks').optional().isArray(),
  body('contentBlocks.*.type')
    .isIn(['heading', 'paragraph', 'image'])
    .withMessage('Content block type must be heading, paragraph, or image'),
  body('year')
    .optional({ nullable: true })
    .isInt({ min: 1900, max: 2100 }),
  body('price')
    .optional({ nullable: true })
    .isFloat({ min: 0 }),
  body('published')
    .optional()
    .isBoolean(),
  body('keywords')
    .optional({ nullable: true })
    .custom(validateKeywords),
  body('palette')
    .optional({ nullable: true })
    .custom(validatePalette),
  body('lists')
    .optional({ nullable: true })
    .isArray()
    .custom(validateLists),
  body('sections')
    .optional({ nullable: true })
    .isArray()
    .custom(validateSections),
  body('imageBlocks')
    .optional({ nullable: true })
    .isArray()
    .custom(validateImageBlocks),
  handleValidationErrors,
];

export const createProjectCategoryValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Category name is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('Category name cannot exceed 50 characters'),
  handleValidationErrors,
];
