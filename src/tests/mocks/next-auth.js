// Mock for next-auth — ESM package that Jest CJS can't parse.
// Uses CJS format to avoid transform issues.
function stub() {
  return { auth: function () {}, signIn: function () {}, signOut: function () {}, handlers: {} };
}
module.exports = stub;
module.exports.default = stub;
module.exports.auth = function () {};
module.exports.signIn = function () {};
module.exports.signOut = function () {};
module.exports.handlers = {};
module.exports.NextAuth = stub;
