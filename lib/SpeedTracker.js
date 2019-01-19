'use strict'

const Alert = require('./Alert')
const Analytics = require('./Analytics')
const config = require(__dirname + '/../config')
const Database = require('./Database')
const fs = require('fs')
const objectPath = require('object-path')
const request = require('request-promise')
const url = require('url')
const Utils = require('./utils')
const yaml = require('js-yaml')
const yamlFront = require('yaml-front-matter')
const WebPageTest = require('webpagetest')

const SpeedTracker = function (options) {
  this.options = options
}

SpeedTracker.prototype._buildResult = function (data) {
  const pagespeed = data.pagespeed
  const wpt = data.wpt

  let result = {
    breakdown: {},
    date: wpt.completed,
    domElements: wpt.average.firstView.domElements,
    domInteractive: wpt.average.firstView.domInteractive,
    firstPaint: wpt.average.firstView.firstPaint,
    fullyLoaded: wpt.average.firstView.fullyLoaded,
    id: wpt.id,
    loadTime: wpt.average.firstView.loadTime,
    render: wpt.average.firstView.render,
    SpeedIndex: wpt.average.firstView.SpeedIndex,
    TTFB: wpt.average.firstView.TTFB,
    videoFrames: wpt.runs[1].firstView.videoFrames.map(frame => {
      const frameUrl = url.parse(frame.image, true)

      return {
        _i: frameUrl.query.file,
        _t: frame.time,
        _vc: frame.VisuallyComplete
      }
    }),
    visualComplete: wpt.average.firstView.visualComplete
  }

  // Add Lighthouse score
  const lighthouseScore = wpt.average.firstView['lighthouse.ProgressiveWebApp']

  result.lighthouse = typeof lighthouseScore !== 'undefined'
    ? Math.floor(lighthouseScore * 100)
    : null

  // Add content breakdown
  Object.keys(wpt.runs[1].firstView.breakdown).forEach((type) => {
    result.breakdown[type] = {
      bytes: wpt.runs[1].firstView.breakdown[type].bytes,
      requests: wpt.runs[1].firstView.breakdown[type].requests
    }
  })

  // Add PageSpeed score
  result.pagespeed = pagespeed

  return Promise.resolve(result)
}

SpeedTracker.prototype._getPagespeedScore = function (url) {
  const apiKey = config.get('pagespeedApiKey')

  if (!apiKey.length) {
    return Promise.resolve(null)
  }

  const encodedUrl = encodeURIComponent(url)
  const pagespeedUrl = `https://www.googleapis.com/pagespeedonline/v2/runPagespeed?url=${encodedUrl}&key=${apiKey}`

  return request(pagespeedUrl).then(response => {
    try {
      const parsedResponse = JSON.parse(response)

      return parsedResponse.ruleGroups.SPEED.score
    } catch (err) {
      return Promise.resolve(null)
    }
  }).catch(err => {
    return Promise.resolve(null)
  })
}

SpeedTracker.prototype._getRemoteFile = function (file) {
  return this.options.remote.api.repos.getContents({
    owner: this.options.user,
    repo: this.options.repo,
    path: file,
    ref: this.options.branch
  }).then(response => {
    var content = new Buffer.from(response.data.content, 'base64').toString()

    return {
      content,
      sha: response.data.sha
    }
  })
}

