# D8 port notes

* D8 has no Entity Access API yet, so I implemented a node-only stub in includes/missing-api.inc.
* Node title/author/date are not yet proper Entity Properties, and thus they are not yet editable.
* The FAPE stuff from D7 still needs a lot of work. Saving is broken. Also lives in includes/missing-api.inc.


# Want to see it?

Go to a node page (e.g. node/1), at the top of the page you should see the "editbar", with a "View/Quick edit" toggle. Click that and now you should be able to see outlines around every field, if you click any of those, you should get an in-place form for that field.
