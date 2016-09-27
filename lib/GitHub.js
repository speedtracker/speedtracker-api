const GitHubApi = require('github')

const GitHub = function () {
  this.api = new GitHubApi({
    debug: (process.env.NODE_ENV !== 'production'),
    debug: false,
    protocol: 'https',
    host: 'api.github.com',
    pathPrefix: '',
    headers: {
      'user-agent': 'SpeedTracker agent'
    },
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