SpeedTracker.prototype._processBudgets = function (profileData, result) {
  if (!profileData.budgets || !(profileData.budgets instanceof Array)) {
    return Promise.resolve(true)
  }

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

      if (infractionType && (budget.alerts instanceof Array)) {
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

SpeedTracker.prototype._runWptTest = function (url, parameters, callback) {
  return new Promise((resolve, reject) => {
    const wptResult = this.wpt.runTest(url, parameters, (err, response) => {
      if (err) return reject(err)

      if (!response.statusCode || (response.statusCode !== 200)) {
        return reject(response)
      }

      const interval = setInterval(() => {
        this.wpt.getTestResults(response.data.testId, (err, results) => {
          // Check for errors
          if (err || (results.statusCode >= 300)) {
            return clearInterval(interval)
          }

          // Check for completion
          if ((results.statusCode >= 200) && (results.statusCode < 300)) {
            clearInterval(interval)

            return callback(results)
          }
        })
      }, 15000)

      return resolve(response)
    })
  })
}

SpeedTracker.prototype._saveTest = function (profile, content, isScheduled) {
  const date = new Date(content.date * 1000)
  const year = date.getFullYear()
  const month = Utils.padWithZeros(date.getMonth() + 1, 2)
  const day = Utils.padWithZeros(date.getDate(), 2)

  const path = `results/${profile}/${year}/${month}.json`

  const message = `Add SpeedTracker test (${isScheduled ? 'scheduled' : 'manual'})`

  return this._getRemoteFile(path).then(data => {
    try {
      let payload = JSON.parse(data.content)

      // Append timestamp
      payload._ts.push(content.date)

      // Append results
      Utils.mergeObject(payload._r, content, payload._ts.length)
      
      return this.options.remote.api.repos.updateFile({
        owner: this.options.user,
        repo: this.options.repo,
        branch: this.options.branch,
        path: path,
        sha: data.sha,
        content: new Buffer.from(JSON.stringify(payload)).toString('base64'),
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
        owner: this.options.user,
        repo: this.options.repo,
        branch: this.options.branch,
        path: path,
        content: new Buffer.from(JSON.stringify(payload)).toString('base64'),
        message: message
      })      
    } else {
      return Promise.reject(Utils.buildError('CORRUPT_RESULT_FILE_ERR2'))
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

SpeedTracker.prototype.initConfig = function () {
  return this.getConfig().then(config => {
    if (config.encryptionKey && (this.options.key === Utils.decrypt(config.encryptionKey, this.options.key))) {
      this.config._encryptionKey = this.options.key

      return this.config
    }

    return Promise.reject(Utils.buildError('AUTH_FAILED'))
  })
}

SpeedTracker.prototype.initWpt = function (profile) {
  let wptUrl = this.config.wptUrl ? Utils.decrypt(this.config.wptUrl, this.options.key) : config.get('wpt.url')
  let wptKey = this.config.wptKey ? Utils.decrypt(this.config.wptKey, this.options.key) : config.get('wpt.key')

  // If a wptUrl is defined at a profile level, it overrides the instance and
  // site configs.
  if (profile.wptUrl) {
    wptUrl = profile.wptUrl.startsWith('http')
      ? profile.wptUrl
      : Utils.decrypt(profile.wptUrl, this.options.key)
  }

  this.wpt = new WebPageTest(wptUrl, wptKey)
  this.wptUrl = wptUrl
}

SpeedTracker.prototype.runTest = function (profile, isScheduled) {
  let defaults = {
    connectivity: 'Cable',
    lighthouse: true,
    firstViewOnly: true,
    runs: 1,
  }

  let overrides = {
    video: true
  }

  return this.initConfig().then(() => {
    return this.getProfile(profile)
  }).then(profile => {
    this.initWpt(profile)

    return Promise.resolve(profile)
  }).then(profileData => {
    // Inject profile name
    profileData._id = profile

    // Inject GitHub NWO
    profileData._nwo = `${this.options.user}/${this.options.repo}`

    let parameters = Object.assign({}, defaults, profileData.parameters, overrides)

    if (!parameters.url) return Promise.reject('NO_URL')

    let url = parameters.url.trim()

    if (!url.startsWith('http')) {
      url = Utils.decrypt(parameters.url, this.options.key)
    }

    delete parameters.url

    return this.options.scheduler.find(profileData._nwo, profileData._id).then(schedule => {
      const runTest = !isScheduled || (profileData.interval && (profileData.interval === schedule.interval))

      let testJob = Promise.resolve({})

      if (runTest) {
        testJob = this._runWptTest(url, parameters, wpt => {
          return this._getPagespeedScore(url).then(score => {
            return this._buildResult({
              pagespeed: score,
              wpt: wpt.data
            }).then(result => {
              // Save test
              this._saveTest(profile, result, isScheduled)

              // Process budgets
              this._processBudgets(profileData, result)
            })
          })
        })

        // Track event
        const userId = schedule && schedule._id
        const analytics = new Analytics(userId)

        analytics.track(Analytics.Events.RUN_TEST, {
          label: schedule ? 'Scheduled' : 'Manual'
        })
      }

      return testJob.then(testResult => {
        return this._processSchedule(profileData, schedule).then(nextRun => {
          let response = {
            success: runTest,
            nextRun
          }

          if (testResult.data && testResult.data.testId) {
            response.testId = testResult.data.testId
          }

          return response
        })
      }).catch(err => {
        return Promise.reject(Utils.buildError('WPT_ERROR', err.statusText))
      })
    })
  })
}

module.exports = SpeedTracker
