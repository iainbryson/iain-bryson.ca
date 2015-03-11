
## First Steps

The first step is to figure out how to access Google Spreadsheets data containing the budget details from node.js.

[This][access-sheets-from-node] is a superb walkthrough of how to do this.

The only nit is that Google appears to have changed their urls, removing the query parameter "key".  It's easy to spot anyway.

This is what the article says:

<span class="code">https://docs.google.com/spreadsheet/ccc?key=&lt;bunch_of_chars&gt;&amp;usp=sharing</span>

This is what I used successfully:

<span class="code">https://docs.google.com/spreadsheets/d/<b>135pcmcYjkH&lt;more chars&gt;ci9wIU</b>/edit#gid=1162568921</span>


[access-sheets-from-node]: http://www.nczonline.net/blog/2014/03/04/accessing-google-spreadsheets-from-node-js/