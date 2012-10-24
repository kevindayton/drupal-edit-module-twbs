<?php

/**
 * @file
 * Form callbacks for the Edit module.
 */

/**
 * Field editing form. (For editing a field instance.)
 *
 * Proudly found elsewhere: FAPE module's fape_field_edit_form() and friends.
 */
function edit_field_form($form, &$form_state) {
  $entity = $form_state['entity'];
  $langcode = $form_state['langcode'];

  // Attach the actual field form.
  $options = array('field_name' =>  $form_state['field_name']);
  _edit_field_attach_form($entity->entityType(), $entity, $form, $form_state, $langcode, $options);

  $form['#validate'][] = 'edit_field_form_validate';
  // @todo Doesn't seem necessary anymore, see edit_field_form_validate().
  // $form['#submit'][] = '';

  // Add revisions form items if necessary.
  // @todo We may be able to get rid of this when http://drupal.org/node/1678002 is solved.
  list($use_revisions, $control_revisions) = edit_entity_allows_revisions($entity->entityType(), $entity->bundle(), $entity);
  if ($use_revisions) {
    $form_state['use revisions'] = TRUE;
    $form['revision_information'] = array(
      '#weight' => 11,
    );

    $form['revision_information']['revision'] = array(
      '#type' => 'checkbox',
      '#title' => t('Create new revision'),
      '#default_value' => $entity->revision,
      '#id' => 'edit-revision',
      '#access' => $control_revisions,
    );

    if ($control_revisions || $entity->revision) {
      $form['revision_information']['log'] = array(
        '#type' => 'textarea',
        '#title' => t('Log message'),
        '#description' => t('Provide an explanation of the changes you are making. This will help other authors understand your motivations.'),
        '#default_value' => $entity->log,
      );

      if ($control_revisions) {
        $form['revision_information']['log']['#dependency'] = array('edit-revision' => array(1));
      }
    }
    $form['#submit'][] = 'edit_field_form_revision_submit';
  }

  $form['actions'] = array('#type' => 'actions');
  $form['actions']['submit'] = array(
    '#type' => 'submit',
    '#value' => t('Save'),
  );

  // Simplify the form.
  _simplify_edit_field_edit_form($form);

  return $form;
}

/**
 * Helper function to simplify the field edit form for in-place editing.
 */
function _simplify_edit_field_edit_form(&$form) {
  $elements = element_children($form);

  // Required internal form properties.
  $internal_elements = array('actions', 'form_build_id', 'form_token', 'form_id');

  // Calculate the remaining form elements.
  $remaining_elements = array_diff($elements, $internal_elements);

  // Only simplify the form if there is a single element remaining.
  if (count($remaining_elements) === 1) {
    $element = $remaining_elements[0];

    if ($form[$element]['#type'] == 'container') {
      $language = $form[$element]['#language'];
      $children = element_children($form[$element][$language]);

      // Certain fields require different processing depending on the form
      // structure.
      if (count($children) == 0) {
        // Checkbox elements don't have a title.
        if ($form[$element][$language]['#type'] != 'checkbox') {
          $form[$element][$language]['#title_display'] = 'invisible';
        }
      }
      elseif (count($children) == 1) {
        $form[$element][$language][0]['value']['#title_display'] = 'invisible';

        // UX improvement: make the number of rows of textarea form elements
        // fit the content. (i.e. no wads of whitespace)
        if (isset($form[$element][$language][0]['value']['#type'])
            && $form[$element][$language][0]['value']['#type'] == 'textarea')
        {
          $lines = count(explode("\n", $form[$element][$language][0]['value']['#default_value']));
          $form[$element][$language][0]['value']['#rows'] = $lines + 1;
        }
      }
    }

    // Handle pseudo-fields that are language-independent, such as title,
    // author, and creation date.
    elseif (empty($form[$element]['#language'])) {
      $form[$element]['#title_display'] = 'invisible';
    }
  }

  // Make it easy for the JavaScript to identify the submit button.
  $form['actions']['submit']['#attributes'] = array('class' => array('edit-form-submit'));
}

/**
 * Validate field editing form.
 */
function edit_field_form_validate($form, &$form_state) {
  $entity = $form_state['entity'];
  $options = array('field_name' =>  $form_state['field_name']);

  // 'submit' in D8 is for "building the entity object", not for actual
  // submission. It appears though that if there were no validation errors, it
  // is submitted automatically.
  _edit_field_attach_submit($entity->entityType(), $entity, $form, $form_state, $options);

  // Validation.
  _edit_field_attach_form_validate($entity->entityType(), $entity, $form, $form_state, $options);
}

/**
 * Submit callback that handles entity revisioning.
 */
function edit_field_form_revision_submit($form, &$form_state) {
  $entity = $form_state['entity'];
  if (!empty($form_state['use revisions'])) {
    $entity->revision = $form_state['values']['revision'];
    $entity->log = $form_state['values']['log'];
  }
}
