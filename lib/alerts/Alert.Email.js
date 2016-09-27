'use strict'

const config = require(__dirname + '/../../config')
const SparkPost = require('sparkpost')
const utils = require(__dirname + '/../utils')

const Email = function (data) {
  this.api = new SparkPost(config.get('email.sparkboxApiKey'))
  this.data = data

  this.templates = {
    budget: require(__dirname + '/../../templates/email.budget.js')
  }
}

Email.prototype.send = function (templateName, infractors) {
  const recipients = this.data.schema.recipients.map(recipient => {
    return utils.decrypt(recipient, this.data.config._encryptionKey)
  })

  const template = this.templates[templateName]
  const email = template(infractors, this.data)

  return new Promise((resolve, reject) => {
    this.api.transmissions.send({
      transmissionBody: {
        content: {
          from: email.sender,
          subject: email.subject,
          html: email.body
        },
        recipients: recipients.map(recipient => {
          return {address: recipient}
        })
      }
    }, (err, res) => {
      if (err) return reject(err)

      return resolve(res)
    })
  })
}

module.exports = Email
