'use strict'

const config = require(__dirname + '/../config')
const Raygun = require('raygun')
const raygunClient = new Raygun.Client().init({
  apiKey: config.get('raygunApiKey')
})

const ErrorHandler = function () {

}

ErrorHandler.prototype.log = function (error) {
  if (!(error instanceof Error)) {
    error = new Error(error)
  }

  raygunClient.send(error)
}

module.exports = (() => {
  return new ErrorHandler()
})()
