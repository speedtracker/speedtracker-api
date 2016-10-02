'use strict'

const config = require(__dirname + '/../config')
const UniversalAnalytics = require('universal-analytics')

const events = {
  CONNECT: 'Repo connect',
  RUN_TEST: 'Run test'
}

const Analytics = function (id) {
  this.api = new UniversalAnalytics(config.get('analytics.googleAnalyticsId'), id)
}

Analytics.prototype.track = function (action, data) {
  let params = {
    ec: 'API',
    ea: action
  }

  if (data && data.label) {
    params.el = data.label
  }

  if (data && data.value) {
    params.ev = data.value
  }

  this.api.event(params).send()
}

module.exports = Analytics
module.exports.Events = events
