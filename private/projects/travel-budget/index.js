var http_server = require('./http-server');

hostname = process.env.HOSTNAME || 'localhost',
port = parseInt(process.env.PORT, 10) || 4567,

console.log("Simple server showing %s listening at http://%s:%s", http_server.publicDir, hostname, port);
http_server.app.listen(port, hostname);

