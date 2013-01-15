<?php

/**
 * @file
 * Callbacks for the "wysiwyg" Create.js PropertyEditor widget.
 */

function _edit_editor_wysiwyg_is_compatible(array $instance, array $items) {

  module_load_include('inc', 'ckeditor', 'includes/ckeditor.lib');

  $field = field_info_field($instance['field_name']);
  $format = $items[0]['format'];

  $wysiwyg_possible = $field['cardinality'] == 1 && !empty($instance['settings']['text_processing']);
  $ckeditor_on = FALSE;

  if ($profile = ckeditor_get_profile($format)) {
    if ($settings = ckeditor_profiles_compile($format)) {
      $ckeditor_on = ($profile->settings['default'] == 't') ? TRUE : FALSE;
    }
  }

  return $wysiwyg_possible && $ckeditor_on;
}

function _edit_editor_wysiwyg_metadata(array $instance, array $items) {
  $field = field_info_field($instance['field_name']);
  $format = $items[0]['format'];

  module_load_include('inc', 'ckeditor', 'includes/ckeditor.lib');

  if ($settings = ckeditor_profiles_compile($format)) {
    $data = array(
      'module_path' => ckeditor_module_path('relative'),
      'editor_path' => ckeditor_path('relative') . '/',
      'ajaxToken' => drupal_get_token('ckeditorAjaxCall'),
      'xss_url' => url('ckeditor/xss'),
      'theme' => $GLOBALS['theme'],
    );

    //[#1473010]
    if (isset($settings['scayt_sLang'])) {
      $data['scayt_language'] = $settings['scayt_sLang'];
    }
    elseif (!empty($field["#language"]) && $field["#language"] != LANGUAGE_NONE) {
      $data['scayt_language'] = ckeditor_scayt_langcode($field["#language"]);
    }

    foreach(array('paging', 'linktocontent_node', 'linktocontent_menu', 'pagebreak') as $plugin) {
      if (module_exists($plugin)) {
        $data[$plugin] = TRUE;
      }
    }
  }

  return array(
    'format' => $format,
    'ckeditor' => $data,
  );
}

function _edit_editor_wysiwyg_attachments() {
  module_load_include('inc', 'ckeditor', 'includes/ckeditor.lib');
  return array(
    'library' => array(
      array('edit', 'edit.editor.wysiwyg'),
    ),
    'js' => array(
      array(
        'data' => 'window.CKEDITOR_BASEPATH = "' . ckeditor_path('relative') . '/"',
        'type' => 'inline',
        'weight' => -100,
      )
    )
  );
}
