<?php

/**
 * @file
 * Contains of Drupal\edit\EditController.
 */

namespace Drupal\edit;

use Symfony\Component\DependencyInjection\ContainerAware;
use Drupal\Core\Ajax\AjaxResponse;
use Drupal\Core\Entity\EntityInterface;
use Drupal\edit\Ajax\FieldFormCommand;
use Drupal\edit\Ajax\FieldFormSavedCommand;
use Drupal\edit\Ajax\FieldFormValidationErrorsCommand;
use Drupal\edit\Ajax\FieldRenderedWithoutTransformationFiltersCommand;

/**
 * Returns responses for Edit module routes.
 */
class EditController extends ContainerAware {

  /**
   * Returns a single field edit form as an Ajax response.
   *
   * @param \Drupal\Core\Entity\EntityInterface $entity
   *   The entity being edited.
   * @param string $field_name
   *   The name of the field that is being edited.
   * @param string $langcode
   *   The name of the language for which the field is being edited.
   * @param string $view_mode
   *   The view mode the field should be rerendered in.
   * @return \Drupal\Core\Ajax\AjaxResponse
   *   The Ajax response.
   */
  public function fieldForm(EntityInterface $entity, $field_name, $langcode, $view_mode) {
    $response = new AjaxResponse();

    $form_state = array(
      'entity' => $entity,
      'field_name' => $field_name,
      'langcode' => $langcode,
      'no_redirect' => TRUE,
      'build_info' => array('args' => array()),
    );
    $form = drupal_build_form('edit_field_form', $form_state);

    if (!empty($form_state['executed'])) {
      // The form submission took care of saving the updated entity. Return the
      // updated view of the field.
      $entity = $form_state['entity'];
      $output = field_view_field($entity->entityType(), $entity, $field_name, $view_mode, $langcode);

      $response->addCommand(new FieldFormSavedCommand(drupal_render($output)));
    }
    else {
      $response->addCommand(new FieldFormCommand(drupal_render($form)));

      $errors = form_get_errors();
      if (count($errors)) {
        $response->addCommand(new FieldFormValidationErrorsCommand(theme('status_messages')));
      }
    }

    // When working with a hidden form, we don't want any CSS or JS to be loaded.
    if (isset($_POST['nocssjs']) && $_POST['nocssjs'] === 'true') {
      drupal_static_reset('drupal_add_css');
      drupal_static_reset('drupal_add_js');
    }

    return $response;
  }

  /**
   * Returns an Ajax response to render a text field without transformation filters.
   *
   * @param int $entity
   *   The entity of which a processed text field is being rerendered.
   * @param string $field_name
   *   The name of the (processed text) field that that is being rerendered
   * @param string $langcode
   *   The name of the language for which the processed text field is being
   *   rererendered.
   * @param string $view_mode
   *   The view mode the processed text field should be rerendered in.
   * @return \Drupal\Core\Ajax\AjaxResponse
   *   The Ajax response.
   */
  public function getEditableText(EntityInterface $entity, $field_name, $langcode, $view_mode) {
    $response = new AjaxResponse();

    $output = field_view_field($entity->entityType(), $entity, $field_name, $view_mode, $langcode);
    $langcode = $output['#language'];
    // Direct text editing is only supported for single-valued fields.
    $editable_text = check_markup($output['#items'][0]['value'], $output['#items'][0]['format'], $langcode, FALSE, array(FILTER_TYPE_TRANSFORM_REVERSIBLE, FILTER_TYPE_TRANSFORM_IRREVERSIBLE));
    $response->addCommand(new FieldRenderedWithoutTransformationFiltersCommand($editable_text));

    return $response;
  }

}
