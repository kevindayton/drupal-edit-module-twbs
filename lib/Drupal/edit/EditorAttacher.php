<?php

/**
 * @file
 * Contains \Drupal\edit\EditorAttacher.
 */

namespace Drupal\edit;

use Drupal\edit\Access\EditEntityFieldAccessCheckInterface;

/**
 * Adds the HTML attributes needed to enable in-place editing.
 */
class EditorAttacher implements EditorAttacherInterface {

  /**
   * An object that checks if a user has access to edit a given entity field.
   *
   * @var \Drupal\edit\Access\EditEntityFieldAccessCheckInterface
   */
  protected $accessChecker;

  /**
   * An object that determines which editor to attach to a given field.
   *
   * @var \Drupal\edit\EditorSelectorInterface
   */
  protected $editorSelector;

  /**
   * Constructs a new EditorAttacher.
   *
   * @param \Drupal\edit\Access\EditEntityFieldAccessCheckInterface $access_checker
   *   An object that checks if a user has access to edit a given field.
   *
   * @param \Drupal\edit\EditorSelectorInterface $editor_selector
   *   An object that determines which editor to attach to a given field.
   */
  public function __construct(EditEntityFieldAccessCheckInterface $access_checker, EditorSelectorInterface $editor_selector) {
    $this->accessChecker = $access_checker;
    $this->editorSelector = $editor_selector;
  }

  /**
   * Implements \Drupal\edit\EditorAttacherInterface::preprocessField().
   */
  public function preprocessField(&$variables) {
    $element = $variables['element'];
    $entity = $element['#object'];
    $field_name = $element['#field_name'];
    if (!$this->accessChecker->accessEditEntityField($entity, $field_name)) {
      return;
    }

    $instance = field_info_instance($entity->entityType(), $field_name, $entity->bundle());
    if ($editor = $this->editorSelector->getEditor($element['#formatter'], $instance, $element['#items'])) {
      // Attributes needed to make the element editable.
      $variables['attributes']['data-edit-field-label'] = $instance['label'];
      $variables['attributes']['data-edit-id'] = $entity->entityType() . ':' . $entity->id() . ':' . $field_name . ':' . $element['#language'] . ':' . $element['#view_mode'];
      $variables['attributes']['aria-label'] = t('Entity @type @id, field @field', array('@type' => $entity->entityType(), '@id' => $entity->id(), '@field' => $instance['label']));
      $variables['attributes']['class'][] = 'edit-field';
      $variables['attributes']['class'][] = 'edit-allowed';
      $variables['attributes']['class'][] = 'edit-type-' . $editor;

      // Additional attributes for WYSIWYG editor integration.
      if ($editor == 'direct-with-wysiwyg') {
        $variables['attributes']['class'][] = 'edit-type-direct';
        $format_id = $element['#items'][0]['format'];
        $variables['attributes']['data-edit-text-format'] = $format_id;
        $variables['attributes']['class'][] = $this->textFormatHasTransformationFilters($format_id) ? 'edit-text-with-transformation-filters' : 'edit-text-without-transformation-filters';
      }
    }
  }

  /**
   * Returns whether the text format has transformation filters.
   */
  protected function textFormatHasTransformationFilters($format_id) {
    return (bool) count(array_intersect(array(FILTER_TYPE_TRANSFORM_REVERSIBLE, FILTER_TYPE_TRANSFORM_IRREVERSIBLE), filter_get_filter_types_by_format($format_id)));
  }

}
