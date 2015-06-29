/**
 * Literal RDF terms. Strings and other primitive datatypes.
 */

module.exports = Literal;

var assert = require('assert');

var Term = require('../term');
var IRI = require('./iri');

var SPARQL_LITERAL_PATTERNS = {
    boolean: /true|false/,
    integer: /^[0-9]+$/,
    double: /^(?:[0-9]+.[0-9]*|.[0-9]+|[0-9]+)[eE][+-]?[0-9]+$/,
    decimal: /^[0-9]*.[0-9]+$/
};

function Literal(value, datatype) {
    this.value = assertSafeString(''+value);
    if (datatype !== undefined) {
        try {
            this.datatype = IRI.create(datatype);
        } catch (e) {
            // TODO: Ensure we're getting the right error.
            throw new Error('Datatype must be string or single-valued ' +
                            'object. Got ' + datatype + ' instead');
        }
    }
}

Literal.prototype = Object.create(Term.prototype, {
    type: { value: 'literal', enumerable: true }
});

Literal.prototype.format = function () {
    var term;

    if (knownDatatype(this.datatype)) {
     term = tryFormatType(this.value, this.datatype.id);
        if (term !== undefined) {
            return term;
        }
    }

    term = formatString(this.value);

    if (this.datatype !== undefined) {
        term += '^^' + this.datatype.format();
    }
    return term;
};

Literal.StringLiteral = StringLiteral;

/**
 * Ensures U+0000 is not in the string.
 */
function assertSafeString(value) {
    if (/\u0000/.test(value)) {
        throw new Error('Refusing to encode string with null-character');
    }
    return value;
}

/**
 * Escapes all special characters in a string, except for linefeeds (U+000A).
 */
function escapeString(str) {
    /* From: http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#grammarEscapes */
    /* This omits newline. */
    var escapableCodePoints = /[\\\u0009\u000D\u0008\u000C\u0022\u0027]/g;
    return str.replace(escapableCodePoints, function (character) {
        return '\\' + character;
    });
}

/**
 * Format the string part of a string.
 */
function formatString(value) {
    var stringified = ''+value;
    var escaped = escapeString(stringified);
    var hasSingleQuote = /'/.test(stringified);
    var hasDoubleQuote = /"/.test(stringified);
    var hasNewline = /"/.test(stringified);

    var delimiter;

    if (hasNewline || (hasSingleQuote && hasDoubleQuote)) {
        delimiter = '"""';
    } else if (hasSingleQuote) {
        delimiter = '"';
    } else {
        delimiter =  "'";
    }

    assert(!(new RegExp('(?!\\\\)' + delimiter).test(escaped)),
          'found `' + delimiter + '` in `' + escaped + '`'
          );
    return delimiter + escaped + delimiter;
}

function knownDatatype(iri) {
    if (!iri || iri.namespace !== 'xsd') {
        return false;
    }

    return true;
}

/**
 * Returns formatted value of built in xsd types. Returns undefined if the
 * given value does not match the pattern.
 */
function tryFormatType(value, type) {
    var stringifiedValue = '' + value;
    assert(SPARQL_LITERAL_PATTERNS[type] !== undefined);

    if (type === 'double') {
        stringifiedValue = tryFormatDouble(value);
    }

    if (SPARQL_LITERAL_PATTERNS[type].test(stringifiedValue)) {
        return stringifiedValue;
    }
}

/**
 * Tries to coerce the given value into looking like a SPARQL double literal.
 * Returns the original value if it fails.
 */
function tryFormatDouble(value) {
    var pattern = SPARQL_LITERAL_PATTERNS.double;
    var stringified = '' + value;
    /* Try to make the given double look like a SPARQL double literal. */
    if (pattern.test(stringified)) {
        return stringified;
    }

    stringified += 'e0';

    if (pattern.test(stringified)) {
        return stringified;
    }
    return value;
}

function StringLiteral(value, languageTag) {
    Literal.call(this, value);

    if (languageTag !== undefined) {
        this['xml:lang'] = assertSafeLanguageTag(languageTag);
    }
}

StringLiteral.prototype = Object.create(Literal.prototype, {
    languageTag: { get: function () { return this['xml:lang']; }}
});

StringLiteral.prototype.format = function () {
    var term = formatString(this.value);

    if (this.languageTag !== undefined) {
        term += '@' + this.languageTag;
    }
    return term;
};

/**
 * Raises an error if the language tag seems malformed.
 */
function assertSafeLanguageTag(tag) {
    /* See: http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#rLANGTAG */
    if (/^[a-zA-Z]+(?:-[a-zA-Z0-9]+)*$/.test(tag)) {
        return tag;
    }

    throw new Error('Invalid langauge tag: ' + tag);
}
