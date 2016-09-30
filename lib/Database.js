'use strict'

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
    collection.createIndex({'repository': 1, 'profile': 1}, null, (err, results) => {
      if (err) throw err

      if (typeof callback === 'function') {
        callback(this.db)
      }
    })
  })
}

module.exports = Database
