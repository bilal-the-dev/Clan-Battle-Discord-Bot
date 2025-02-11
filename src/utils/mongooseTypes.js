exports.requiredString = { type: String, required: true };
exports.requiredUniqueString = { ...this.requiredString, unique: true };
exports.defaultZeroNumber = { type: Number, default: 0 };
