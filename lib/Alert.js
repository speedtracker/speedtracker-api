'use strict'

const Email = require('./alerts/Alert.Email')
const SlackWebhook = require('./alerts/Alert.SlackWebhook')
const Utils = require('./utils')
  
const Alert = function (data) {
  this.data = data

  switch (data.schema.type) {
    case 'email':
      this.handler = new Email(data)

      break

    case 'slack':
      this.handler = new SlackWebhook(data)

      break
  }
}

Alert.prototype.send = function (template, infractors) {
  return this.handler.send(template, infractors)
}

module.exports = Alert
