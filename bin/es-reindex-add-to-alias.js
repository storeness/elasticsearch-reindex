#!/usr/bin/env node

var cli           = require('commander'),
    elasticsearch = require('elasticsearch');

cli
.version('1.1.10')
.option('-h, --host [value]', 'ES host, default: localhost:9200', 'localhost:9200')
.option('-i, --index [value]', 'index, eg. new_index')
.option('-a, --alias [value]', 'alias, eg. products')
.option('-c, --action [value]', 'action, eg. add', 'add')
.option('-o, --request_timeout [value]', 'default 60000', 60000)
.option('-v, --api_ver [value]', 'default 1.5', '1.5')
.option('-z, --compress [value]', 'if set, requests compression of data in transit', false)
.parse(process.argv);

var es = new elasticsearch.Client({
  host: cli.host,
  requestTimeout: cli.request_timeout,
  apiVersion: cli.api_ver,
  suggestCompression: cli.compress });

es.indices.existsAlias({index: cli.alias}).then(function (response) {
  if (response) {
    es.indices.updateAliases({
      body: {
        actions: [
          { cli.action: { "index": cli.index, "alias": cli.alias } }
        ]
      }
    }).then(function (response) {
      console.log('Timestamp (Millis)', Date.now());
      console.log('Timestamp (Seconds)', Math.round(Date.now()/1000));
    });
  } else {
    console.error('Alias \'' + cli.alias + '\' does not exist. Create it.');
  }
})
