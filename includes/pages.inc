<?php
/**
 * @file
 * AJAX endpoint to retrieve & save subforms for fields and re-render fields.
 */

/**
 * Returns the metadata for a set of fields.
 *
 * Given a list of field edit IDs as POST parameters, run access checks on the
 * entity and field level to determine whether the current user may edit them.
 * Also retrieves other metadata.
 *
 * @return
 *   The JSON response.
 *
 * @see Drupal 8's Edit's EditController::metadata()
 */
function edit_metadata() {
  $fields = $_POST['fields'];
  $metadata = array();
  if (!isset($fields)) {
    return MENU_NOT_FOUND;
  }

  foreach ($fields as $field) {
    list($entity_type, $entity_id, $field_name, $langcode, $view_mode) = explode('/', $field);

    // Load the entity.
    if (!$entity_type || !entity_get_info($entity_type)) {
      return MENU_NOT_FOUND;
    }
    $entity = entity_load_single($entity_type, $entity_id);
    if (!$entity) {
      return MENU_NOT_FOUND;
    }
    list($id, $vid, $bundle) = entity_extract_ids($entity_type, $entity);

    // Validate the field name and language.
    if (!_edit_is_special_field($entity_type, $field_name)) {
      if (!$field_name || !($instance = field_info_instance($entity_type, $field_name, $bundle))) {
        return MENU_NOT_FOUND;
      }
    }
    if (!$langcode || (field_valid_language($langcode) !== $langcode)) {
      return MENU_NOT_FOUND;
    }

    $metadata[$field] = edit_metadata_generator($field);
  }

  drupal_json_output($metadata);
  drupal_exit();
}

function _edit_is_special_field($entity_type, $field_name) {
  return ($entity_type === 'node' && in_array($field_name, array('title', 'author', 'created')));
}

/**
 * Generates in-place editing metadata for an entity field.
 *
 * @param $field
 *   The edit ID of the field being edited.
 * @return array
 *   An array containing metadata with the following keys:
 *   - label: the user-visible label for the field.
 *   - access: whether the current user may edit the field or not.
 *   - editor: which editor should be used for the field.
 *   - aria: the ARIA label.
 *   - custom: (optional) any additional metadata that the editor provides.
 *
 * @see Drupal 8's Edit's MetadataGenerator::generate()
 */
function edit_metadata_generator($field) {
  list($entity_type, $entity_id, $field_name, $language, $view_mode) = explode('/', $field);

  $entity = entity_load_single($entity_type, $entity_id);
  list($id, $vid, $bundle) = entity_extract_ids($entity_type, $entity);

  // Early-return if user does not have access.
  $entity_access = entity_access('update', $entity_type, $entity);
  $field_access = (_edit_is_special_field($entity_type, $field_name)) ? TRUE : field_access('edit', $field_name, $entity_type, $entity);
  if (!$entity_access || !$field_access) {
    return array('access' => FALSE);
  }

  // Early-return if no editor is available.
  if (!_edit_is_special_field($entity_type, $field_name)) {
    $instance_info = field_info_instance($entity_type, $field_name, $bundle);
    $display = $instance_info['display']['default'];
    if (array_key_exists($view_mode, $instance_info['display'])) {
      $display = $instance_info['display'][$view_mode];
    }
    $formatter_type = field_info_formatter_types($display['type']);
    $items = field_get_items($entity_type, $entity, $field_name, $language);
    $editor_id = edit_select_editor($formatter_type, $instance_info, $items, $entity_type, $field_name);
  }
  // Node title/author/date are not fields, so we have to hard code their editor
  // mapping instead of selecting the editor dynamically.
  else {
    $editor_id = edit_select_editor(array(), array(), array(), $entity_type, $field_name);
  }
  if (!isset($editor_id)) {
    return array('access' => FALSE);
  }

  // Gather metadata, allow the editor to add additional metadata of its own.
  if (!_edit_is_special_field($entity_type, $field_name)) {
    $label = $instance_info['label'];
  }
  else {
    if ($field_name === 'title') {
      $label = t('Title');
    }
    else if ($field_name === 'author') {
      $label = t('Author');
    }
    else if ($field_name === 'created') {
      $label = t('Date');
    }
  }
  $metadata = array(
    'label' => $label,
    'access' => TRUE,
    'editor' => $editor_id,
    'aria' => t('Entity @type @id, field @field', array('@type' => $entity_type, '@id' => $id, '@field' => $label)),
  );
  if (!_edit_is_special_field($entity_type, $field_name)) {
    $editors = edit_editor_list();
    $editor = $editors[$editor_id];
    require_once($editor['file']);
    $get_metadata = $editor['metadata callback'];
    $custom_metadata = $get_metadata($instance_info, $items);
    if (count($custom_metadata)) {
      $metadata['custom'] = $custom_metadata;
    }
  }

  return $metadata;
}

