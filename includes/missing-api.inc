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

/**
 * @} End of "ingroup Missing in Entity API.".
 */
