'use strict'

const config = require(__dirname + '/../config')
const Raygun = require('raygun')

const ErrorHandler = function () {
  if (config.get('raygunApiKey')) {
    this.client = new Raygun.Client().init({
      apiKey: config.get('raygunApiKey')
    })
  }
}

ErrorHandler.prototype.log = function (error) {
  console.log(error)

  if (!(error instanceof Error)) {
    error = new Error(error)
  }

  this.client.send(error)
}

module.exports = (() => {
  return new ErrorHandler()
})()
