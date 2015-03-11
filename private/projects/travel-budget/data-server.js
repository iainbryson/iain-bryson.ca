var port = 8000;
var http = require("http");
var server = http.createServer();
server.on('request', request);

var budget_info = null;

function request(request, response) {
    var store = '';

    request.on('data', function(data) 
    {
    });
    request.on('end', function() 
    {  
        response.setHeader("Content-Type", "text/json");
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.end(JSON.stringify(budget_info))
    });
 }
 
 
 var Spreadsheet = require('edit-google-spreadsheet');

Spreadsheet.load({
    debug: true,
    spreadsheetId: '135pcmcYjkHgSFswlZLnf3CVagIKCiwtp1KWvbci9wIU',
    worksheetName: 'Expenses',//'oj85vyb',

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

        budget_info = { 'rows' : rows, 'info' : info };
        
        server.listen(port);
    });

});
 
 