sparql-client
=============

[![Build Status](https://travis-ci.org/eddieantonio/node-sparql-client.svg?branch=v0.4.0)](https://travis-ci.org/eddieantonio/node-sparql-client)

A SPARQL 1.1 client for Node.js with ECMAScript 2015 (ECMAScript 6,
Harmony) features.

```javascript
const {SparqlClient, SPARQL} = require('sparql-client');
const client =
  new SparqlClient('http://dbpedia.org/sparql')
    .register({
      db: 'http://dbpedia.org/resource/',
      dbpedia: 'http://dbpedia.org/property/'
    });

function fetchCityLeader(cityName) {
  return client
    .query(SPARQL`
           SELECT ?leaderName
           WHERE {
             ${{db: cityName}} dbpedia:leaderName ?leaderName
           }`)
    .execute()
    // Get the item we want.
    .then(response => Promise.resolve(response.results.bindings[0].leaderName.value));
}

fetchCityLeader('Vienna')
  .then(leader => console.log(`${leader} is a leader of Vienna`));
```

Use
===

## Using `SPARQL` [Tagged Template][TT] and [Promises][] (ECMAScript 2015/ES 6)

You may use the `SPARQL` template tag to interpolate variables into the
query. All values are automatically converted into their SPARQL literal
form, and any unsafe strings are escaped.

> June 2015: This works in [iojs](https://iojs.org/) right now!

```javascript
const SparqlClient = require('sparql-client');
const SPARQL = SparqlClient.SPARQL;
const endpoint = 'http://dbpedia.org/sparql';

const city = 'Vienna';

// Get the leaderName(s) of the given city
const query =
  SPARQL`PREFIX db: <http://dbpedia.org/resource/>
         PREFIX dbpedia: <http://dbpedia.org/property/>
         SELECT ?leaderName
         FROM <http://dbpedia.org>
         WHERE {
           ${{db: city}} dbpedia:leaderName ?leaderName
         }
         LIMIT 10`;

const client = new SparqlClient(endpoint)
  .register({db: 'http://dbpedia.org/resource/'})
  .register({dbpedia: 'http://dbpedia.org/property/'});

client.query(query)
  .execute()
  .then(function (results) {
    console.dir(results, {depth: null});
  })
  .catch(function (error) {
    // Oh noes! 🙀
  });
```

Results in:

```javascript
{ head: { link: [], vars: [ 'leaderName' ] },
  results:
   { distinct: false,
     ordered: true,
     bindings:
      [ { leaderName:
           { type: 'literal',
             'xml:lang': 'en',
             value: 'Maria Vassilakou ,' } },
        { leaderName: { type: 'literal', 'xml:lang': 'en', value: 'Michael Häupl' } },
        { leaderName: { type: 'literal', 'xml:lang': 'en', value: 'Renate Brauner ;' } } ] } }
```

[TT]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/template_strings#Tagged_template_strings
[Promises]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise

## Using "Traditional" Node Callbacks

You are not forced to use promises; traditional `(err, results)`
callbacks work too:

```javascript
// Get the leaderName(s) of the 10 cities
var query = "SELECT * FROM <http://dbpedia.org> WHERE { " +
  "?city <http://dbpedia.org/property/leaderName> ?leaderName " +
  "} LIMIT 10";
var client = new SparqlClient( 'http://dbpedia.org/sparql')
  .register({db: 'http://dbpedia.org/resource/'});

client.query(query)
  .bind('city', {db: 'Vienna'})
  .execute(function(error, results) {
    console.dir(arguments, {depth: null});
});
```

## Registering URI Prefixes

### Registering common prefixes

Often, SPARQL queries have many prefixes to register.

Common prefixes include:

Prefix | URI
=======|====
`rdf`  | <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
`rdfs` | <http://www.w3.org/2000/01/rdf-schema#>
`xsd`  | <http://www.w3.org/2001/XMLSchema#>
`fn`   | <http://www.w3.org/2005/xpath-functions#>
`sfn`  | <http://www.w3.org/ns/sparql#>


You may register any of the above by passing them to
`#registerCommon()`. This may be done per-query:

```javascript
new SparqlClient(endpoint)
  .query(`SELECT ...`)
  .registerCommon('xsd', 'sfn')
  // Will have PREFIX xsd and sfn to this query only.
  .execute();
```

Or on the client, affecting every subsequent query:

```javascript
client
  .registerCommon('rdfs', 'xsd');
// Will add prefix rdfs and xsd.
client.query('...').execute();
```

### Registering custom prefixes

Using `#register()` on either the client or the query, you can register
any arbitrary prefix:

```javascript
var client = new SparqlClient(endpoint)
  // Can register one at a time:
  .register('ns', 'http://example.org/ns#')
  // Can register in bulk, as an object:
  .register({
      db: 'http://dbpedia.org/resource/',
      dbpedia: 'http://dbpedia.org/property/'
  })
  // Can register a BASE (empty prefix):
  .register('http://example.org/books/');
```

## Formatting

We may want to execute the following query (to retrieve all books and
their genres).

```sparql
PREFIX dbpedia-owl: <http://dbpedia.org/owl/>
SELECT ?book ?genre WHERE {
    ?book dbpedia-owl:literaryGenre ?genre
}
```
The *default* formatting (when no options are provided) results, for the bindings (limited to two results in our example), in

```javascript
[
  {
    book: {
      type: 'uri',
      value: 'http://dbpedia.org/resource/A_Game_of_Thrones'
    },
    genre: {
      type: 'uri',
      value: 'http://dbpedia.org/resource/Fantasy'
    }
  },
  {
    book: {
      type: 'uri',
      value: 'http://dbpedia.org/resource/A_Game_of_Thrones'
    },
    genre: {
      type: 'uri',
      value: 'http://dbpedia.org/resource/Political_strategy'
    }
  }
]
```

Using the format option *resource* with the resource option set to
*book* like so:

```javascript
query.execute({format: {resource: 'book'}}, function(error, results) {
  // ...
});
```

Results in:

```javascript
[
  {
    book: {
      type: 'uri',
      value: 'http://dbpedia.org/resource/A_Game_of_Thrones'
    },
    genre: [
      {
        type: 'uri',
        value: 'http://dbpedia.org/resource/Fantasy'
      },
      {
        type: 'uri',
        value: 'http://dbpedia.org/resource/Political_strategy'
      }
    ]
  }
]
```

This makes it easier to process the results later (in the callback), because all the genres are connected to one book (in one binding), and not spread over several bindings.
Calling the *execute* function will look something like this

```javascript
query.execute({format: {resource: 'book'}}, function(error, results) {
  console.dir(arguments, {depth: null});
});
```

License
=======
The MIT License

Copyright © 2014 Thomas Fritz
</br>Copyright © 2015 Eddie Antonio Santos

Contributors

- Martin Franke (@MtnFranke)
- Pieter Heyvaert ([@PHaDventure](https://twitter.com/PHaDventure))
- Eddie Antonio Santos ([@eddieantonio](http://eddieantonio.ca/))

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
