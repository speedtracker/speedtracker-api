<img src="https://speedtracker.org/assets/images/logo-full-square-inverted.png" width="300">

# API

*SpeedTracker API*

---

[![npm version](https://badge.fury.io/js/speedtracker-api.svg)](https://badge.fury.io/js/speedtracker-api)

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

---

## Running your own API

### Pre-requisites

First, you need to install a SpeedTracker dashboard by following steps 1 to 3 from [the SpeedTracker documentation page](https://speedtracker.org/docs).
For configuration, follow the [*Configuration*](https://speedtracker.org/docs#configuration) and [*Configuration > Profiles*](https://speedtracker.org/docs#profiles) sections.

You need to install [Node.js](https://nodejs.org/en/), `npm` and [MongoDB](https://www.mongodb.com/).

### Installation

1. Clone this repository in the location you want to run your API instance

  ```
  git clone git@github.com:speedtracker/speedtracker-api.git
  cd speedtracker-api
  ```

1. Run `npm install`

1. Create a [personal access token](https://help.github.com/articles/creating-an-access-token-for-command-line-use/) in your GitHub account  under *Settings* > *Personal access tokens*
  - Be sure to check the option `public_repo`, since this is needed for the API to update and commit new performance data to your public GitHub version.

1. Create a file called `config.{ENVIRONMENT}.json` (e.g. `config.development.json`) with the following structure:

  ```json
  {
    "port": 1234, // The port to run the API on (e.g. 8080)
    "wpt": {
      "key": "abcdefg" // Your WebPageTest API key
    },
    "githubToken": "abcdefg" // Your GitHub personal access token,
    "database": {
      "uri": "mongodb://localhost:27017/speedtracker" // MongoDB database connection URI
    }
  }
  ```


### Run

The API instance is ready to run. Run `npm start` and, assuming you've followed the steps above on your local machine, you can access your API on `http://localhost:8080` (or whatever port you chose).

If you see the `{"success":false,"error":"INVALID_URL_OR_METHOD"}` in your browser, the API is ready to be used. You'll see this message since we didn't supply the full URL the API needs to run a test. To do that, go to:

```
http://localhost:8080/v1/test/{USERNAME}/{REPOSITORY}/{BRANCH}/{PROFILE}?key={KEY}
```

And check [the documentation page](https://speedtracker.org/docs#run) for more information.

---

## License

This project is licensed under the MIT license:

The MIT License (MIT)

Copyright (c) 2017 Eduardo Bouças

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
