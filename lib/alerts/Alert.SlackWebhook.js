'use strict'

const constants = require(__dirname + '/../../constants')
const config = require(__dirname + '/../../config')
const objectPath = require('object-path')
const SlackWebhookAPI = require('@slack/client').IncomingWebhook
const utils = require(__dirname + '/../utils')

const SlackWebhook = function (data) {
  this.data = data
}

SlackWebhook.prototype._getBudgetTemplate = function (infractors) {
  const payload = {
    text: `The latest performance report on *${this.data.profile.name}* showed some performance metrics going over their budget:`,
    attachments: [
      {
        fallback: 'SpeedTracker performance report',
        color: 'warning',
        title: 'SpeedTracker - View report',
        title_link: this.data.config._url || 'https://speedtracker.org',
        fields: infractors.map(infractor => {
          const comparisonSign = infractor.value > infractor.limit ? '>' : '<'
          const metric = objectPath.get(constants.metrics, infractor.metric)
          const title = (metric && metric.name) || infractor.metric

          return {
            title,
            value: `${utils.formatMetric(infractor.metric, infractor.value)} (${comparisonSign} ${utils.formatMetric(infractor.metric, infractor.limit)})`,
            short: 'false'
          }
        }),
        footer: 'SpeedTracker',
        footer_icon: 'https://speedtracker.org/assets/images/logo-square-inverted-128.png'
      }
    ]
  }

  return payload
}

SlackWebhook.prototype.send = function (template, infractors) {
  if (!this.data.schema.hookUrl) return

  const url = utils.decrypt(this.data.schema.hookUrl, this.data.config._encryptionKey)

  const api = new SlackWebhookAPI(url)

  let payload

  switch (template) {
    case 'budget':
      payload = this._getBudgetTemplate(infractors)

      break
  }

  if (this.data.schema.channel) {
    payload.channel = this.data.schema.channel
  }

  if (this.data.schema.username) {
    payload.username = this.data.schema.username
  }

  if (this.data.schema.iconEmoji) {
    payload.iconEmoji = this.data.schema.iconEmoji
  }

  api.send(payload)
}

module.exports = SlackWebhook
