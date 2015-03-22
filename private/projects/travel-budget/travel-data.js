exports.budget_info = null;

var Spreadsheet = require('edit-google-spreadsheet');

Spreadsheet.load({
    debug: true,
    spreadsheetId: '135pcmcYjkHgSFswlZLnf3CVagIKCiwtp1KWvbci9wIU',
//    worksheetName: 'Expenses',,
    worksheetId: 'oj85vyb',

    oauth : {
        email: '1040196767336-6c3it5mah1uvug6kr9tqqlh5e61qrljt@developer.gserviceaccount.com',
        keyFile: 'travel-budget-google-key.pem'
    }

}, function sheetReady(err, spreadsheet) {

    if (err) {
        throw err;
    }

    spreadsheet.receive(function(err, rows, info) {
        if (err) {
            throw err;
        }
        
        console.log("received spreadsheet.")

        exports.budget_info = { 'rows' : rows, 'info' : info };
    });

});
 
 