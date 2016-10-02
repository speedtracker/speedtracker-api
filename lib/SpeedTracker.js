'use strict'

const Alert = require('./Alert')
const Analytics = require('./Analytics')
const config = require(__dirname + '/../config')
const Database = require('./Database')
const fs = require('fs')
const objectPath = require('object-path')
const request = require('request')
const Utils = require('./utils')
const yaml = require('js-yaml')
const yamlFront = require('yaml-front-matter')
const WebPageTest = require('webpagetest')

const SpeedTracker = function (options) {
  this.options = options
}

SpeedTracker.prototype._buildResult = function (data) {
  let result = {
    breakdown: {},
    date: data.completed,
    domElements: data.average.firstView.domElements,
    domInteractive: data.average.firstView.domInteractive,
    firstPaint: data.average.firstView.firstPaint,
    fullyLoaded: data.average.firstView.fullyLoaded,
    id: data.id,
    loadTime: data.average.firstView.loadTime,
    render: data.average.firstView.render,
    SpeedIndex: data.average.firstView.SpeedIndex,
    TTFB: data.average.firstView.TTFB,
    videoFrames: data.runs[1].firstView.videoFrames.map(frame => {
      return {
        _t: frame.time,
        _vc: frame.VisuallyComplete
      }
    }),
    visualComplete: data.average.firstView.visualComplete
  }

  // Add content breakdown
  Object.keys(data.runs[1].firstView.breakdown).forEach((type) => {
    result.breakdown[type] = {
      bytes: data.runs[1].firstView.breakdown[type].bytes,
      requests: data.runs[1].firstView.breakdown[type].requests
    }
  })

  return Promise.resolve(result)
}

SpeedTracker.prototype._getRemoteFile = function (file) {
  return this.options.remote.api.repos.getContent({
    user: this.options.user,
    repo: this.options.repo,
    path: file,
    ref: this.options.branch
  }).then(response => {
    var content = new Buffer(response.content, 'base64').toString()

    return {
      content,
      sha: response.sha
    }
  })
}

SpeedTracker.prototype._processBudgets = function (profileData, result) {
  if (!profileData.budgets) return Promise.resolve(true)

  let infractorsByAlert = {}

  profileData.budgets.forEach(budget => {
    let value = objectPath.get(result, budget.metric)

    if (typeof value !== 'undefined') {
      let infractionType

      if ((typeof budget.max !== 'undefined') && value > budget.max) {
        infractionType = 'max'
      } else if ((typeof budget.min !== 'undefined') && value < budget.min) {
        infractionType = 'min'
      }

      if (infractionType) {
        budget.alerts.forEach(alertName => {
          infractorsByAlert[alertName] = infractorsByAlert[alertName] || []

          infractorsByAlert[alertName].push({
            limit: budget[infractionType],
            metric: budget.metric,
            value
          })
        })
      }
    }
  })

  // Send alerts
  Object.keys(infractorsByAlert).forEach(alertName => {
    this._sendAlert('budget', alertName, infractorsByAlert[alertName], {
      profile: profileData,
      result
    })
  })
}

SpeedTracker.prototype._processSchedule = function (profile, schedule) {
  const currentTime = new Date().getTime()

  if (schedule) {
    // Interval has been removed from profile, needs to be removed from database
    if (!profile.interval) {
      return this.options.scheduler.delete(schedule)
    }

    // Either the test has run at its time or the interval has been updated on the
    // profile and needs to be updated on the database
    if ((currentTime >= schedule.nextRun) || (profile.interval !== schedule.interval)) {
      return this.options.scheduler.update(profile, schedule)
    }

    return Promise.resolve(schedule.nextRun)
  } else if (profile.interval) {
    return this.options.scheduler.insert(profile, this.options.branch, this.options.key)
  }

  return Promise.resolve(null)
}

SpeedTracker.prototype._runWptTest = function (url, parameters) {
  return new Promise((resolve, reject) => {
    this.wpt.runTest(url, parameters, (err, response) => {
    //require('fs').readFile('result.json', (err, data) => {
    //    const response = JSON.parse(data)
      if (err) return reject(err)

      resolve(response)
    })
  })
}

