'use strict'

const config = require('./config')
const cors = require('cors')
const Database = require('./lib/Database')
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

server.get('/v1/test/:user/:repo/:branch/:profile', (req, res) => {
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
    console.log('** ERR:', err.stack || err)

    res.status(500).send(JSON.stringify(err))
  })
})

// ------------------------------------
// Endpoint: Connect
// ------------------------------------

server.get('/v1/connect/:user/:repo', (req, res) => {
  const github = new GitHub()

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
  }).then((response) => {
    res.send('OK!')
  }).catch((err) => {
    res.status(500).send('Invitation not found.')
  })  
})

process.on('unhandledRejection', (error, promise) => {
  console.log(error.stack || error)
})
