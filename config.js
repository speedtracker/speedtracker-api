var convict = require('convict')

var conf = convict({
  env: {
    doc: 'The applicaton environment',
    format: ['production', 'development', 'test'],
    default: 'development',
    env: 'NODE_ENV'
  },
  port: {
    doc: 'The port to bind',
    format: 'port',
    default: 0,
    env: 'PORT'
  },
  wpt: {
    key: {
      doc: 'WPT API key',
      format: String,
      default: null,
      env: 'WPT_KEY'
    },
    url: {
      doc: 'WPT API URL',
      format: String,
      default: 'https://www.webpagetest.org',
      env: 'WPT_URL'
    }
  },
  githubToken: {
    doc: 'GitHub access token',
    format: String,
    default: null,
    env: 'GITHUB_TOKEN'
  },
  email: {
    sparkboxApiKey: {
      doc: 'Sparkbox API key',
      format: String,
      default: null,
      env: 'SPARKBOX_API_KEY'
    }
  },
  database: {
    uri: {
      doc: 'Mongo database connection URI',
      format: String,
      default: null,
      env: 'MONGODB_URI'
    },
    reposCollection: {
      doc: 'Name of the collection to be used for storing repositories',
      format: String,
      default: 'st_repos',
      env: 'COLLECTION_REPOS'
    }
  },
  scheduling: {
    checkInterval: {
      doc: 'Interval at which the Scheduler checks for tests to run (in milliseconds)',
      format: Number,
      default: 900000,
      env: 'SCHEDULING_CHECK_INTERVAL'
    },
    minimumInterval: {
      doc: 'Minimum interval allowed for scheduled tests (in hours)',
      format: Number,
      default: 12,
      env: 'SCHEDULING_MIN_INTERVAL'
    }
  },
  analytics: {
    googleAnalyticsId: {
      doc: 'Google Analytics account ID',
      format: String,
      default: null,
      env: 'GOOGLE_ANALYTICS_ID'
    }
  }
})

try {
  var env = conf.get('env')

  conf.loadFile(__dirname + '/config.' + env + '.json')
  conf.validate()

  console.log('(*) Local config file loaded')
} catch (e) {
  
}

module.exports = conf