/**
 * Returns the in-place editor to use for a given field instance.
 *
 * @param array $formatter_type
 *   The field's formatter type, as returned by field_info_formatter_types().
 * @param array $instance
 *   The field's instance info, as returned by field_info_instance().
 * @param array $items
 *   The field's item values.
 * @param string $entity_type
 *   The entity type. Only necessary for node title/author/date.
 * @param string $field_name
 *   The field's name. Only necessary for node title/author/date.
 *
 * @return string|NULL
 *   The editor to use, or NULL to not enable in-place editing.
 *
 * @see Drupal 8's Edit's EditorSelector::getEditor()
 */
function edit_select_editor(array $formatter_type, array $instance, array $items, $entity_type, $field_name) {
  // Node title/author/date are not fields, so we have to hard code their editor
  // mapping instead of selecting the editor dynamically.
  if (_edit_is_special_field($entity_type, $field_name)) {
    return ($field_name === 'title') ? 'direct' : 'form';
  }

  static $alternatives;

  // Build a static cache of the editors that have registered themselves as
  // alternatives to a certain editor.
  if (!isset($alternatives)) {
    $editors = edit_editor_list();
    foreach ($editors as $alternative_editor_id => $editor) {
      if (isset($editor['alternativeTo'])) {
        foreach ($editor['alternativeTo'] as $original_editor_id) {
          $alternatives[$original_editor_id][] = $alternative_editor_id;
        }
      }
    }
  }

  // Check if the formatter defines an appropriate in-place editor. For
  // example, text formatters displaying untrimmed text can choose to use the
  // 'direct' editor. If the formatter doesn't specify, fall back to the
  // 'form' editor, since that can work for any field. Formatter definitions
  // can use 'disabled' to explicitly opt out of in-place editing.
  $editor_id = isset($formatter_type['edit']['editor']) ? $formatter_type['edit']['editor'] : 'form';
  if ($editor_id === 'disabled') {
    return;
  }
  elseif ($editor_id === 'form') {
    return 'form';
  }

  // No early return, so create a list of all choices.
  $editor_choices = array($editor_id);
  if (isset($this->alternatives[$editor_id])) {
    $editor_choices = array_merge($editor_choices, $alternatives[$editor_id]);
  }

  // Make a choice.
  $editors = edit_editor_list();
  foreach ($editor_choices as $editor_id) {
    $editor = $editors[$editor_id];
    require_once($editor['file']);
    $is_compatible = $editor['compatibility check callback'];
    if ($is_compatible($instance, $items)) {
      return $editor_id;
    }
  }

  // We still don't have a choice, so fall back to the default 'form' editor.
  return 'form';
}

/**
 * Page callback: Provides editing of entity fields.
 */
