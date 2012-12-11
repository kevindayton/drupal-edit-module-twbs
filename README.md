# Requirements

- Please also apply the included core patch "text.patch". Without it, you wont' be able to use direct editing, with or without WYSIWYG.
- Optionally, if you also want WYSIWYG editing, install the latest version of Aloha Editor for Drupal 8: http://drupal.org/project/aloha


# D8 port notes

* D8 has no Entity Access API yet, so I implemented a node-only stub.
* Node title/author/date are not yet proper Entity Properties, and thus they are not yet editable.


# Want to see it?

Go to a node page (e.g. node/1), at the top of the page you should see the "editbar", with a "View/Quick edit" toggle. Click that and now you should be able to see outlines around every field, if you click any of those, you should get an in-place form for that field.
