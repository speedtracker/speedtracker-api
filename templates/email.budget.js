const constants = require(__dirname + '/../constants')
const objectPath = require('object-path')
const utils = require(__dirname + '/../lib/utils')

const email = (infractors, data) => {
  const body = `
    Hello,<br>
    <br>
    The latest performance report on <a href="${data.config._url}/${data.profile._id}">${data.profile.name}</a> showed some performance metrics going over their configured budgets:<br>
    <br>
    <ul>
    ${infractors.map(infractor => {
      const comparisonSign = infractor.value > infractor.limit ? '>' : '<'
      const metric = objectPath.get(constants.metrics, infractor.metric)
      
      return `<li><strong>${metric.name}</strong>: ${utils.formatMetric(infractor.metric, infractor.value)} (${comparisonSign} ${utils.formatMetric(infractor.metric, infractor.limit)})</strong>`
    }).join('')}
    </ul>
    <br>
    <a href="${data.config._url}/${data.profile._id}">Click here</a> to see the full report.<br>
    <br>
    ---
    <br>
    <a href="https://speedtracker.org">SpeedTracker</a>
    `

  return {
    body,
    sender: 'SpeedTracker <noreply@speedtracker.org>',
    subject: `Performance report for ${data.profile.name}`
  }
}

module.exports = email
