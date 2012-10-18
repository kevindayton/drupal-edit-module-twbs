<?php
/**
 * @file
 * Provides theme functions for the Edit module.
 */

use Drupal\Core\Template\Attribute;

/**
 * @ingroup themeable
 * @{
 */

/**
 * Formats a field in a wrapper with the required metadata.
 *
 * @todo: Make sure this hack is no longer necessary!
 */
function theme_edit_spanned_field($variables) {
  $variables['attributes']['data-edit-id'] = $variables['edit_id'];
  $variables['attributes']['data-edit-field-label'] = $variables['label'];

  return '<span' . new Attribute($variables['attributes']) . '>' .  $variables['value'] . '</span>';
}

/**
 * @} End of "ingroup themeable".
 */
