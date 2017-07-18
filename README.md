# spleen-n1ql

The [`spleen`](https://www.npmjs.com/package/spleen) module provides high-level abstractions for dynamic filters.  This module will convert a `spleen` [`Filter`](https://www.npmjs.com/package/spleen#class-filter) into a string that is usable within a N1QL statement's `WHERE` clause.

__Contents__
* [Usage](#usage)
* [API](#api)
* [Security Considerations](#security-considerations)
* [Stringify Behavior](#stringify-behavior)

## Usage

Add `spleen-n1ql` to your `package.json` file's `dependencies`:

```sh
$ npm install spleen-n1ql -S
```

Then use it in your code:

```js
const N1ql = require('spleen-n1ql');
const spleen = require('spleen');

const filter = spleen.parse('/foo/bar eq 42 and /baz in [1,2,3]');
const n1qlWhere = N1ql.stringify(filter, { parameterize: true });

console.log(n1qlWhere); // `foo`.`bar` == $1 AND `baz` IN [$2,$3,$4]
```

## API

The `spleen-n1ql` module has a single class.

### Class: `N1ql`

Provides services for converting `spleen` filters into N1QL.

  * __Properties__

    + `errors`: an object that contains references to the various possible errors thrown by `spleen-n1ql`.  This object has the following keys:

      - `DeniedFieldError`: thrown when a field is encountered that has been explicitly black-listed by the `deny` option.

      - `InvalidTargetError`: thrown if a target is encountered with an invalid format.  For example, if a segment of the path contains disallowed characters.

      - `NonallowedFieldError`: thrown when a field is encountered that not been white-listed by the `allow` option.

      - `RequiredFieldError`: thrown when a field that has been required by the `require` option is not present in the given `Filter`.

      - `StringifyError`: a general error thrown when `sleen-n1ql` is unable to convert a given `Filter` instance into a N1QL statement.  This should generally never happen, and is here as a safeguard in the event a `Filter` instance is corrupted.

  * __Methods__

    + `N1ql.stringify(filter [, options])`: converts an instance of `spleen`'s `Filter`' class into a N1QL statement.

      _Parameters_

      - `filter`: _(required)_ the instance of `Filter` to stringify.

      - `options`: _(optional)_ an object that controls various aspects of the stringification process.  This object can have the keys:

        - `allow`: an array of [RFC 6901 JSON pointer](https://tools.ietf.org/html/rfc6901) strings that are allowed to be in a `Filter`'s list of targets.  Any targets in a `Filter` instance not found in the `allow` or `require` lists will result in an error being thrown.  This list functions as a white list, and can only be present if `deny` is absent.  An empty array is the logical equivalent of the `allow` key being absent.

        - `deny`: an array of RFC 6901 JSON pointer strings that are not allowed to be in a `Filter`'s list of targets.  Any targets in a `Filter` instance found in this list will result in an error being thrown.  This list functions as a black list, and can only be present if `allow` is absent.

        - `identifier`: a string to use as a contextual identifier with each field reference.

        - `parameterize`: a Boolean value indicating whether or not literals in the `spleen` expression should be parameterized.  When `true` (the default), all string, number, and Boolean literals are set as numeric parameters.

        - `require`: an array of RFC 6901 JSON pointer strings that are required to be in a `Filter`'s list of targets (`Filter.prototype.targets`).  If a required target is missing, an error is thrown.

      This method returns an object with the following keys:

      - `params`: an array of values, where the index of each entry corresponds to its `$#` placeholder in the filter statement.

      - `value`: a string containing the N1QL filter statement.

## Security Considerations

It is highly recommended that you leave the `parameterize` option as `true` to help prevent SQL-injection attacks.

Additionally, as `spleen-n1ql` converts `Target` field references into dot-notation field references, it will throw an `InvalidTargetError` if any part of the path contains a single quote or backtick character as counter measure to SQL-injection attacks.

To provide an additional layer of security it is recommended that you utilize the `allow` option to white-list possible fields passed in from user input.

It is also highly recommend that you give leverge `spleen`'s `Filter.prototype.prioritize()` method before converting to a N1QL expression.  This allows you to reorder a `Filter`, and optimally utilize known indexes.

## Stringify Behavior

There are situations where a `spleen` filter does not neatly translate into a N1QL expression.  This is particularly true in the case of `spleen`'s `nil` operator.  For example, performing a greater-than on `nil` is technically valid with a `spleen` filter, but does not make much sense when translated to N1QL.  The `N1ql.stringify()` method will make attempts to reconcile this:

* The operators `eq`, `lt`, `lte` when used with `nil` will result in an `IS NULL` N1QL expression.

* The operators `neq`, `gt`, `gte` when used with `nil` will result in an `IS NOT NULL` N1QL expression.
