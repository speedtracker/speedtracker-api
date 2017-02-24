'use strict'

const Analytics = require('./lib/Analytics')
const config = require('./config')
const cors = require('cors')
const crypto = require('crypto')
const Database = require('./lib/Database')
const ErrorHandler = require('./lib/ErrorHandler')
const express = require('express')
const GitHub = require('./lib/GitHub')
const Scheduler = require('./lib/Scheduler')
const SpeedTracker = require('./lib/SpeedTracker')

// ------------------------------------
// Server
// ------------------------------------

const server = express()

server.use(cors())

// ------------------------------------
// Scheduler
// ------------------------------------

let scheduler

// ------------------------------------
// GitHub
// ------------------------------------

const github = new GitHub()

github.authenticate(config.get('githubToken'))

// ------------------------------------
// DB connection
// ------------------------------------

let db = new Database(connection => {
  console.log('(*) Established database connection')

  server.listen(config.get('port'), () => {
    console.log(`(*) Server listening on port ${config.get('port')}`)
  })

  scheduler = new Scheduler({
    db: connection,
    remote: github
  })
})

// ------------------------------------
// Endpoint: Test
// ------------------------------------

const testHandler = (req, res) => {
  const blockList = config.get('blockList').split(',')

  // Abort if user is blocked
  if (blockList.indexOf(req.params.user) !== -1) {
    ErrorHandler.log(`Request blocked for user ${req.params.user}`)
    
    const template = require(__dirname + '/templates/blocklist.status.js')
    const blockListTemplate = template(req)

    return res.status(blockListTemplate.statusCode).send(blockListTemplate.body)
  }

  const speedtracker = new SpeedTracker({
    db,
    branch: req.params.branch,
    key: req.query.key,
    remote: github,
    repo: req.params.repo,
    scheduler,
    user: req.params.user
  })

  let profileName = req.params.profile

  speedtracker.runTest(profileName).then(response => {
    res.send(JSON.stringify(response))
  }).catch(err => {
    ErrorHandler.log(err)

    res.status(500).send(JSON.stringify(err))
  })
}

server.get('/v1/test/:user/:repo/:branch/:profile', testHandler)
server.post('/v1/test/:user/:repo/:branch/:profile', testHandler)

// ------------------------------------
// Endpoint: Connect
// ------------------------------------

server.get('/v1/connect/:user/:repo', (req, res) => {
  const github = new GitHub(GitHub.GITHUB_CONNECT)

  github.authenticate(config.get('githubToken'))

  github.api.users.getRepoInvites({}).then(response => {
    let invitationId
    let invitation = response.some(invitation => {
      if (invitation.repository.full_name === (req.params.user + '/' + req.params.repo)) {
        invitationId = invitation.id

        return true
      }
    })

    if (invitation) {
      return github.api.users.acceptRepoInvite({
        id: invitationId
      })        
    } else {
      return Promise.reject()
    }
  }).then(response => {
    // Track event
    new Analytics().track(Analytics.Events.CONNECT)

    res.send('OK!')
  }).catch(err => {
    ErrorHandler.log(err)

    res.status(500).send('Invitation not found.')
  })  
})

// ------------------------------------
// Endpoint: Encrypt
// ------------------------------------

server.get('/encrypt/:key/:text?', (req, res) => {
  const key = req.params.key
  const text = req.params.text || req.params.key

  const cipher = crypto.createCipher('aes-256-ctr', key)
  let encrypted = cipher.update(decodeURIComponent(text), 'utf8', 'hex')

  encrypted += cipher.final('hex')

  res.send(encrypted)
})

// ------------------------------------
// Endpoint: Decrypt
// ------------------------------------

server.get('/decrypt/:key/:text?', (req, res) => {
  const decipher = crypto.createDecipher('aes-256-ctr', req.params.key)
  let decrypted = decipher.update(req.params.text, 'hex', 'utf8')

  decrypted += decipher.final('utf8')

  res.send(decrypted)
})

// ------------------------------------
// Endpoint: Catch all
// ------------------------------------

server.all('*', (req, res) => {
  const response = {
    success: false,
    error: 'INVALID_URL_OR_METHOD'
  }

  res.status(404).send(JSON.stringify(response))
})

// ------------------------------------
// Basic error logging
// ------------------------------------

process.on('unhandledRejection', (reason, promise) => {
  if (reason) {
    ErrorHandler.log(reason)  
  }
})
