const utils = require(__dirname + '/../lib/utils')

const blocklist = (req) => {
  const body = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>403 Forbidden!</title>
        <style>
            header {
                width: 100%;
                height: 100px;
                background-color: #CB4C3D;
                color: white;
                text-align: center;
                display: -webkit-box;
                display: -ms-flexbox;
                display: flex;
                -webkit-box-pack: center;
                  -ms-flex-pack: center;
                      justify-content: center;
                -webkit-box-align: center;
                  -ms-flex-align: center;
                      align-items: center;
            }

            code {
                font-weight: bold;
                font-style: italic;
                background-color: #EFF0F1;
            }
        </style>
      </head>
      <body>
        <main>
          <header>
            <h1>ERROR 403 - Forbidden!</h1>
          </header>
          <section>
            <h2>The following error occurrred:</h2>
            <p>Requests for user <code>${req.params.user}</code> are blocked.</p>
            <hr>
            <p>If you believe this is an error or would like to dispute this block then contact: <a href="mailto:abuse@speedtracker.org">abuse@speedtracker.org</a></p>
          </section>
        </main>
      </body>
    </html>
    `

  return {
    body,
    statusCode: 403
  }
}

module.exports = blocklist
