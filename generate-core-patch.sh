#!/bin/bash

# Arg 1 ($1) should be the path to the Drupal 8 git repo.
# Arg 2 ($2) should be the comment number.
#
# Must be called from the edit-8.x-1.x module's git repo.
#
# Sample usage:
#   $ pwd
#   ~/Work/edit
#   $ sh corepatch.sh ~/Work/edit 3

DRUPAL_DIR=$1
EDIT_DIR=`pwd`
FILENAME=in_place_editing_for_fields
COMMENTNR=$2

mkdir $DRUPAL_DIR/core/modules/edit

# Generate the patch for the Edit module.
cp -R edit.info edit.module edit.*.inc css images includes js lib $DRUPAL_DIR/core/modules/edit/
rm -rf $DRUPAL_DIR/core/modules/edit/js/build
cp text.patch $DRUPAL_DIR/
cp vie-and-create.patch $DRUPAL_DIR/
cd $DRUPAL_DIR
git apply text.patch
rm text.patch
git apply vie-and-create.patch
rm vie-and-create.patch
git add core/modules/edit
git add core/modules/field/modules/text/lib/Drupal/text/Plugin/field/formatter
git add core/modules/system
git add core/misc/create
git add core/misc/vie
git diff --staged --binary --patch-with-stat > $EDIT_DIR/$FILENAME-$COMMENTNR.patch
git commit -m "edit module"
cd $EDIT_DIR

# Generate the patch for the Aloha Editor integration for Edit.
cp -R edit_aloha $DRUPAL_DIR/core/modules/edit_aloha/
cd $DRUPAL_DIR
git add core/modules/edit_aloha
git diff --staged --binary --patch-with-stat > $EDIT_DIR/$FILENAME-aloha-integration-$COMMENTNR-do-not-test.patch
git ci -m "Aloha Editor integration for Edit"
cd $EDIT_DIR

# Undo these last two commits.
cd $DRUPAL_DIR
git reset --hard HEAD^^
rm -rf $DRUPAL_DIR/core/modules/edit
rm -rf $DRUPAL_DIR/core/modules/edit_aloha
cd $EDIT_DIR
