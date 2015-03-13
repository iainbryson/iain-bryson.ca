var express = require("express"),
    travel_data = require("./travel-data.js"),
    app = express(),
    bodyParser = require('body-parser'),
    errorHandler = require('errorhandler'),
    methodOverride = require('method-override');
    
exports.publicDir = process.argv[2] || __dirname + '/public';

app.get("/", function (req, res) {
  res.redirect("/index.html");
});

app.get("/data", function (req, res) {
    var store = '';

    res.setHeader("Content-Type", "text/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.end(JSON.stringify(budget_info))
});

app.use(methodOverride());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static(exports.publicDir));
app.use(errorHandler({
  dumpExceptions: true,
  showStack: true
}));

exports.app = app;
