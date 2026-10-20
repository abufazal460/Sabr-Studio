/**
 * CSS Color Validator for Node.js backend
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

/**
 * Validates whether a given string is a valid CSS color value.
 * Supports:
 * - HEX: #RGB, #RGBA, #RRGGBB, #RRGGBBAA
 * - RGB / RGBA: rgb(r, g, b), rgba(r, g, b, a), rgb(r g b / a)
 * - HSL / HSLA: hsl(h, s, l), hsla(h, s, l, a)
 * - CSS Named Colors (e.g. burlywood, black, white, transparent)
 * Rejects invalid strings, unparseable numbers, or out-of-range values.
 *
 * @param {string} val
 * @returns {boolean}
 */
export function isValidCSSColor(val) {
  if (typeof val !== 'string') return false;
  const s = val.trim().toLowerCase();
  if (!s) return false;

  // Named color match
  if (CSS_NAMED_COLORS.has(s)) return true;

  // HEX colors: #rgb, #rgba, #rrggbb, #rrggbbaa (3, 4, 6, 8 hex digits)
  if (/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(s)) return true;

  // rgb / rgba format
  // rgb(217, 199, 184), rgba(217, 199, 184, 0.5), rgb(217 199 184 / 0.5), rgb(100%, 50%, 0%)
  const rgbMatch = s.match(
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
  // hsl(210, 50%, 60%), hsla(210deg, 50%, 60%, 0.8)
  const hslMatch = s.match(
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

  return false;
}
