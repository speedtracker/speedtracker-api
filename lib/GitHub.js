'use strict'

//const GitHubApi = require('github')
const GitHubApi = require('@octokit/rest') // keeping const "GitHubApi" for context

const GITHUB_CONNECT = 1

const GitHub = function (type) {
  let headers = {
    'user-agent': 'SpeedTracker agent'
  }

  switch (type) {
    case GITHUB_CONNECT:
      headers['Accept'] = 'application/vnd.github.swamp-thing-preview+json'

      break
  }

  this.api = new GitHubApi({
    debug: (process.env.NODE_ENV !== 'production'),
    debug: false,
    protocol: 'https',
    host: 'api.github.com',
    pathPrefix: '',
    headers,
    timeout: 5000,
    Promise: Promise
  })
}

GitHub.prototype.authenticate = function (token) {
  this.api.authenticate({
    type: 'oauth',
    token: token
  })

  return this
}

module.exports = GitHub

module.exports.GITHUB_CONNECT = GITHUB_CONNECT
