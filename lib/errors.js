'use strict';

const elv = require('elv');


const msg = {
  deniedField: 'Black listed field encountered: ',
  invalidTarget: 'Invalid target encountered: ',
  nonallowedField: 'Non-white listed field encountered: ',
  requiredField: 'Missing required field: ',
  stringify: 'Invalid filter.  Unable to stringify.',
};


function StringifyError(message) {
  Error.captureStackTrace(this, StringifyError);
  this.message = elv.coalesce(message, msg.stringify);
  this.name = 'StringifyError';
}
StringifyError.defaultMessage = msg.stringify;
StringifyError.prototype = Object.create(Error.prototype);
StringifyError.prototype.constructor = StringifyError;


function NonallowedFieldError(field) {
  Error.captureStackTrace(this, NonallowedFieldError);
  this.message = msg.nonallowedField + field;
  this.data = field;
  this.name = 'NonallowedFieldError';
}
NonallowedFieldError.defaultMessage = msg.nonallowedField;
NonallowedFieldError.prototype = Object.create(Error.prototype);
NonallowedFieldError.prototype.constructor = NonallowedFieldError;


function DeniedFieldError(field) {
  Error.captureStackTrace(this, DeniedFieldError);
  this.message = msg.deniedField + field;
  this.data = field;
  this.name = 'DeniedFieldError';
}
DeniedFieldError.defaultMessage = msg.deniedField;
DeniedFieldError.prototype = Object.create(Error.prototype);
DeniedFieldError.prototype.constructor = DeniedFieldError;


function RequiredFieldError(field) {
  Error.captureStackTrace(this, RequiredFieldError);
  this.message = msg.requiredField + field;
  this.data = field;
  this.name = 'RequiredFieldError';
}
RequiredFieldError.defaultMessage = msg.requiredField;
RequiredFieldError.prototype = Object.create(Error.prototype);
RequiredFieldError.prototype.constructor = RequiredFieldError;


function InvalidTargetError(target) {
  Error.captureStackTrace(this, InvalidTargetError);
  this.message = msg.invalidTarget + target.toJsonPointer();
  this.data = target.path;
  this.name = 'InvalidTargetError';
}
InvalidTargetError.defaultMessage = msg.invalidTarget;
InvalidTargetError.prototype = Object.create(Error.prototype);
InvalidTargetError.prototype.constructor = InvalidTargetError;


module.exports = {
  DeniedFieldError,
  InvalidTargetError,
  NonallowedFieldError,
  RequiredFieldError,
  StringifyError,
};
