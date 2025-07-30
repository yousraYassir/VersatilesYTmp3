// Utility to sanitize, transliterate, and truncate a string for safe filenames
const { slugify } = require('transliteration');

function makeSafeFilename(id, title, existingNames = new Set()) {
  // Transliterate to ASCII
  let safe = slugify(title || '', { lowercase: false, separator: '_' });
  // Remove non-alphanum, collapse underscores, trim, limit length
  safe = safe
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32);
  if (!safe) safe = 'audio';
  let base = `${id}-${safe}`;
  let name = base;
  let n = 1;
  while (existingNames.has(name)) {
    name = `${base}_${n}`;
    n++;
  }
  existingNames.add(name);
  return name + '.mp3';
}

module.exports = { makeSafeFilename };
