# Elasticsearch Reindex

Zero-Downtime, Opinionated tool for reindexing elasticsearch indices super easy
and fast.

### Installation

```
npm install -g es-reindex
```

To setup a tiny elasticsearch cluster on your local machine for test purposes,
this is the recommended way of doing it.

```
docker pull elasticsearch
docker run -d -p 9200:9200 -p 9300:9300 elasticsearch
[Open localhost:9200 to see the running elasticsearch cluster]
```

### Usage

#### Creating a new Index

To allow zero-downtime reindexing, we have to get the setup right for the
indices. We create one main alias and indices with an ever increasing number.
Example:  

For setting up a `products` index we create  

1. an index called `products_[current_timestamp]` eg. `products_170`  
*You can use `es-reindex-create-index --index=products --addtimestamp=true --body=path/to/json.json` to create such an index*  

2. an alias for `products_170` called `products`  
*You can use `es-reindex-add-to-alias --alias=products --index=products_170 --action=add` to add an index to an alias and receiving the timestamp*  

Now we can talk to the index via `products`.

#### Creating a Index Mutation

Sometime later we want to make changes to the index, which requires reindexing. The
procedure is as follows:  

1. Create an index with the mutation called `products_[current_timestamp]` eg. `products_180`  
*You can use `es-reindex-create-index --index=products --addtimestamp=true --body=path/to/json.json` to create
such a new index*  

2. Add `products_180` to the `products` alias and log the timestamp (!important)  
*You can use `es-reindex-add-to-alias --alias=products --index=products_180 --action=add` to add an
index to an alias and receiving the timestamp*  

3. Now run the reindexing from `products_170` to `products_180` from the
earliest document in `products_170` to the timestamp `products_180` got added to
the alias. (Use scan-and-scroll with bulk inserts for `_source` and parallelize
the shit out of it. Use this tool for it.)  

4. Now remove the old index `products_170` from the alias `products` and your
are done reindexing  
*You can use `es-reindex-add-to-alias --alias=products --index=products_170 --action=remove` to remove an
index from an alias*  


### Quick start

Simply run the following command to reindex your data:
```
$ es-reindex -f http://192.168.1.100:9200/old_index/old_type -t http://10.0.0.1:9200/new_index/new_type
```

You can omit {new_index} and {new_type} if new index name and type name same as the old
```
$ es-reindex -f http://192.168.1.100:9200/old_index/old_type -t http://10.0.0.1:9200
```

Advanced feature
----------------

### Customer indexer
Some times, you may want to reindex the data by your custom indexer script(eg. reindex the data to multiple index based on the date field). The custom indexer feature can help you out on this situation.

To use this feature, create your own indexer.js
```js
var moment = require('moment');

module.exports = {
  index: function(item, options) {
    return [
      {index:{_index: 'tweets_' + moment(item._source.date).format('YYYYMM'), _type:options.type || item._type, _id: item._id}},
      item._source
    ];
  }
};
```

Simply pass this script's path, it will work.
```
$ es-reindex -f http://192.168.1.100:9200/old_index/old_type -t http://10.0.0.1:9200/ indexer.js
```
### Custom query

Add custom query in indexer.js
```js
var moment = require('moment');

module.exports = {
  query:{
    query:{
      term:{
        user: 'Garbin'
      }
    }
  },
  index: function(item, options) {
    return [
      {index:{_index: 'tweets_' + moment(item._source.date).format('YYYYMM'), _type:options.type || item._type, _id: item._id}},
      item._source
    ];
  }
};
```

Then
```
$ es-reindex -f http://192.168.1.100:9200/old_index/old_type -t http://10.0.0.1:9200/ indexer.js
```

Only the user Garbin's data will be indexed

### Index parallelly

Will take a very very long time to reindex a very big index, you may want to make it small, and reindex it parallelly. Now you can do this with the "Shard" feature.

```js
var moment = require('moment');

module.exports = {
  sharded:{
    field: "created_at",
    start: "2014-01-01",
    end:   "2014-12-31",
    interval: 'month' // day, week, or a number of day, such as 7 for 7 days.
  },
  index: function(item, options) {
    return [
      {index:{_index: 'tweets_' + moment(item._source.date).format('YYYYMM'), _type:options.type || item._type, _id: item._id}},
      item._source
    ];
  }
};
```

The sharded config will make the big index into 12 shards based on created_at field and reindex it parallelly.

Then
```
$ es-reindex -f http://192.168.1.100:9200/old_index/old_type -t http://10.0.0.1:9200/ indexer.js
```

### Index with promises

Added support for promises so that you can request data from other parts of the database

```js
module.exports = {
  index: function (item, opts, client) {
    var indexData = {
          index: {
            _index: opts.index,
            _type: item._type,
            _id: item._id
          }
        };
    
    // With the client we can access other parts of our database
    return client.mget({
      index: 'media',
      type: 'movies',
      body: {
        ids: item._source.favoriteMovieIDs
      }
    }).then(function (response) {
      item._source.faveMovies = response.docs.map(function (movie) {
        return {
          name: movie._source.name,
          id: movie._source.id
        };      
      });
      
      return [indexData, item._source];
    });
  }
}
```

Then
```
$ es-reindex -f http://192.168.1.100:9200/old_index/old_type -t http://10.0.0.1:9200/ -m true indexer.js
```

You will see the reindex progress for every shard clearly

Have fun!

### Thanks

Thanks to [Elasticsearch Reindex](https://github.com/garbin/elasticsearch-reindex)
for providing the base.

### License

elasticsearch-reindex is licensed under the [MIT License](http://opensource.org/licenses/MIT).
