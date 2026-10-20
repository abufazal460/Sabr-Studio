/**
 * CSS Color Validator for Frontend
 * Uses browser-supported CSS color parsing with deterministic fallback.
 * Validates HEX, RGB, RGBA, HSL, HSLA, and CSS named colors.
 */

export const CSS_NAMED_COLORS = new Set([
  'aliceblue', 'antiquewhite', 'aqua', 'aquamarine', 'azure', 'beige', 'bisque',
  'black', 'blanchedalmond', 'blue', 'blueviolet', 'brown', 'burlywood', 'cadetblue',
  'chartreuse', 'chocolate', 'coral', 'cornflowerblue', 'cornsilk', 'crimson', 'cyan',
  'darkblue', 'darkcyan', 'darkgoldenrod', 'darkgray', 'darkgreen', 'darkgrey',
  'darkkhaki', 'darkmagenta', 'darkolivegreen', 'darkorange', 'darkorchid', 'darkred',
  'darksalmon', 'darkseagreen', 'darkslateblue', 'darkslategray', 'darkslategrey',
  'darkturquoise', 'darkviolet', 'deeppink', 'deepskyblue', 'dimgray', 'dimgrey',
  'dodgerblue', 'firebrick', 'floralwhite', 'forestgreen', 'fuchsia', 'gainsboro',
  'ghostwhite', 'gold', 'goldenrod', 'gray', 'green', 'greenyellow', 'grey',
  'honeydew', 'hotpink', 'indianred', 'indigo', 'ivory', 'khaki', 'lavender',
  'lavenderblush', 'lawngreen', 'lemonchiffon', 'lightblue', 'lightcoral', 'lightcyan',
  'lightgoldenrodyellow', 'lightgray', 'lightgreen', 'lightgrey', 'lightpink',
  'lightsalmon', 'lightseagreen', 'lightskyblue', 'lightslategray', 'lightslategrey',
  'lightsteelblue', 'lightyellow', 'lime', 'limegreen', 'linen', 'magenta', 'maroon',
  'mediumaquamarine', 'mediumblue', 'mediumorchid', 'mediumpurple', 'mediumseagreen',
  'mediumslateblue', 'mediumspringgreen', 'mediumturquoise', 'mediumvioletred',
  'midnightblue', 'mintcream', 'mistyrose', 'moccasin', 'navajowhite', 'navy',
  'oldlace', 'olive', 'olivedrab', 'orange', 'orangered', 'orchid', 'palegoldenrod',
  'palegreen', 'paleturquoise', 'palevioletred', 'papayawhip', 'peachpuff', 'peru',
  'pink', 'plum', 'powderblue', 'purple', 'rebeccapurple', 'red', 'rosybrown',
  'royalblue', 'saddlebrown', 'salmon', 'sandybrown', 'seagreen', 'seashell',
  'sienna', 'silver', 'skyblue', 'slateblue', 'slategray', 'slategrey', 'snow',
  'springgreen', 'steelblue', 'tan', 'teal', 'thistle', 'tomato', 'turquoise',
  'violet', 'wheat', 'white', 'whitesmoke', 'yellow', 'yellowgreen', 'transparent'
]);

const FORBIDDEN_KEYWORDS = new Set([
  'inherit', 'initial', 'unset', 'revert', 'revert-layer', 'currentcolor'
]);

/**
 * Validates whether a value is a valid CSS color.
 * Rejects invalid colors rather than silently substituting a different color.
 *
 * @param {string} val
 * @returns {boolean}
 */
export function isValidCSSColor(val) {
  if (typeof val !== 'string') return false;
  const s = val.trim();
  if (!s) return false;
  const lower = s.toLowerCase();

  // Disallow non-color CSS system keywords
  if (FORBIDDEN_KEYWORDS.has(lower)) return false;

  // Named color match
  if (CSS_NAMED_COLORS.has(lower)) return true;

  // HEX colors: #rgb, #rgba, #rrggbb, #rrggbbaa (3, 4, 6, 8 hex digits)
  if (/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(s)) return true;

  // rgb / rgba format
  const rgbMatch = lower.match(
    /^rgba?\(\s*([\d.]+%?)\s*[, ]\s*([\d.]+%?)\s*[, ]\s*([\d.]+%?)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i
  );
  if (rgbMatch) {
    const checkChannel = (c) => {
      if (!c) return false;
      if (c.endsWith('%')) {
        const num = parseFloat(c.slice(0, -1));
        return !isNaN(num) && num >= 0 && num <= 100;
      }
      const num = parseFloat(c);
      return !isNaN(num) && num >= 0 && num <= 255;
    };
    const checkAlpha = (a) => {
      if (a === undefined || a === null || a === '') return true;
      if (a.endsWith('%')) {
        const num = parseFloat(a.slice(0, -1));
        return !isNaN(num) && num >= 0 && num <= 100;
      }
      const num = parseFloat(a);
      return !isNaN(num) && num >= 0 && num <= 1;
    };

    if (
      checkChannel(rgbMatch[1]) &&
      checkChannel(rgbMatch[2]) &&
      checkChannel(rgbMatch[3]) &&
      checkAlpha(rgbMatch[4])
    ) {
      return true;
    }
    return false;
  }

  // hsl / hsla format
  const hslMatch = lower.match(
    /^hsla?\(\s*([\d.]+(?:deg|rad|turn)?)\s*[, ]\s*([\d.]+%)\s*[, ]\s*([\d.]+%)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i
  );
  if (hslMatch) {
    const checkPercent = (p) => {
      if (!p || !p.endsWith('%')) return false;
      const num = parseFloat(p.slice(0, -1));
      return !isNaN(num) && num >= 0 && num <= 100;
    };
    const checkAlpha = (a) => {
      if (a === undefined || a === null || a === '') return true;
      if (a.endsWith('%')) {
        const num = parseFloat(a.slice(0, -1));
        return !isNaN(num) && num >= 0 && num <= 100;
      }
      const num = parseFloat(a);
      return !isNaN(num) && num >= 0 && num <= 1;
    };

    if (checkPercent(hslMatch[2]) && checkPercent(hslMatch[3]) && checkAlpha(hslMatch[4])) {
      return true;
    }
  }

  // Browser-supported CSS color verification fallback if in browser DOM
  if (typeof window !== 'undefined' && typeof Option !== 'undefined') {
    try {
      const opt = new Option();
      opt.style.color = '';
      opt.style.color = s;
      if (opt.style.color !== '') {
        return true;
      }
    } catch {
      // ignore
    }
  }

  return false;
}