function edit_field_edit($entity_type, $entity_id, $field_name, $langcode = NULL, $view_mode = NULL) {
  // Ensure the entity type is valid.
  if (empty($entity_type)) {
    return MENU_NOT_FOUND;
  }

  $entity_info = entity_get_info($entity_type);
  if (!$entity_info) {
    return MENU_NOT_FOUND;
  }

  $entities = entity_load($entity_type, array($entity_id));
  if (!$entities) {
    return MENU_NOT_FOUND;
  }

  $entity = reset($entities);
  if (!$entity) {
    return MENU_NOT_FOUND;
  }

  if (!isset($langcode) && isset($entity->language)) {
    $langcode = $entity->language;
  }

  // Ensure access to update this particular field is granted.
  if (!field_access('edit', $field_name, $entity_type, $entity)) {
    return MENU_ACCESS_DENIED;
  }

  list($id, $vid, $bundle) = entity_extract_ids($entity_type, $entity);
  $display = array();

  // This allows us to have limited support for non-field API fields. Currently,
  // we only have support for node:title, node:author and node:created.
  $subform_id = 'edit_field_edit_form';
  $subforms = array(
    'title' => 'editfape_field_edit_node_title_form',
    'author' => 'editfape_field_edit_node_author_form',
    'created' => 'editfape_field_edit_node_created_form',
  );
  if ($entity_type == 'node' && array_key_exists($field_name, $subforms)) {
    $field_instance = TRUE;
    $subform_id = $subforms[$field_name];
    if (!node_access('update', $entity)) {
      return MENU_ACCESS_DENIED;
    }
  }
  else {
    $field_instance = field_info_instance($entity_type, $field_name, $bundle);
    $display = $field_instance['display']['default'];
    if (array_key_exists($view_mode, $field_instance['display'])) {
      $display = $field_instance['display'][$view_mode];
    }
  }

  if (empty($field_instance)) {
    return MENU_NOT_FOUND;
  }

  $form_state = array(
    'entity_type' => $entity_type,
    'entity' => $entity,
    'field_name' => $field_name,
    'langcode' => $langcode,
    'view_mode' => $view_mode,
    'no_redirect' => TRUE,
    'field_instance' => $field_instance,
    'bundle' => $bundle,
    'subform_id' => $subform_id,
  );

  $form = drupal_build_form('edit_field_form', $form_state);

  $commands = array();

  if (!empty($form_state['executed'])) {
    // Reload the entity. This is necessary for some fields; otherwise we'd
    // render the field without the updated values.
    $entity = entity_load($entity_type, array($entity_id));
    $entity = reset($entity);

    // Pseudo-field: title.
    if ($entity_type == 'node' && $field_name == 'title') {
      $node_type = node_type_get_type($entity->type);
      $commands[] = array(
        'command' => 'editFieldFormSaved',
        'data' => edit_page_title_render($entity->title, $node_type->title_label, $id),
      );
    }
    // Pseudo-fields: name and date.
    elseif ($entity_type == 'node' && $field_name == 'author') {
      $commands[] = array(
        'command' => 'editFieldFormSaved',
        'data' => edit_node_wrap_name(theme('username', array('account' => $entity)), $id, $langcode, $view_mode),
      );
    }
    elseif ($entity_type == 'node' && $field_name == 'created') {
      $commands[] = array(
        'command' => 'editFieldFormSaved',
        'data' => edit_node_wrap_date(format_date($entity->created), $id, $langcode, $view_mode),
      );
    }
    // All other fields.
    else {
      $field = field_view_field($entity_type, $entity, $field_name, $view_mode, $langcode);
      $commands[] = array(
        'command' => 'editFieldFormSaved',
        'data' => drupal_render($field),
      );
    }
  }
  else {
    $commands[] = array(
      'command' => 'editFieldForm',
      'data' => drupal_render($form),
    );

    $errors = form_get_errors();
    if (count($errors)) {
      $commands[] = array(
        'command' => 'editFieldFormValidationErrors',
        'data' => theme('status_messages'),
      );
    }
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
 */
function edit_text_field_render_without_transformation_filters($entity_type, $entity_id, $field_name, $langcode = NULL, $view_mode = NULL) {
  // Ensure the entity type is valid.
  if (empty($entity_type)) {
    return MENU_NOT_FOUND;
  }

  $entity_info = entity_get_info($entity_type);
  if (!$entity_info) {
    return MENU_NOT_FOUND;
  }

  $entities = entity_load($entity_type, array($entity_id));
  if (!$entities) {
    return MENU_NOT_FOUND;
  }

  $entity = reset($entities);
  if (!$entity) {
    return MENU_NOT_FOUND;
  }

  if (!isset($langcode) && isset($entity->language)) {
    $langcode = $entity->language;
  }

  // Ensure access to update this particular field is granted.
  if (!field_access('edit', $field_name, $entity_type, $entity)) {
    return MENU_ACCESS_DENIED;
  }

  list($id, $vid, $bundle) = entity_extract_ids($entity_type, $entity);

  $field_instance = field_info_instance($entity_type, $field_name, $bundle);
  if (empty($field_instance)) {
    return MENU_NOT_FOUND;
  }

  $commands = array();

  // Render the field in our custom display mode; retrieve the re-rendered
  // markup, this is what we're after.
  $field_output = field_view_field($entity_type, $entity, $field_name, 'edit-render-without-transformation-filters', $langcode);
  // TODO: support multiple value text fields. Change the code below and the JS.
  $output = $field_output[0]['#markup'];

  $commands[] = array(
    'command' => 'editFieldRenderedWithoutTransformationFilters',
    'id' => "$entity_type/$id/$field_name/$langcode/$view_mode",
    'data' => $output,
  );

  return array('#type' => 'ajax', '#commands' => $commands);
}

function edit_field_form($form, &$form_state) {
  $form['#parents'] = array();

  form_load_include($form_state, 'inc', 'edit', 'includes/fape');

  if ($form_state['subform_id']) {
    $form_state['subform_id']($form, $form_state);
  }

  // Add a submit button. Give it a class for easy JavaScript targeting.
  $form['actions'] = array('#type' => 'actions');
  $form['actions']['submit'] = array(
    '#type' => 'submit',
    '#value' => t('Save'),
    '#attributes' => array('class' => array('edit-form-submit')),
  );

  // Simplify it for optimal in-place use.
  edit_field_form_simplify($form, $form_state);
  return $form;
}


function edit_field_form_simplify(&$form, &$form_state) {
  $field_name = $form_state['field_name'];
  $langcode = $form_state['langcode'];

  $widget_element =& $form[$field_name][$langcode];

  // Hide the field label from displaying within the form, because JavaScript
  // displays the equivalent label that was provided within an HTML data
  // attribute of the field's display element outside of the form. Do this for
  // widgets without child elements (like Option widgets) as well as for ones
  // with per-delta elements. Skip single checkboxes, because their title is
  // key to their UI. Also skip widgets with multiple subelements, because in
  // that case, per-element labeling is informative.
  $num_children = count(element_children($widget_element));
  if ($num_children == 0 && $widget_element['#type'] != 'checkbox') {
    $widget_element['#title_display'] = 'invisible';
  }
  if ($num_children == 1 && isset($widget_element[0]['value'])) {
    // @todo While most widgets name their primary element 'value', not all
    //   do, so generalize this.
    $widget_element[0]['value']['#title_display'] = 'invisible';
  }

  // Adjust textarea elements to fit their content.
  if (isset($widget_element[0]['value']['#type']) && $widget_element[0]['value']['#type'] == 'textarea') {
    $lines = count(explode("\n", $widget_element[0]['value']['#default_value']));
    $widget_element[0]['value']['#rows'] = $lines + 1;
  }
}
