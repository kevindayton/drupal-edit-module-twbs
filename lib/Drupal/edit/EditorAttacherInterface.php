<?php

/**
 * @file
 * Contains Drupal\edit\EditorAttacherInterface.
 */

namespace Drupal\edit;

/**
 * Interface for attaching an in-place editor to a field.
 */
interface EditorAttacherInterface {

  /**
   * Adds attributes needed for in-place editing the field.
   *
   * This method should be called from a theme('field') preprocessor.
   *
   * @see edit_preprocess_field()
   */
  public function preprocessField(&$variables);

}
