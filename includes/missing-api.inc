<?php

/**
 * @ingroup Missing in Entity API.
 * @{
 */

// @todo Entity Access API: http://drupal.org/node/1696660#comment-6618944
function edit_entity_access($op, $entity_type, $entity = NULL, $account = NULL) {
  if ($entity_type == 'node') {
    return node_access($op, $entity, $account);
  }

  // Currently, only editing of nodes is supported. See the above issue.
  return FALSE;
}

// @todo Entity API check to see whether a specific entity supports revisions.
// Proudly found elsewhere: FAPE module's _fape_entity_allows_revisions().
function edit_entity_allows_revisions($entity_type, $bundle, $entity) {
  $retval = array(FALSE, FALSE);

  switch ($entity_type) {
    case 'node':
      $node_options = variable_get('node_options_' . $bundle, array('status', 'promote'));
      $retval[0] = in_array('revision', $node_options);
      $retval[1] = user_access('administer nodes');
      break;

    default:
      $entity_info = entity_get_info($entity_type);
      $retval[0] = !empty($entity_info['revision table']);
      break;
  }

  $entity->revision = $retval[0];
  $entity->log = '';
  return $retval;
}

/**
 * @} End of "ingroup Missing in Entity API.".
 */
