<?php
/**
 * @file
 * Definition of Drupal\edit\Plugin\ProcessedTextPropertyEditorBase.
 */

namespace Drupal\edit\Plugin;

use Drupal\views\Plugin\views\PluginBase;

/**
 * Defines an interface for PropertyEditor widgets for processed text fields.
 *
 * A PropertyEditor widget is a user-facing interface to edit an entity property
 * through Create.js.
 */
abstract class ProcessedTextPropertyEditorBase extends PluginBase {

  /**
   * Adds JavaScript settings.
   */
  public function addJsSettings() { }

  /**
   * Checks if the text editor is compatible with a given text format.
   *
   * @param $format_id
   *   A text format ID.
   *
   * @return bool
   *   TRUE if it is compatible, FALSE otherwise.
   */
  public function checkFormatCompatibility($format_id) { }

}
