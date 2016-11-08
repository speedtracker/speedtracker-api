<img src="https://speedtracker.org/assets/images/logo-full-square-inverted.png" width="300">

# API

*SpeedTracker API*

---

[![npm version](https://badge.fury.io/js/speedtracker-api.svg)](https://badge.fury.io/js/speedtracker-api)

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)


---

## Running your own API

### Prerequisites

Steps 1 to 3 need to be taken from https://github.com/speedtracker/speedtracker#installation so you have a public Github version ready to be used to display performance data.
For configuration follow the chapters *Configuration* and *Configuration > Profiles* as described here https://speedtracker.org/docs.

Be sure to have `node` and `npm` installed.

### Installation

1. [Click here](https://www.webpagetest.org/getkey.php) to request a WebPageTest API key, if not done already.
1. Clone (or checkout) this repository in the location you want to run your API instance (`git clone git@github.com:speedtracker/speedtracker-api.git`).
1. Issue an `npm install` command at the location where you've cloned the speedtracker-api
1. Create a personal access token in your Github account (https://github.com/settings/tokens) under *Developer settings* > *Personal access tokens*
  - Be sure to check the option `public_repo`, since this is needed for the API to update and commit new performance data to your public GitHub version.
1. Be sure to have `mongodb` installed
1. Edit the main configuration file (`config.js`).
  - Define a port to run the API (default: 0, ie. 8080)
  - Paste your WebPageTest API key in the `default` field under *wpt* > *key*
  - Paste your Personal Github access token in the `default` field under *githubToken*
  - Define the mongodb database connection uri in the `default` field under *database* > *uri* (if `mongodb` was installed on localhost with default settings, the connection uri would look like this `mongodb://localhost:27017/speedtracker` whereas speedtracker would be the name of database to be created by the API)


### Run
Assuming you've done the above described installation on `localhost`, you should be able now to run your API instance.
Via a terminal go to the installation directory and issue the following command: `npm start`

With the server port you defined in the `config.js` file (ie. 8080), you should be able now to access the API via a browser: `http://localhost:8080`
If you see the following in your browser `{"success":false,"error":"INVALID_URL_OR_METHOD"}` the API is ready to be used. You'll see this message since we didn't supply the proper URL the API can work with to issue a WebPageTest.

Your API should work as described at https://speedtracker.org/docs#run, so in case of the localhost installed version the url would be
```
http://localhost:8080/v1/test/{USERNAME}/{REPOSITORY}/{BRANCH}/{PROFILE}?key={KEY}

```

---

## License

This project is licensed under the MIT license:

The MIT License (MIT)

Copyright (c) 2016 Eduardo Bouças

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
