const config = require(__dirname + '/../config')
const mongodb = require('mongodb')

const Database = function (callback) {
  mongodb.MongoClient.connect(config.get('database.uri'), (err, connection) => {
    if (err) throw err

    // Store connection
    this.db = connection

    // Create schema
    this.createSchema(callback)
  }) 
}

Database.prototype.createSchema = function (callback) {
  // Create `repos` collection
  this.db.createCollection(config.get('database.reposCollection'), (err, collection) => {
    if (err) throw err

    // Add index
    collection.createIndex({'repository': 1}, null, (err, results) => {
      if (err) throw err

      if (typeof callback === 'function') {
        callback(this.db)
      }
    })
  })
}

Database.prototype.addScheduledTest = function (repository, profile, date) {
  return new Promise((resolve, reject) => {
    this.db.collection(config.get('database.reposCollection')).insert({
      date,
      profile,
      repository
    }, (err, documents) => {
      if (err) return reject(err)

      return resolve(documents.ops[0])
    })
  })
}

Database.prototype.deleteScheduledTest = function (id) {
  return new Promise((resolve, reject) => {
    this.db.collection(config.get('database.reposCollection')).deleteOne({
      _id: id
    }, (err, results) => {
      if (err) return reject(err)

      return resolve(results)
    })
  })
}

Database.prototype.getScheduledTestForRepo = function (repository) {
  return new Promise((resolve, reject) => {
    this.db.collection(config.get('database.reposCollection')).findOne({
      repository: repository
    }, (err, document) => {
      if (err) return reject(err)

      return resolve(document)
    })
  })
}

Database.prototype.updateScheduledTest = function (id, newDate) {
  return new Promise((resolve, reject) => {
    this.db.collection(config.get('database.reposCollection')).update({
      _id: id
    },
    {
      $set: {
        date: newDate
      }
    }, (err, updatedDoc) => {
      if (err) return reject(err)

      return resolve(updatedDoc)
    })
  })
}

module.exports = Database
