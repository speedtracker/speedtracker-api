'use strict'

const config = require(__dirname + '/../config')
const ErrorHandler = require('./lib/ErrorHandler')
const SpeedTracker = require(__dirname + '/SpeedTracker')

const Scheduler = function (options) {
  this.db = options.db
  this.remote = options.remote

  this.timer = setInterval(() => {
    this._checkTests()
  }, config.get('scheduling.checkInterval'))

  this._checkTests()
}

Scheduler.prototype._checkTests = function () {
  const currentTime = new Date().getTime()

  this.db.collection(config.get('database.reposCollection')).find({
    nextRun: {
      $lte: currentTime
    }
  }).each((err, doc) => {
    if (doc) {
      const nwo = doc.repository.split('/')

      const speedtracker = new SpeedTracker({
        db: this.db,
        branch: doc.branch,
        key: doc.key,
        remote: this.remote,
        repo: nwo[1],
        scheduler: this,
        user: nwo[0]
      })

      speedtracker.runTest(doc.profile, true).catch(err => {
        ErrorHandler.log(`Deleting failed scheduled test with id ${doc._id}...`)

        this.delete(doc)
      })
    }
  })
}

Scheduler.prototype._getNextRun = function (profile) {
  const currentTime = new Date().getTime()
  const interval = Math.max(profile.interval, config.get('scheduling.minimumInterval'))
  const nextRun = currentTime + (interval * 3600000)

  return nextRun
}

Scheduler.prototype.delete = function (schedule) {
  return new Promise((resolve, reject) => {
    this.db.collection(config.get('database.reposCollection')).deleteOne({
      _id: schedule._id
    }, (err, results) => {
      if (err) return reject(err)

      return resolve(null)
    })
  })
}

Scheduler.prototype.find = function (repository, profile) {
  return new Promise((resolve, reject) => {
    this.db.collection(config.get('database.reposCollection')).findOne({
      profile,
      repository
    }, (err, document) => {
      if (err) return reject(err)

      return resolve(document)
    })    
  })
}

Scheduler.prototype.insert = function (profile, branch, key) {
  const nextRun = this._getNextRun(profile)

  return new Promise((resolve, reject) => {
    this.db.collection(config.get('database.reposCollection')).insert({
      branch,
      interval: profile.interval,
      key,
      nextRun,
      profile: profile._id,
      repository: profile._nwo,
    }, (err, documents) => {
      if (err) return reject(err)

      return resolve(nextRun)
    })
  })
}

Scheduler.prototype.update = function (profile, schedule) {
  const nextRun = this._getNextRun(profile)

  return new Promise((resolve, reject) => {
    this.db.collection(config.get('database.reposCollection')).update({
      _id: schedule._id
    },
    {
      $set: {
        interval: profile.interval,
        nextRun
      }
    }, (err, data) => {
      if (err) return reject(err)

      return resolve(nextRun)
    })
  })
}

module.exports = Scheduler
