'use strict';

const assert = require('chai').assert;
const spleen = require('spleen');

const errors = require('../../lib/errors');
const stringify = require('../../lib/stringify');


describe('#stringify', () => {
  it('should throw if filter not Filter', () => {
    assert.throws(() => {
      stringify(42);
    }, TypeError);
  });

  it('should throw if options not object', () => {
    assert.throws(() => {
      stringify(spleen.parse('/foo eq 42').value, 42);
    }, TypeError);
  });

  it('should throw if options.allow not array', () => {
    assert.throws(() => {
      stringify(spleen.parse('/foo eq 42').value, { allow: 42 });
    }, TypeError);
  });

  it('should throw if options.deny not array', () => {
    assert.throws(() => {
      stringify(spleen.parse('/foo eq 42').value, { deny: 42 });
    }, TypeError);
  });

  it('should throw if both allow and deny provided', () => {
    assert.throws(() => {
      stringify(spleen.parse('/foo eq 42').value, {
        allow: ['/foo'],
        deny: ['/bar'],
      });
    }, TypeError);
  });

  it('should throw if options.identifier not string', () => {
    assert.throws(() => {
      stringify(spleen.parse('/foo eq 42').value, { identifier: 42 });
    }, TypeError);
  });

  it('should throw if options.identifier empty string', () => {
    assert.throws(() => {
      stringify(spleen.parse('/foo eq 42').value, { identifier: '' });
    }, TypeError);
  });

  it('should throw if options.parameterize not Boolean', () => {
    assert.throws(() => {
      stringify(spleen.parse('/foo eq 42').value, { parameterize: 42 });
    }, TypeError);
  });

  it('should throw if options.require not array', () => {
    assert.throws(() => {
      stringify(spleen.parse('/foo eq 42').value, { require: 42 });
    }, TypeError);
  });

  it('should throw if statement not Filter or Clause', () => {
    assert.throws(() => {
      const filter = spleen.parse('/foo eq 42').value;
      filter.statements[0].value = 42;
      stringify(filter);
    }, errors.StringifyError);
  });

  it('should throw if subject target field not in allow list', () => {
    assert.throws(() => {
      const filter = spleen.parse('/foo eq 42').value;
      stringify(filter, { allow: ['/bar'] });
    }, errors.NonallowedFieldError);
  });

  it('should throw if subject target field in deny list', () => {
    assert.throws(() => {
      const filter = spleen.parse('/foo eq 42').value;
      stringify(filter, { deny: ['/foo'] });
    }, errors.DeniedFieldError);
  });

  it('should append subject target field with identifier', () => {
    const filter = spleen.parse('/foo eq 42').value;
    const result = stringify(filter, { identifier: '`test`' });
    assert.strictEqual(result.value, '`test`.`foo` == $1');
  });

  it('should throw if subject target contains back ticks', () => {
    assert.throws(() => {
      const filter = spleen.parse('/f`oo eq 42').value;
      stringify(filter);
    }, errors.InvalidTargetError);
  });

  it('should throw if subject target contains single quotes', () => {
    assert.throws(() => {
      const filter = spleen.parse('/f\'oo eq 42').value;
      stringify(filter);
    }, errors.InvalidTargetError);
  });

  it('should escape subject target path segments with back ticks', () => {
    const filter = spleen.parse('/foo eq 42').value;
    const result = stringify(filter);
    assert.strictEqual(result.value, '`foo` == $1');
  });

  it('should delimit subject target path segments with .', () => {
    const filter = spleen.parse('/foo/bar eq 42').value;
    const result = stringify(filter);
    assert.strictEqual(result.value, '`foo`.`bar` == $1');
  });

  it('should treat subject target integer segments as array index', () => {
    const filter = spleen.parse('/foo/2 eq 42').value;
    const result = stringify(filter);
    assert.strictEqual(result.value, '`foo`[2] == $1');
  });

  it('should throw if subject target segment not integer or string', () => {
    assert.throws(() => {
      const filter = spleen.parse('/foo eq 42').value;
      filter.statements[0].value.subject.path[0] = {};
      stringify(filter);
    }, errors.StringifyError);
  });

  it('should throw if subject literal not string, number or Boolean', () => {
    assert.throws(() => {
      const filter = spleen.parse('/foo eq 42').value;
      filter.statements[0].value.subject = [];
      stringify(filter);
    }, errors.StringifyError);
  });

  it('should add add subject literal value to params list', () => {
    const filter = spleen.parse('42 eq /foo').value;
    const result = stringify(filter);
    assert.strictEqual(result.params[0], 42);
  });

  it('should set subject literal param placeholder', () => {
    const filter = spleen.parse('42 eq /foo').value;
    const result = stringify(filter);
    assert.strictEqual(result.value, '$1 == `foo`');
  });

  it('should set subject literal when !parameterize', () => {
    const filter = spleen.parse('42 eq /foo').value;
    const result = stringify(filter, { parameterize: false });
    assert.strictEqual(result.value, '42 == `foo`');
  });

  it('should set subject quoted string literal when !parameterize', () => {
    const filter = spleen.parse('"bar" eq /foo').value;
    const result = stringify(filter, { parameterize: false });
    assert.strictEqual(result.value, '\'bar\' == `foo`');
  });

  it('should set operator to == when eq', () => {
    const filter = spleen.parse('/foo eq 42').value;
    const result = stringify(filter);
    assert.strictEqual(result.value, '`foo` == $1');
  });

  it('should set operator to != when neq', () => {
    const filter = spleen.parse('/foo neq 42').value;
    const result = stringify(filter);
    assert.strictEqual(result.value, '`foo` != $1');
  });

  it('should set operator to > when gt', () => {
    const filter = spleen.parse('/foo gt 42').value;
    const result = stringify(filter);
    assert.strictEqual(result.value, '`foo` > $1');
  });

  it('should set operator to >= when gte', () => {
    const filter = spleen.parse('/foo gte 42').value;
    const result = stringify(filter);
    assert.strictEqual(result.value, '`foo` >= $1');
  });

  it('should set operator to < when lt', () => {
    const filter = spleen.parse('/foo lt 42').value;
    const result = stringify(filter);
    assert.strictEqual(result.value, '`foo` < $1');
  });

  it('should set operator to <= when lte', () => {
    const filter = spleen.parse('/foo lte 42').value;
    const result = stringify(filter);
    assert.strictEqual(result.value, '`foo` <= $1');
  });

  it('should set operator to BETWEEN when between', () => {
    const filter = spleen.parse('/foo between 0,42').value;
    const result = stringify(filter);
    assert.strictEqual(result.value, '`foo` BETWEEN $1 AND $2');
  });

  it('should set operator to NOT BETWEEN when nbetween', () => {
    const filter = spleen.parse('/foo nbetween 0,42').value;
    const result = stringify(filter);
    assert.strictEqual(result.value, '`foo` NOT BETWEEN $1 AND $2');
  });

  it('should set operator to IN when in', () => {
    const filter = spleen.parse('/foo in [0,42]').value;
    const result = stringify(filter);
    assert.strictEqual(result.value, '`foo` IN [$1,$2]');
  });

  it('should set operator to NOT IN when nin', () => {
    const filter = spleen.parse('/foo nin [0,42]').value;
    const result = stringify(filter);
    assert.strictEqual(result.value, '`foo` NOT IN [$1,$2]');
  });

  it('should set operator to LIKE when like', () => {
    const filter = spleen.parse('/foo like "test"').value;
    const result = stringify(filter);
    assert.strictEqual(result.value, '`foo` LIKE $1');
  });

  it('should set operator to NOT LIKE when nlike', () => {
    const filter = spleen.parse('/foo nlike "test"').value;
    const result = stringify(filter);
    assert.strictEqual(result.value, '`foo` NOT LIKE $1');
  });

  it('should throw if object target field not in allow list', () => {
    assert.throws(() => {
      const filter = spleen.parse('/foo nlike "*foo"').value;
      stringify(filter, { allow: ['/bar'] });
    }, errors.NonallowedFieldError);
  });

  it('should throw if object target field in deny list', () => {
    assert.throws(() => {
      const filter = spleen.parse('/foo nlike "*foo"').value;
      stringify(filter, { deny: ['/foo'] });
    }, errors.DeniedFieldError);
  });

  it('should append object target field with identifier', () => {
    const filter = spleen.parse('42 eq /foo').value;
    const result = stringify(filter, { identifier: '`test`' });
    assert.strictEqual(result.value, '$1 == `test`.`foo`');
  });

  it('should throw if object target target contains back ticks', () => {
    assert.throws(() => {
      const filter = spleen.parse('/fo`o eq 42').value;
      stringify(filter);
    }, errors.InvalidTargetError);
  });

  it('should throw if object target contains single quotes', () => {
    assert.throws(() => {
      const filter = spleen.parse('/fo\'o eq 42').value;
      stringify(filter);
    }, errors.InvalidTargetError);
  });

  it('should escape object target path segments with back ticks', () => {
    const filter = spleen.parse('42 eq /foo').value;
    const result = stringify(filter);
    assert.strictEqual(result.value, '$1 == `foo`');
  });

  it('should delimit object target path segments with .', () => {
    const filter = spleen.parse('42 eq /foo/bar/baz').value;
    const result = stringify(filter);
    assert.strictEqual(result.value, '$1 == `foo`.`bar`.`baz`');
  });

  it('should treat object target integer segments as array index', () => {
    const filter = spleen.parse('42 eq /foo/bar/3').value;
    const result = stringify(filter);
    assert.strictEqual(result.value, '$1 == `foo`.`bar`[3]');
  });

  it('should throw if object target segment not integer or string', () => {
    assert.throws(() => {
      const filter = spleen.parse('42 eq /foo').value;
      filter.statements[0].value.object.path[0] = true;
      stringify(filter);
    }, errors.StringifyError);
  });

  it('should throw if object literal not string, number or Boolean', () => {
    assert.throws(() => {
      const filter = spleen.parse('42 eq /foo').value;
      filter.statements[0].value.object.path[0] = {};
      stringify(filter);
    }, errors.StringifyError);
  });

  it('should add object literal value to params list', () => {
    const filter = spleen.parse('/foo eq 42').value;
    const result = stringify(filter);
    assert.strictEqual(result.params[0], 42);
  });

  it('should set object literal param placeholder', () => {
    const filter = spleen.parse('/foo eq 42').value;
    const result = stringify(filter);
    assert.strictEqual(result.value, '`foo` == $1');
  });

  it('should set object literal when !parameterize', () => {
    const filter = spleen.parse('/foo eq 42').value;
    const result = stringify(filter, { parameterize: false });
    assert.strictEqual(result.value, '`foo` == 42');
  });

  it('should set object quoted string literal when !parameterize', () => {
    const filter = spleen.parse('/foo eq "bar"').value;
    const result = stringify(filter, { parameterize: false });
    assert.strictEqual(result.value, '`foo` == \'bar\'');
  });

  it('should throw if object not Range with between ', () => {
    assert.throws(() => {
      const filter = spleen.parse('/foo between 0,42').value;
      filter.statements[0].value.object = 'oops';
      stringify(filter);
    }, errors.StringifyError);
  });

  it('should throw if lower not literal with between', () => {
    assert.throws(() => {
      const filter = spleen.parse('/foo between 0,42').value;
      filter.statements[0].value.object.lower = {};
      stringify(filter);
    }, errors.StringifyError);
  });

  it('should throw if upper not literal with between', () => {
    assert.throws(() => {
      const filter = spleen.parse('/foo between 0,42').value;
      filter.statements[0].value.object.upper = [];
      stringify(filter);
    }, errors.StringifyError);
  });

  it('should add lower to params with between', () => {
    const filter = spleen.parse('/foo between 0,42').value;
    const result = stringify(filter);
    assert.strictEqual(result.params[0], 0);
  });

  it('should add upper to params with between', () => {
    const filter = spleen.parse('/foo between 0,42').value;
    const result = stringify(filter);
    assert.strictEqual(result.params[1], 42);
  });

  it('should set numbered param with between', () => {
    const filter = spleen.parse('/foo between 0,42').value;
    const result = stringify(filter);
    assert.strictEqual(result.value, '`foo` BETWEEN $1 AND $2');
  });

  it('should set number values with between when !parameterize', () => {
    const filter = spleen.parse('/foo between 0,42').value;
    const result = stringify(filter, { parameterize: false });
    assert.strictEqual(result.value, '`foo` BETWEEN 0 AND 42');
  });

  it('should set string values with between when !parameterize', () => {
    const filter = spleen.parse('/foo between "a","z"').value;
    const result = stringify(filter, { parameterize: false });
    assert.strictEqual(result.value, '`foo` BETWEEN \'a\' AND \'z\'');
  });

  it('should throw if object not Range with nbetween ', () => {
    assert.throws(() => {
      const filter = spleen.parse('/foo nbetween 0,42').value;
      filter.statements[0].value.object = 'oops';
      stringify(filter);
    }, errors.StringifyError);
  });

  it('should throw if lower not literal with nbetween', () => {
    assert.throws(() => {
      const filter = spleen.parse('/foo nbetween 0,42').value;
      filter.statements[0].value.object.lower = {};
      stringify(filter);
    }, errors.StringifyError);
  });

  it('should throw if upper not literal with nbetween', () => {
    assert.throws(() => {
      const filter = spleen.parse('/foo nbetween 0,42').value;
      filter.statements[0].value.object.upper = [];
      stringify(filter);
    }, errors.StringifyError);
  });

  it('should add lower to params with nbetween', () => {
    const filter = spleen.parse('/foo nbetween 0,42').value;
    const result = stringify(filter);
    assert.strictEqual(result.params[0], 0);
  });

  it('should add upper to params with nbetween', () => {
    const filter = spleen.parse('/foo nbetween 0,42').value;
    const result = stringify(filter);
    assert.strictEqual(result.params[1], 42);
  });

  it('should set numbered param with nbetween', () => {
    const filter = spleen.parse('/foo nbetween 0,42').value;
    const result = stringify(filter);
    assert.strictEqual(result.value, '`foo` NOT BETWEEN $1 AND $2');
  });

  it('should set number values with nbetween when !parameterize', () => {
    const filter = spleen.parse('/foo nbetween 0,42').value;
    const result = stringify(filter, { parameterize: false });
    assert.strictEqual(result.value, '`foo` NOT BETWEEN 0 AND 42');
  });

  it('should set string values with nbetween when !parameterize', () => {
    const filter = spleen.parse('/foo nbetween "a","z"').value;
    const result = stringify(filter, { parameterize: false });
    assert.strictEqual(result.value, '`foo` NOT BETWEEN \'a\' AND \'z\'');
  });

  it('should throw if object not array with in', () => {
    assert.throws(() => {
      const filter = spleen.parse('/foo in [1,2,3]').value;
      filter.statements[0].value.object = () => new Date();
      stringify(filter);
    }, errors.StringifyError);
  });

  it('should throw if object array contains non-literal with in', () => {
    assert.throws(() => {
      const filter = spleen.parse('/foo in [1,2,3]').value;
      filter.statements[0].value.object[1] = {};
      stringify(filter);
    }, errors.StringifyError);
  });

  it('should set [] for empty object arrays with in', () => {
    const filter = spleen.parse('/foo in []').value;
    const result = stringify(filter);
    assert.strictEqual(result.value, '`foo` IN []');
  });

  it('should add object array entries to params with in', () => {
    const filter = spleen.parse('/foo in [1,2,3]').value;
    const result = stringify(filter);
    assert.strictEqual(result.params[0], 1);
    assert.strictEqual(result.params[1], 2);
    assert.strictEqual(result.params[2], 3);
  });

  it('should set numbered params for object array entries with in', () => {
    const filter = spleen.parse('/foo in [1,2,3]').value;
    const result = stringify(filter);
    assert.strictEqual(result.value, '`foo` IN [$1,$2,$3]');
  });

  it('should set numbers in object array with in when !parameterize', () => {
    const filter = spleen.parse('/foo in [1,2,3]').value;
    const result = stringify(filter, { parameterize: false });
    assert.strictEqual(result.value, '`foo` IN [1,2,3]');
  });

  it('should set strings in object array with in when !parameterize', () => {
    const filter = spleen.parse('/foo in ["a","b","c"]').value;
    const result = stringify(filter, { parameterize: false });
    assert.strictEqual(result.value, '`foo` IN [\'a\',\'b\',\'c\']');
  });

  it('should set Booleans in object array with in when !parameterize', () => {
    const filter = spleen.parse('/foo in [true]').value;
    const result = stringify(filter, { parameterize: false });
    assert.strictEqual(result.value, '`foo` IN [true]');
  });

  it('should set mixed in object array with in when !parameterize', () => {
    const filter = spleen.parse('/foo in [42,false,"blorg"]').value;
    const result = stringify(filter, { parameterize: false });
    assert.strictEqual(result.value, '`foo` IN [42,false,\'blorg\']');
  });

  it('should throw if object not array with in', () => {
    assert.throws(() => {
      const filter = spleen.parse('/foo in [1,2,3]').value;
      filter.statements[0].value.object = {};
      stringify(filter);
    }, errors.StringifyError);
  });

  it('should throw if object not array with nin', () => {
    assert.throws(() => {
      const filter = spleen.parse('/foo nin [1,2,3]').value;
      filter.statements[0].value.object = () => new Date();
      stringify(filter);
    }, errors.StringifyError);
  });

  it('should throw if object array contains non-literal with nin', () => {
    assert.throws(() => {
      const filter = spleen.parse('/foo nin [1,2,3]').value;
      filter.statements[0].value.object[1] = {};
      stringify(filter);
    }, errors.StringifyError);
  });

  it('should set [] for empty object arrays with nin', () => {
    const filter = spleen.parse('/foo nin []').value;
    const result = stringify(filter);
    assert.strictEqual(result.value, '`foo` NOT IN []');
  });

  it('should add object array entries to params with nin', () => {
    const filter = spleen.parse('/foo nin [1,2,3]').value;
    const result = stringify(filter);
    assert.strictEqual(result.params[0], 1);
    assert.strictEqual(result.params[1], 2);
    assert.strictEqual(result.params[2], 3);
  });

  it('should set numbered params for object array entries with nin', () => {
    const filter = spleen.parse('/foo nin [1,2,3]').value;
    const result = stringify(filter);
    assert.strictEqual(result.value, '`foo` NOT IN [$1,$2,$3]');
  });

  it('should set numbers in object array with nin when !parameterize', () => {
    const filter = spleen.parse('/foo nin [1,2,3]').value;
    const result = stringify(filter, { parameterize: false });
    assert.strictEqual(result.value, '`foo` NOT IN [1,2,3]');
  });

  it('should set strings in object array with nin when !parameterize', () => {
    const filter = spleen.parse('/foo nin ["a","b","c"]').value;
    const result = stringify(filter, { parameterize: false });
    assert.strictEqual(result.value, '`foo` NOT IN [\'a\',\'b\',\'c\']');
  });

  it('should set Booleans in object array with nin when !parameterize', () => {
    const filter = spleen.parse('/foo nin [true]').value;
    const result = stringify(filter, { parameterize: false });
    assert.strictEqual(result.value, '`foo` NOT IN [true]');
  });

  it('should set mixed in object array with nin when !parameterize', () => {
    const filter = spleen.parse('/foo nin [42,false,"blorg"]').value;
    const result = stringify(filter, { parameterize: false });
    assert.strictEqual(result.value, '`foo` NOT IN [42,false,\'blorg\']');
  });

  it('should throw if object not array with nin', () => {
    assert.throws(() => {
      const filter = spleen.parse('/foo nin [1,2,3]').value;
      filter.statements[0].value.object = {};
      stringify(filter);
    }, errors.StringifyError);
  });

  it('should throw if object not Like with like', () => {
    assert.throws(() => {
      const filter = spleen.parse('/foo like "*foo"').value;
      filter.statements[0].value.object = 'stuff';
      stringify(filter);
    }, errors.StringifyError);
  });

  it('should throw if object.value not string with like', () => {
    assert.throws(() => {
      const filter = spleen.parse('/foo like "*foo"').value;
      filter.statements[0].value.object.value = 42;
      stringify(filter);
    }, errors.StringifyError);
  });

  it('should convert object like statement \' to \'\'', () => {
    const filter = spleen.parse('/foo like "\'foo"').value;
    const result = stringify(filter);
    assert.strictEqual(result.params[0], '\'\'foo');
  });

  it('should add * to object like statement if escaped', () => {
    const filter = spleen.parse('/foo like "\\\\*foo"').value;
    const result = stringify(filter);
    assert.strictEqual(result.params[0], '*foo');
  });

  it('should add \\ to object like statement if escaped', () => {
    const filter = spleen.parse('/foo like "\\\\foo"').value;
    const result = stringify(filter);
    assert.strictEqual(result.params[0], '\\foo');
  });

  it('should add \\_ to object like statement if escaped', () => {
    const filter = spleen.parse('/foo like "\\\\_foo"').value;
    const result = stringify(filter);
    assert.strictEqual(result.params[0], '\\_foo');
  });

  it('should add \\ to object like statement if escaping unescable', () => {
    const filter = spleen.parse('/foo like "\\\\foo"').value;
    const result = stringify(filter);
    assert.strictEqual(result.params[0], '\\foo');
  });

  it('should convert * to % in object like statement', () => {
    const filter = spleen.parse('/foo like "foo*"').value;
    const result = stringify(filter);
    assert.strictEqual(result.params[0], 'foo%');
  });

  it('should set object like statement when !parameterize', () => {
    const filter = spleen.parse('/foo like "foo*"').value;
    const result = stringify(filter, { parameterize: false });
    assert.strictEqual(result.value, '`foo` LIKE \'foo%\'');
  });

  it('should throw if object not Like with nlike', () => {
    assert.throws(() => {
      const filter = spleen.parse('/foo nlike "*foo"').value;
      filter.statements[0].value.object = 'stuff';
      stringify(filter);
    }, errors.StringifyError);
  });

  it('should throw if object.value not string with nlike', () => {
    assert.throws(() => {
      const filter = spleen.parse('/foo nlike "*foo"').value;
      filter.statements[0].value.object.value = 42;
      stringify(filter);
    }, errors.StringifyError);
  });

  it('should convert object nlike statement \' to \'\'', () => {
    const filter = spleen.parse('/foo nlike "\'foo"').value;
    const result = stringify(filter);
    assert.strictEqual(result.params[0], '\'\'foo');
  });

  it('should add * to object nlike statement if escaped', () => {
    const filter = spleen.parse('/foo nlike "\\\\*foo"').value;
    const result = stringify(filter);
    assert.strictEqual(result.params[0], '*foo');
  });

  it('should add \\ to object nlike statement if escaped', () => {
    const filter = spleen.parse('/foo nlike "\\\\foo"').value;
    const result = stringify(filter);
    assert.strictEqual(result.params[0], '\\foo');
  });

  it('should add \\_ to object nlike statement if escaped', () => {
    const filter = spleen.parse('/foo nlike "\\\\_foo"').value;
    const result = stringify(filter);
    assert.strictEqual(result.params[0], '\\_foo');
  });

  it('should add \\ to object nlike statement if escaping unescable', () => {
    const filter = spleen.parse('/foo nlike "foo"').value;
    const result = stringify(filter);
    assert.strictEqual(result.params[0], 'foo');
  });

  it('should convert * to % in object nlike statement', () => {
    const filter = spleen.parse('/foo nlike "foo*"').value;
    const result = stringify(filter);
    assert.strictEqual(result.params[0], 'foo%');
  });

  it('should set object nlike statement when !parameterize', () => {
    const filter = spleen.parse('/foo nlike "foo*"').value;
    const result = stringify(filter, { parameterize: false });
    assert.strictEqual(result.value, '`foo` NOT LIKE \'foo%\'');
  });

  it('should nest groups in ()', () => {
    const filter = spleen.parse('(/foo eq /bar or /qux neq 42)').value;
    const result = stringify(filter);
    assert.strictEqual(result.value, '(`foo` == `bar` OR `qux` != $1)');
  });

  it('should nest groups within groups in ()', () => {
    const f = '((/foo eq /bar or /baz neq /bar) and /qux eq 42)';
    const filter = spleen.parse(f).value;
    const result = stringify(filter);
    const r = '((`foo` == `bar` OR `baz` != `bar`) AND `qux` == $1)';
    assert.strictEqual(result.value, r);
  });

  it('should join clauses with and', () => {
    const filter = spleen.parse('/foo eq /bar and /baz eq 42').value;
    const result = stringify(filter);
    assert.strictEqual(result.value, '`foo` == `bar` AND `baz` == $1');
  });

  it('should join clauses with or', () => {
    const filter = spleen.parse('/foo eq /bar or /baz eq 42').value;
    const result = stringify(filter);
    assert.strictEqual(result.value, '`foo` == `bar` OR `baz` == $1');
  });

  it('should join groups with and', () => {
    const f = '(/foo eq /bar or /baz eq 42) and (/qux neq /quux or /quuz gt 0)';
    const filter = spleen.parse(f).value;
    const result = stringify(filter);
    /* eslint-disable max-len */
    assert.strictEqual(result.value, '(`foo` == `bar` OR `baz` == $1) AND (`qux` != `quux` OR `quuz` > $2)');
    /* eslint-enable max-len */
  });

  it('should join groups with or', () => {
    const f = '(/foo eq /bar and /baz eq 42) or (/qux neq /quux or /quuz gt 0)';
    const filter = spleen.parse(f).value;
    const result = stringify(filter);
    /* eslint-disable max-len */
    assert.strictEqual(result.value, '(`foo` == `bar` AND `baz` == $1) OR (`qux` != `quux` OR `quuz` > $2)');
    /* eslint-enable max-len */
  });

  it('should join clause to group with and', () => {
    const exp = '/qux gt 0 and (/foo eq /bar or /baz eq 42)';
    const filter = spleen.parse(exp).value;
    const result = stringify(filter);
    const r = '`qux` > $1 AND (`foo` == `bar` OR `baz` == $2)';
    assert.strictEqual(result.value, r);
  });

  it('should join clause to group with or', () => {
    const exp = '/qux gt 0 or (/foo eq /bar and /baz eq 42)';
    const filter = spleen.parse(exp).value;
    const result = stringify(filter);
    const r = '`qux` > $1 OR (`foo` == `bar` AND `baz` == $2)';
    assert.strictEqual(result.value, r);
  });

  it('should join group to clause with and', () => {
    const exp = '(/foo eq /bar or /baz eq 42) and /qux gt 0';
    const filter = spleen.parse(exp).value;
    const result = stringify(filter);
    const r = '(`foo` == `bar` OR `baz` == $1) AND `qux` > $2';
    assert.strictEqual(result.value, r);
  });

  it('should join group to clause with or', () => {
    const exp = '(/foo eq /bar and /baz eq 42) or /qux gt 0';
    const filter = spleen.parse(exp).value;
    const result = stringify(filter);
    const r = '(`foo` == `bar` AND `baz` == $1) OR `qux` > $2';
    assert.strictEqual(result.value, r);
  });

  it('should throw if missing required field', () => {
    assert.throws(() => {
      const filter = spleen.parse('/foo eq 42').value;
      stringify(filter, { require: ['/bar'] });
    }, errors.RequiredFieldError);
  });

  it('should not throw when all required fields are included', () => {
    assert.doesNotThrow(() => {
      const filter = spleen.parse('/foo eq 42').value;
      stringify(filter, { require: ['/foo'] });
    }, errors.RequiredFieldError);
  });

  it('should throw if unknown operator encountered', () => {
    assert.throws(() => {
      const filter = spleen.parse('/foo eq 42').value;
      filter.statements[0].value.operator = { type: 'blorg' };
      stringify(filter);
    }, errors.StringifyError);
  });
});
