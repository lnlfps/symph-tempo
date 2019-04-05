
import _isPlainObject from 'is-plain-object'

export const isPlainObject = _isPlainObject
export const isArray = Array.isArray.bind(Array)
export const isFunction = o => typeof o === 'function'
export const returnSelf = m => m
export const noop = () => {}

/**
 * Prints a warning in the console if it exists.
 *
 * @param {String} message The warning message.
 * @returns {void}
 */
export function warning (message) {
  /* eslint-disable no-console */
  if (typeof console !== 'undefined' && typeof console.error === 'function') {
    console.error(message)
  }
  /* eslint-enable no-console */
  try {
    // This error was thrown as a convenience so that if you enable
    // "break on all exceptions" in your console,
    // it would pause the execution at this line.
    throw new Error(message)
  } catch (e) {} // eslint-disable-line no-empty
}

const hasOwn = Object.prototype.hasOwnProperty;

function is(x, y) {
  if (x === y) {
    return x !== 0 || y !== 0 || 1 / x === 1 / y;
  } else {
    return x !== x && y !== y;
  }
}

/**
 *
 * @param objA
 * @param objB
 * @param exclude  这些属性，不参与参与比较
 * @returns {boolean}
 */
export function shallowEqual(objA, objB, {exclude = []}={}) {
  if (is(objA, objB)) return true;

  if (typeof objA !== 'object' || objA === null || typeof objB !== 'object' || objB === null) {
    return false;
  }

  const keysA = Object.keys(objA).filter(i => !exclude.includes(i));
  const keysB = Object.keys(objB).filter(i => !exclude.includes(i));
  if (keysA.length !== keysB.length) return false;

  for (var i = 0; i < keysA.length; i++) {
    if (!hasOwn.call(objB, keysA[i]) || !is(objA[keysA[i]], objB[keysA[i]])) {
      return false;
    }
  }

  return true;
}
