<?php

/**
 * @file
 * Edit module API
 *
 * @todo
 */

/**
 *
$editors['form'] = array(
  'widget' => 'drupalFormWidget',
  'compatibility check callback' => '_edit_editor_form_is_compatible',
  'metadata callback' => '_edit_editor_form_metadata',
  'attachments callback' => '_edit_editor_form_attachments',
  'file' => 'includes/editor.form.inc',
  'file path' => drupal_get_path('module', 'edit'),
);
 *
 */
function hook_edit_editor_info() {

}

function hook_edit_editor_info_alter(&$editors) {

}

function hook_edit_editor_metadata_alter(&$metadata, $editor) {

}

function hook_edit_editor_attachments_alter(&$attachments, $editor, $metadata) {

}

