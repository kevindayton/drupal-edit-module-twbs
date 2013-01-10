<?php
/**
 * @file
 * Provides theme functions for the Edit module.
 */

/**
 * @ingroup themeable
 * @{
 */

/**
 * Formats a field in a wrapper with the required metadata.
 */
function theme_edit_spanned_field($variables) {
  $variables['attributes']['data-edit-id'] = $variables['edit_id'];

  $attributes = drupal_attributes($variables['attributes']);

  return '<span' . $attributes . '><span class="field-item">' .  $variables['value'] . '</span></span>';
}

/**
 * @} End of "ingroup themeable".
 */
