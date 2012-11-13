## About

This is an example of using [formidable](https://github.com/felixge/node-formidable), [knox](https://github.com/LearnBoost/knox) and [socket.io](http://socket.io) to create a file uploader with the following features:

* Pipes incoming data directly to s3 without saving it to the file system.
* Reports accurate real time progress to the browser, allowing for a progress bar everywhere including IE6.

## Install

    $ cd /path/to/repo
    $ npm install
    $ mkdir conf

Create a ``conf/default.yaml`` and make it look like this:

	s3:
	    key: <key>
	    secret: <secret>
	    bucket: <bucket>
	    endpoint: <endpoint>

Then run ``node app`` and navigate to ``localhost:8080``.

## Notes

In IE<10, the file has to be saved to the file system temporarily before it is uploaded. This is because we can't know the Content-Length of the uploaded file until we have seen the entire request. As a result the progress bar won't account for the time taken for the server to upload to s3.

The asynchronous upload uses an iframe in preference to the File API. Assuming you're reporting progress by other means (as we are here), there's no reason I can discern to have another code path for the more modern browsers.