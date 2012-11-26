<?php

/**
 * @file
 * Definition of Drupal\edit_aloha\Plugin\edit\processedTextPropertyEditor\Aloha.
 */

namespace Drupal\edit_aloha\Plugin\edit\processedTextPropertyEditor;

use Drupal\edit\Plugin\ProcessedTextPropertyEditorBase;
use Drupal\Core\Annotation\Plugin;
use Drupal\Core\Annotation\Translation;

/**
 * Defines an Aloha Editor-based WYSIWYG PropertyEditor widget for Create.js.
 *
 * @Plugin(
 *   id = "aloha",
 *   title = @Translation("Aloha Editor"),
 *   library = {
 *     "module" = "edit_aloha",
 *     "name" = "aloha.edit"
 *   },
 *   propertyEditorName = "drupalAlohaWidget"
 * )
 */
class Aloha extends ProcessedTextPropertyEditorBase  {

  /**
   * Implements Drupal\edit\Plugin\ProcessedTextPropertyEditorBase::addJsSettings().
   */
  function addJsSettings() {
    aloha_add_format_settings();
  }

  /**
   * Implements Drupal\edit\Plugin\ProcessedTextPropertyEditorBase::checkFormatCompatibility().
   */
  function checkFormatCompatibility($format_id) {
    return aloha_check_format_compatibility($format_id);
  }

}