SpeedTracker.prototype._saveTest = function (profile, content, isScheduled) {
  let date = new Date(content.date * 1000)
  let year = date.getFullYear()
  let month = Utils.padWithZeros(date.getMonth() + 1, 2)
  let day = Utils.padWithZeros(date.getDate(), 2)

  let path = `results/${profile}/${year}/${month}.json`

  let message = isScheduled ? 'Scheduled SpeedTracker test' : 'Add SpeedTracker test'

  return this._getRemoteFile(path).then(data => {
    try {
      let payload = JSON.parse(data.content)

      // Append timestamp
      payload._ts.push(content.date)

      // Append results
      Utils.mergeObject(payload._r, content)

      return this.options.remote.api.repos.updateFile({
        user: this.options.user,
        repo: this.options.repo,
        branch: this.options.branch,
        path: path,
        sha: data.sha,
        content: new Buffer(JSON.stringify(payload)).toString('base64'),
        message: message
      })
    } catch (err) {
      return Promise.reject(Utils.buildError('CORRUPT_RESULT_FILE'))
    }
  }).catch(err => {
    if (err.code === 404) {
      let payload = {
        _ts: [content.date],
        _r: {}
      }

      // Append results
      Utils.mergeObject(payload._r, content)

      return this.options.remote.api.repos.createFile({
        user: this.options.user,
        repo: this.options.repo,
        branch: this.options.branch,
        path: path,
        content: new Buffer(JSON.stringify(payload)).toString('base64'),
        message: message
      })      
    } else {
      return Promise.reject(Utils.buildError('CORRUPT_RESULT_FILE'))
    }
  })
}

SpeedTracker.prototype._sendAlert = function (type, name, infractors, data) {
  const schema = this.config.alerts[name]

  if (!schema) return

  const alert = new Alert({
    schema,
    config: this.config,
    profile: data.profile,
    result: data.result
  })

  return alert.send(type, infractors)
}

SpeedTracker.prototype.getConfig = function (force) {
  if (this.config && !force) {
    return Promise.resolve(this.config)
  }

  return this._getRemoteFile('speedtracker.yml').then(data => {
    try {
      var configFile = yaml.safeLoad(data.content, 'utf8')

      this.config = configFile

      // Inject site URL
      this.config._url = `http://${this.options.user}.github.io/${this.options.repo}`
      
      return configFile
    } catch (err) {
      return Promise.reject(Utils.buildError('INVALID_CONFIG'))
    }
  }).catch(err => {
    return Promise.reject(Utils.buildError('INVALID_CONFIG'))
  })
}

SpeedTracker.prototype.getProfile = function (profile) {
  let path = `_profiles/${profile}.html`

  return this._getRemoteFile(path).then(data => {
    let parsedFront = yamlFront.loadFront(data.content)
    
    // Delete body
    delete parsedFront.__content

    return parsedFront
  })
}

SpeedTracker.prototype.init = function () {
  return this.getConfig().then(config => {
    if (config.encryptionKey && (this.options.key === Utils.decrypt(config.encryptionKey, this.options.key))) {
      this.config._encryptionKey = this.options.key

      return true
    }

    return Promise.reject(Utils.buildError('AUTH_FAILED'))
  }).then(() => {
    return this.initWpt()
  })
}

SpeedTracker.prototype.initWpt = function () {
  let wptUrl = this.config.wptUrl || config.get('wpt.url')
  let wptKey = this.config.wptKey ? Utils.decrypt(this.config.wptKey, this.options.key) : config.get('wpt.key')

  this.wpt = new WebPageTest(wptUrl, wptKey)
}

SpeedTracker.prototype.runTest = function (profile, isScheduled) {
  let defaults = {
    connectivity: 'Cable',
    runs: 1,
  }

  let overrides = {
    firstViewOnly: true,
    pollResults: 5,
    video: true,
  }

  return this.init().then(() => {
    return this.getProfile(profile)
  }).then(profileData => {
    // Inject profile name
    profileData._id = profile

    // Inject GitHub NWO
    profileData._nwo = `${this.options.user}/${this.options.repo}`

    let parameters = Object.assign({}, defaults, profileData.parameters, overrides)

    if (!parameters.url) return Promise.reject('NO_URL')

    // Override WPT URL
    if (this.config.wptUrl) {
      parameters.server = this.config.wptUrl
    }    

    let url = parameters.url
    delete parameters.url

    return this.options.scheduler.find(profileData._nwo, profileData._id).then(schedule => {
      const runTest = !isScheduled || (profileData.interval && (profileData.interval === schedule.interval))

      if (runTest) {
        this._runWptTest(url, parameters).then(response => {
          this._buildResult(response.data).then(result => {
            // Save test
            this._saveTest(profile, result, isScheduled)

            // Process budgets
            this._processBudgets(profileData, result)
          })        
        })

        // Track event
        const userId = schedule && schedule._id
        const analytics = new Analytics(userId)

        analytics.track(Analytics.Events.RUN_TEST, {
          label: schedule ? 'Scheduled' : 'Manual'
        })
      }

      return this._processSchedule(profileData, schedule).then(nextRun => {
        const response = {
          success: runTest,
          nextRun
        }

        return response
      })
    })
  })
}

module.exports = SpeedTracker
