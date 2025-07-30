// Utility to sanitize, transliterate, and truncate a string for safe filenames
const { slugify } = require('transliteration');

function makeSafeFilename(id, title, existingNames = new Set()) {
  // Transliterate to ASCII
  let safe = slugify(title || '', { lowercase: false, separator: '' });
  // Remove non-alphanum, remove spaces, trim, limit length
  safe = safe
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 64);
  if (!safe) safe = 'audio';
  let name = safe;
  let n = 1;
  while (existingNames.has(name)) {
    name = `${safe}_${n}`;
    n++;
  }
  existingNames.add(name);
  return name + '.mp3';
}

module.exports = { makeSafeFilename };
