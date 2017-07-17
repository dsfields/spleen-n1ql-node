'use strict';

const elv = require('elv');
const spleen = require('spleen');

const errors = require('./errors');

const Clause = spleen.Clause;
const Filter = spleen.Filter;
const Like = spleen.Like;
const Range = spleen.Range;
const Target = spleen.Target;


const msg = {
  argAllow: 'Argument "options.allow" must be an array',
  argAllowDeny: 'Argument "options" cannot have both "allow" and "deny"',
  argDeny: 'Argument "options.deny" must be an array',
  argFilter: 'Argument "filter" must be an instance of spleen\'s Filter class',
  argIdentifier: 'Argument "options.identifier" must be a non-empty string',
  argOptions: 'Argument "options" must be an object',
  argParameterize: 'Argument "options.parameterize" must be a Boolean',
  argRequire: 'Argument "options.require" must be an array',
  unknownOp: 'Unknown operator encountered: ',
  strIsNullOp: 'Invalid operator used in IS NULL expression: ',
};


const invalidTarget = /[`']/;


class Builder {

  constructor(filter, options) {
    if (!(filter instanceof Filter))
      throw new TypeError(msg.argFilter);

    const ops = elv.coalesce(options, {});

    if (typeof ops !== 'object')
      throw new TypeError(msg.argOptions);

    const allow = elv.coalesce(ops.allow, []);
    const deny = elv.coalesce(ops.deny, []);
    const ident = ops.identifier;
    const param = elv.coalesce(ops.parameterize, true);
    const req = elv.coalesce(ops.require, []);

    if (!Array.isArray(allow))
      throw new TypeError(msg.argAllow);

    if (!Array.isArray(deny))
      throw new TypeError(msg.argDeny);

    if (allow.length > 0 && deny.length > 0)
      throw new TypeError(msg.argAllowDeny);

    if (elv(ident) && (typeof ident !== 'string' || ident.length === 0))
      throw new TypeError(msg.argIdentifier);

    if (typeof param !== 'boolean')
      throw new TypeError(msg.argParameterize);

    if (!Array.isArray(req))
      throw new TypeError(msg.argRequire);

    this._allow = (allow.length > 0)
      ? new Set(allow)
      : null;

    this._deny = (deny.length > 0)
      ? new Set(deny)
      : null;

    this._fields = new Set();
    this._require = req;
    this._identifier = elv.coalesce(ident, '');
    this._parameterize = param;
    this.params = [];

    this.filter = filter;
  }


  _target(target) {
    if (this._allow !== null && !this._allow.has(target.field))
      throw new errors.NonallowedFieldError(target.field);

    if (this._deny !== null && this._deny.has(target.field))
      throw new errors.DeniedFieldError(target.field);

    let val = this._identifier;

    for (let i = 0; i < target.path.length; i++) {
      const segment = target.path[i];

      if (Number.isInteger(segment)) {
        val += '[' + segment.toString() + ']';
        continue;
      }

      if (typeof segment === 'string') {
        if (invalidTarget.test(segment))
          throw new errors.InvalidTargetError(target);

        if (val.length > 0) val += '.';
        val += '`' + segment + '`';
        continue;
      }

      throw new errors.StringifyError();
    }

    this._fields.add(target.field);
    return val;
  }


  _literal(literal) {
    const type = typeof literal;

    if (type !== 'string' && type !== 'number' && type !== 'boolean')
      throw new errors.StringifyError();

    if (this._parameterize) {
      const num = this.params.push(literal);
      return '$' + num.toString();
    }

    if (type === 'string')
      return '\'' + literal + '\'';

    return literal.toString();
  }


  _comparison(term) {
    return (term instanceof Target)
      ? this._target(term)
      : this._literal(term);
  }


  _pattern(like) {
    if (!(like instanceof Like) || typeof like.value !== 'string')
      throw new errors.StringifyError();

    let val = '';
    let isEscaping = false;

    for (let i = 0; i < like.value.length; i++) {
      const char = like.value[i];

      if (char === '\\' && !isEscaping) {
        isEscaping = true;
        continue;
      }

      if (isEscaping) {
        isEscaping = false;

        if (char === '*') {
          val += '*';
          continue;
        }

        if (char === '_') {
          val += '\\_';
          continue;
        }

        val += '\\' + char;
        continue;
      }

      if (char === '\'') {
        val += '\'\'';
        continue;
      }

      if (char === '*') {
        val += '%';
        continue;
      }

      val += char;
    }

    if (this._parameterize) {
      const num = this.params.push(val);
      return '$' + num.toString();
    }

    return '\'' + val + '\'';
  }


  _range(range) {
    if (!(range instanceof Range))
      throw new errors.StringifyError();

    return this._literal(range.lower)
      + ' AND '
      + this._literal(range.upper);
  }


  _array(array) {
    if (!Array.isArray(array))
      throw new errors.StringifyError();

    let val = '[';

    for (let i = 0; i < array.length; i++) {
      if (i > 0) val += ',';
      val += this._literal(array[i]);
    }

    val += ']';

    return val;
  }


  static _isnullOp(operator) {
    switch (operator) {
      case 'eq':
      case 'lt':
      case 'lte':
        return ' IS NULL';

      case 'neq':
      case 'gt':
      case 'gte':
        return ' IS NOT NULL';

      default:
        throw new errors.StringifyError(msg.strIsNullOp + operator);
    }
  }


  _isnull(left, operator) {
    return this._comparison(left) + Builder._isnullOp(operator);
  }


  _build(filter) {
    let value = '';

    for (let i = 0; i < filter.statements.length; i++) {
      const statement = filter.statements[i];
      const sval = statement.value;

      switch (statement.conjunctive) {
        case 'and':
          value += ' AND ';
          break;
        case 'or':
          value += ' OR ';
          break;
        default:
          break;
      }

      if (sval instanceof Filter) {
        value += '(' + this._build(sval) + ')';
        continue;
      }

      if (!(sval instanceof Clause))
        throw new errors.StringifyError();

      if (sval.subject === null) {
        value += this._isnull(sval.object, sval.operator.type);
        continue;
      }

      if (sval.object === null) {
        value += this._isnull(sval.subject, sval.operator.type);
        continue;
      }

      value += this._comparison(sval.subject);

      switch (sval.operator.type) {
        case 'eq':
          value += ' == ' + this._comparison(sval.object);
          break;

        case 'neq':
          value += ' != ' + this._comparison(sval.object);
          break;

        case 'gt':
          value += ' > ' + this._comparison(sval.object);
          break;

        case 'gte':
          value += ' >= ' + this._comparison(sval.object);
          break;

        case 'lt':
          value += ' < ' + this._comparison(sval.object);
          break;

        case 'lte':
          value += ' <= ' + this._comparison(sval.object);
          break;

        case 'like':
          value += ' LIKE ' + this._pattern(sval.object);
          break;

        case 'nlike':
          value += ' NOT LIKE ' + this._pattern(sval.object);
          break;

        case 'between':
          value += ' BETWEEN ' + this._range(sval.object);
          break;

        case 'nbetween':
          value += ' NOT BETWEEN ' + this._range(sval.object);
          break;

        case 'in':
          value += ' IN ' + this._array(sval.object);
          break;

        case 'nin':
          value += ' NOT IN ' + this._array(sval.object);
          break;

        default:
          throw new errors.StringifyError(msg.unknownOp + sval.operator.type);
      }
    }

    return value;
  }


  build() {
    this.value = this._build(this.filter);
  }


  validate() {
    for (let i = 0; i < this._require.length; i++) {
      const req = this._require[i];

      if (!this._fields.has(req))
        throw new errors.RequiredFieldError(req);
    }
  }

}


module.exports = function (filter, options) {
  const builder = new Builder(filter, options);
  builder.build();
  builder.validate();

  return {
    params: builder.params,
    value: builder.value,
  };
};
