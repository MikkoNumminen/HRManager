// Mock for mongodb — ESM package that Jest CJS can't parse.
// Client tests never use MongoDB directly.
function MongoClient() {}
MongoClient.prototype.connect = function () {
  return Promise.resolve();
};
MongoClient.prototype.db = function () {
  return {};
};
MongoClient.prototype.close = function () {
  return Promise.resolve();
};

module.exports = { MongoClient };
module.exports.default = { MongoClient };
