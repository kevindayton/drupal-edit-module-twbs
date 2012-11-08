(function($) {

/**
 * @file util.js
 *
 * Utilities for Edit module.
 */

Drupal.edit = Drupal.edit || {};
Drupal.edit.util = Drupal.edit.util || {};

Drupal.edit.util.getID = function(element) {
  var id = jQuery(element).data('edit-id');
  if (!id) {
    id = jQuery(element).closest('[data-edit-id]').data('edit-id');
  }
  return id;
};

// @todo: this looks almost identical to code in SparkEditService. Can we get
// rid of this?
Drupal.edit.util.getElementSubject = function(element) {
  return Drupal.edit.util.getID(element).split(':').slice(0, 2).join('/');
};

Drupal.edit.util.getElementPredicate = function(element) {
  return Drupal.edit.util.getID(element).split(':').slice(2, 5).join('/');
};

Drupal.edit.util.getElementValue = function(element) {
  var valueElement = jQuery('.field-item', element);
  if (valueElement.length === 0) {
    // Handle page title
    valueElement = jQuery('h1', element);
  }
  return $.trim(valueElement.html());
};

Drupal.edit.util.getElementEntity = function(element, vie) {
  return vie.entities.get(Drupal.edit.util.getElementSubject(element));
};

/*
 * findEditableFields() just looks for fields that are editable, i.e. for the
 * field *wrappers*. Depending on the field, however, either the whole field wrapper
 * will be marked as editable (in this case, an inline form will be used for editing),
 * *or* a specific (field-specific even!) DOM element within that field wrapper will be
 * marked as editable.
 * This function is for finding the *editables* themselves, given the *editable fields*.
 */
Drupal.edit.util.findEditablesForFields = function($fields) {
  var $editables = $();

  // type = form
  $editables = $editables.add($fields.filter('.edit-type-form'));

  // type = direct
  var $direct = $fields.filter('.edit-type-direct');
  $editables = $editables.add($direct.find('.field-item'));
  // Edge case: "title" pseudofield on pages with lists of nodes.
  $editables = $editables.add($direct.filter('h2').find('a'));
  // Edge case: "title" pseudofield on node pages.
  $editables = $editables.add($direct.find('h1'));

  return $editables;
};

Drupal.edit.util.findFieldForID = function(id, context) {
  var domID = id.replace(/\//g, ':');
  return $('[data-edit-id="' + domID + '"]', context || $('#content'));
};

Drupal.edit.util.findFieldForEditable = function($editable) {
  return $editable.filter('.edit-type-form').length ? $editable : $editable.closest('.edit-type-direct');
};

// @todo: remove, no usages found.
Drupal.edit.util.findEntityForField = function($f) {
  var $e = $f.closest('.edit-entity');
  if ($e.length === 0) {
    var entity_edit_id = $f.data('edit-id').split(':').slice(0,2).join('/');
    $e = $('.edit-entity[data-edit-id="' + entity_edit_id + '"]');
  }
  return $e;
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
