<?php
/**
 * @file
 * AJAX endpoint to retrieve & save subforms for fields and re-render fields.
 */

use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Page callback: Provides editing of entity fields.
 *
 * @param string $entity_type
 *   The entity type of the entity that is being edited.
 * @param int $entity_id
 *   The entity ID of the entity that is being edited.
 * @param string $field_name
 *   The name of the field that is being edited.
 * @param string|NULL $langcode
 *   The name of the language for which the field is being edited.
 * @return array
 *   A render array.
 */
function edit_field_edit($entity_type, $entity_id, $field_name, $langcode = NULL) {
  // Ensure the entity type is valid.
  if (empty($entity_type)) {
    throw new NotFoundHttpException();
  }

  $entity_info = entity_get_info($entity_type);
  if (!$entity_info) {
    throw new NotFoundHttpException();
  }

  $entities = entity_load_multiple($entity_type, array($entity_id));
  if (!$entities) {
    throw new NotFoundHttpException();
  }

  $entity = reset($entities);
  if (!$entity) {
    throw new NotFoundHttpException();
  }

  $langcode = $entity->langcode;

  // Ensure access to update this particular entity is granted.
  if ($entity_type != 'node') {
    // @todo: we don't have entity_access() in Drupal 8 yet, so we can only
    // support nodes right now.
    throw new AccessDeniedHttpException();
  }
  else {
    if (!node_access('update', $entity)) {
      throw new AccessDeniedHttpException();
    }
  }

  // Ensure access to update this particular field is granted.
  if (!field_access('edit', $field_name, $entity_type, $entity)) {
    throw new AccessDeniedHttpException();
  }

  $field_instance = field_info_instance($entity_type, $field_name, $entity->bundle());
  if (empty($field_instance)) {
    throw new NotFoundHttpException();
  }

  $form_state = array(
    'entity_type' => $entity_type,
    'entity' => $entity,
    'field_name' => $field_name,
    'langcode' => $langcode,
    'no_redirect' => TRUE,
    'field_instance' => $field_instance,
    'bundle' => $entity->bundle(),
    'subform_id' => 'edit_field_edit_field_form',
    // We use this in our hook_form_alter() implementation so that we don't
    // alter FAPE's forms when it's used by FAPE itself.
    'editability' => TRUE,
  );

  $commands = array();
  $form = drupal_build_form('edit_field_edit_form', $form_state);

  if (!empty($form_state['executed'])) {
    // @todo: returns SAVED_UPDATED, yet does not seem to have updated the
    // entity; possibly the POST values are being lost?
    $form_state['entity']->save();

    $commands[] = array(
      'command' => 'edit_field_form_saved',
      'id'      => "$entity_type:$entity_id:$field_name",
      'data'    => drupal_render(field_view_field($entity_type, $entity, $field_name)),
    );
  }
  else {
    $commands[] = array(
      'command' => 'edit_field_form',
      'id'      => "$entity_type:$entity_id:$field_name",
      'data'    => drupal_render($form),
    );
  }

  // When working with a hidden form, we don't want any CSS or JS to be loaded.
  if (isset($_POST['nocssjs']) && $_POST['nocssjs'] === 'true') {
    drupal_static_reset('drupal_add_css');
    drupal_static_reset('drupal_add_js');
  }

  return array('#type' => 'ajax', '#commands' => $commands);
}

/**
 * Page callback: render a processed text field without transformation filters.
 *
 * @param string $entity_type
 *   The entity type of the entity of which a processed text field is being
 *   rerendered.
 * @param int $entity_id
 *   The entity ID of the entity of which a processed text field is being
 *   rerendered.
 * @param string $field_name
 *   The name of the (processed text) field that that is being rerendered
 * @param string|NULL $langcode
 *   The name of the language for which the processed text field is being
 *   rererendered.
 * @return array
 *   A render array.
 */
function edit_text_field_render_without_transformation_filters($entity_type, $entity_id, $field_name, $langcode = NULL) {
  // Ensure the entity type is valid.
  if (empty($entity_type)) {
    throw new NotFoundHttpException();
  }

  $entity_info = entity_get_info($entity_type);
  if (!$entity_info) {
    throw new NotFoundHttpException();
  }

  $entities = entity_load_multiple($entity_type, array($entity_id));
  if (!$entities) {
    throw new NotFoundHttpException();
  }

  $entity = reset($entities);
  if (!$entity) {
    throw new NotFoundHttpException();
  }

  $langcode = $entity->langcode;

  // Ensure access to update this particular entity is granted.
  if ($entity_type != 'node') {
    // @todo: we don't have entity_access() in Drupal 8 yet, so we can only
    // support nodes right now.
    throw new AccessDeniedHttpException();
  }
  else {
    if (!node_access('update', $entity)) {
      throw new AccessDeniedHttpException();
    }
  }

  // Ensure access to update this particular field is granted.
  if (!field_access('edit', $field_name, $entity_type, $entity)) {
    throw new AccessDeniedHttpException();
  }

  $field_instance = field_info_instance($entity_type, $field_name, $entity->bundle());
  if (empty($field_instance)) {
    throw new NotFoundHttpException();
  }

  $commands = array();

  // Render the field in our custom display mode; retrieve the re-rendered
  // markup, this is what we're after.
  $field_output = field_view_field($entity_type, $entity, $field_name, 'edit-render-without-transformation-filters');
  // TODO: support multiple value text fields. Change the code below and the JS.
  $output = $field_output[0]['#markup'];

  $commands[] = array(
    'command' => 'edit_field_rendered_without_transformation_filters',
    'id'      => "$entity_type:$entity_id:$field_name",
    'data'    => $output,
  );

  return array('#type' => 'ajax', '#commands' => $commands);
}
