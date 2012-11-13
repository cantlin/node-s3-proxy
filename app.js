var http       = require('http')
 ,  fs         = require('fs')
 ,  url        = require('url')
 ,  express    = require('express')
 ,  formidable = require('formidable')
 ,  knox       = require('knox')
 ,  io         = require('socket.io')
 ,  conf       = require('config')
    mime       = require('mime');

var app = express()
 ,  s3  = knox.createClient(conf.s3);

var server = http.createServer(app).listen(8080)
 ,  io     = io.listen(server);

var sockets = {}
 ,  counter = 0;

io.sockets.on('connection', function (socket) {
    socket.on('upload:register', function (data) {
        var id = (counter = counter + 1);

        socket.emit('upload:registered', { id: id });
        sockets[id] = socket;
    });
});

app.get('/', function(req, res) {
    res.end(fs.readFileSync('form.html'));
});

app.post('/upload', function(req, res) {
    var form = new formidable.IncomingForm()
     ,  qs   = url.parse(req.url, true).query;

    var filename = 'test/' + qs['upload_filename'],
        id       = qs['upload_id'],
        socket   = sockets[id];

    var handleProgress = function(progress) {
        socket.emit('upload:progress', progress);
    };

    var handleResponse = function(err, response) {
        if(err) {
            socket.emit('upload:error', err);
            delete sockets[id];
            return res.end();
        }

        if(response.statusCode === 200) {
            socket.emit('upload:complete', {
                id: id,
                filename: filename,
                url: (conf.s3.endpoint || conf.s3.bucket + '.s3.amazonaws.com') + '/' + filename
            });
        } else {
            socket.emit('upload:failed', { id: id });
            res.statusCode = response.statusCode;
        }

        delete sockets[id];
        return res.end();
    };

    var headers = { 'Content-Type': mime.lookup(filename) }

    if(qs['content_length']) {
        headers['Content-Length'] = qs['content_length'];

        form.onPart = function(part) {
            /*
             * Implement pause() and resume() on the read stream.
             * http://stackoverflow.com/questions/13311233
             */
            part.pause  = function() { form.pause(); }
            part.resume = function() { form.resume(); }

            var put = s3.putStream(part, filename, headers, handleResponse);
            put.on('progress', handleProgress);
        };
    } else {
        form.on('file', function(field, file) {
            headers['Content-Length'] = file.size;

            var put = s3.putStream(fs.createReadStream(file.path), filename, headers, function(err, response) {
                handleResponse(err, response);
                fs.unlink(file.path);
            });
            put.on('progress', handleProgress);
        });
    }

    form.parse(req);
});