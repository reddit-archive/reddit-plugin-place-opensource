!function(r, $, _) {
  // A dict to store all module exports on.
  // Add r, $, _, store by default for convenience.
  var modules = {
    r: r,
    jQuery: $,
    underscore: _,
    store: store,
  };

  /**
   * Return the export value of the given module name.
   * @function
   * @param {string} name The name of a function that has been passed to
   *    `r.placeModule`
   * @returns {any} The return value of that function, or undefined
   */
  function require(name) {
    return modules[name];
  }

  /**
   * Simple module wrapper.
   *
   * Wrap modules with this rather than the default r2 wrapper for a
   * *slightly* better experience.
   *
   * Call `r.placeModule` with a function, and it will call that function
   * with the above `require` function as the only argument.  If the
   * module function is named, its return value is saved under that name
   * so that other modules can require it by name.
   *
   * This is not at all smart – dependencies must be bundled in the correct
   * order in __init__.py so that they are available by the time they are
   * required, as usual.  The names of the modules match the filenames by
   * convention only.
   *
   * @function
   * @param {function} moduleFunction A function that accepts the require
   *    function defined above as its only argument.
   */
  r.placeModule = function(name, moduleFunction) {
    var exportVal = moduleFunction(require);
    if (name) {
      modules[name] = exportVal;
    }
  };
}(r, jQuery, _);
