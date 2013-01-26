<?php

/**
 * @file
 * Callbacks for the "wysiwyg" Create.js PropertyEditor widget.
 */

function _edit_editor_ckeditor_is_compatible(array $instance, array $items) {

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

function _edit_editor_ckeditor_metadata(array $instance, array $items) {
  $field = field_info_field($instance['field_name']);
  $format = $items[0]['format'];

  module_load_include('inc', 'ckeditor', 'includes/ckeditor.lib');

  if ($settings = ckeditor_profiles_compile($format)) {

    // Clean up a few settings.
    foreach (array('customConfig', 'show_toggle', 'ss', 'contentsCss', 'stylesCombo_stylesSet') as $config_item) {
      unset($settings[$config_item]);
    }

    // For some reasons when ckeditor is in profiles/libraries ckeditor module
    // defaults to the kama skin that doesn't exists in CKEditor 4 standard.
    // @todo remove? might be too brutal.
    if ($settings['skin'] == 'kama') {
      $settings['skin'] = 'moono';
    }

    // Add plugins that are not yet in ckeditor core.
    $plugins = edit_ckeditor_plugin();
    // Adds sharedspace plugin, required for toolbar to show up.
    $settings['loadPlugins']['sharedspace'] = $plugins['sharedspace'];
    $settings['loadPlugins']['sharedspace']['path'] = $GLOBALS['base_path'] . $plugins['sharedspace']['path'];
    // Adds onchange plugin to properly detect changes in editable.
    $settings['loadPlugins']['onchange'] = $plugins['onchange'];
    $settings['loadPlugins']['onchange']['path'] = $GLOBALS['base_path'] . $plugins['onchange']['path'];

    //[#1473010]
    // @todo see if this is needed.
    if (isset($settings['scayt_sLang'])) {
      $settings['scayt_language'] = $settings['scayt_sLang'];
      unset($settings['scayt_sLang']);
    }
    elseif (!empty($field["#language"]) && $field["#language"] != LANGUAGE_NONE) {
      $settings['scayt_language'] = ckeditor_scayt_langcode($field["#language"]);
    }
  }

  return array(
    'format' => $format,
    'ckeditor' => $settings,
  );
}

function _edit_editor_ckeditor_attachments() {
  $ckeditor_path = ckeditor_library_path('relative') . '/ckeditor';
  return array(
    'library' => array(
      array('edit', 'edit.editor.ckeditor'),
    ),
    'js' => array(
      array('data' => array('ckeditor' => array('basePath' =>  $ckeditor_path . '/')), 'type' => 'setting'),
    ),
  );
}
