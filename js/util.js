(function($) {

/**
 * @file util.js
 *
 * Utilities for Edit module.
 */

Drupal.edit = Drupal.edit || {};
Drupal.edit.util = Drupal.edit.util || {};

Drupal.edit.util.constants = {};
Drupal.edit.util.constants.transitionEnd = "transitionEnd.edit webkitTransitionEnd.edit transitionend.edit msTransitionEnd.edit oTransitionEnd.edit";

// Temporary helper function: logging.
Drupal.edit.debug = false;
Drupal.edit.util.log = function() {
  if (Drupal.edit.debug && window.console) {
    console.log(Array.prototype.slice.call(arguments));
  }
};

Drupal.edit.util.calcFormURLForField = function(id) {
  var parts = id.split('/');
  var urlFormat = decodeURIComponent(Drupal.settings.edit.fieldFormURL);
  return Drupal.formatString(urlFormat, {
    '!entity_type': parts[0],
    '!id'         : parts[1],
    '!field_name' : parts[2],
    '!langcode'   : parts[3],
    '!view_mode'  : parts[4]
  });

};

// @todo: remove, no usage found.
Drupal.edit.util.calcRerenderProcessedTextURL = function(id) {
  var parts = id.split('/');
  var urlFormat = decodeURIComponent(Drupal.settings.edit.rerenderProcessedTextURL);
  return Drupal.formatString(urlFormat, {
    '!entity_type': parts[0],
    '!id'         : parts[1],
    '!field_name' : parts[2],
    '!langcode'   : parts[3],
    '!view_mode'  : parts[4]
  });
};

/**
 * Ignore hovering to/from the given closest element, but as soon as a hover
 * occurs to/from *another* element, then call the given callback.
 */
Drupal.edit.util.ignoreHoveringVia = function(e, closest, callback) {
  if ($(e.relatedTarget).closest(closest).length > 0) {
    e.stopPropagation();
  }
  else {
    callback();
  }
};

})(jQuery);
