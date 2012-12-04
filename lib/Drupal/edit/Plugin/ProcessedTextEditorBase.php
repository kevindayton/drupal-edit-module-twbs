<?php

/**
 * @file
 * Definition of \Drupal\edit\Plugin\ProcessedTextPropertyBase.
 */

namespace Drupal\edit\Plugin;

use Drupal\Component\Plugin\PluginBase;

/**
 * Base class for processed text editor plugins.
 */
abstract class ProcessedTextEditorBase extends PluginBase implements ProcessedTextEditorInterface {

  /**
   * Implements \Drupal\edit\Plugin\ProcessedTextEditorInterface::addJsSettings().
   */
  public function addJsSettings() {
  }

  /**
   * Implements \Drupal\edit\Plugin\ProcessedTextEditorInterface::checkFormatCompatibility().
   */
  public function checkFormatCompatibility($format_id) {
  }

}
