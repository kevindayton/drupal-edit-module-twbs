<?php

/**
 * @file
 * Callbacks for the "direct" Create.js PropertyEditor widget.
 */

function _edit_editor_direct_is_compatible(array $instance, array $items) {
  $field = field_info_field($instance['field_name']);

  // This editor is incompatible with multivalued fields.
  if ($field['cardinality'] != 1) {
    return FALSE;
  }
  // This editor is incompatible with processed ("rich") text fields.
  elseif (!empty($instance['settings']['text_processing'])) {
    return FALSE;
  }
  else {
    return TRUE;
  }
}

function _edit_editor_direct_metadata(array $instance, array $items) {
  return array();
}

function _edit_editor_direct_attachments() {
  return array(
    'library' => array(
      array('edit', 'edit.editor.direct'),
    ),
  );
}
