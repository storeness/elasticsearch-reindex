#!/usr/bin/env node

var cli           = require('commander'),
    fs            = require('fs'),
    elasticsearch = require('elasticsearch');

cli
.version('1.1.10')
.option('-h, --host [value]', 'ES host, default: localhost:9200', 'localhost:9200')
.option('-i, --index [value]', 'index, eg. new_index')
.option('-a, --addtimestamp [value]', 'if a timestamp should get added to the index', false)
.option('-b, --body [value]', 'body should specify a file')
.option('-o, --request_timeout [value]', 'default 60000', 60000)
.option('-v, --api_ver [value]', 'default 1.5', '1.5')
.option('-z, --compress [value]', 'if set, requests compression of data in transit', false)
.parse(process.argv);

var es = new elasticsearch.Client({
  host: cli.host,
  requestTimeout: cli.request_timeout,
  apiVersion: cli.api_ver,
  suggestCompression: cli.compress });

body = {};
if (cli.body) {
  body = fs.readFileSync(cli.body, 'utf8');
}

if (cli.addtimestamp) {
  index = cli.index + '_' + Math.round(Date.now() / 1000);
} else {
  index = cli.index;
}

es.indices.create({index: index, body:body}).then(
  function (response) { console.log('SUCCESS', response); },
  function (error) { console.log('ERROR', error); }
)
