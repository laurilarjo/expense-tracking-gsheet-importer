"use client"

//import { google, sheets_v4 } from 'googleapis'
import { useEffect } from "react"
import { OAUTH_CALLBACK_KEY } from "../../../config"

// TODO(developer): Set to client ID and API key from the Developer Console
const CLIENT_ID =
  "800525699041-v2t7lqcpt0flj9aaufojs3p7r1ijl6qn.apps.googleusercontent.com"
const SPREADSHEET_ID = "10ijm3mNHniJWrTzfgx5-sgqg-PRgViB3Wms-YSNGLdo"
// Discovery doc URL for APIs used by the quickstart
const DISCOVERY_DOC = "https://sheets.googleapis.com/$discovery/rest?version=v4"

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
const SCOPES = "https://www.googleapis.com/auth/spreadsheets.readonly"

let tokenClient
let access_token: string | null

/*
function start() {
  // 2. Initialize the JavaScript client library.
  console.log("start");
  if (gapi.client.getToken() === null) {
    // Prompt the user to select a Google Account and ask for consent to share their data
    // when establishing a new session.
    tokenClient.requestAccessToken({prompt: 'consent'});
  } else {
    // Skip display of account chooser and consent dialog for an existing session.
    tokenClient.requestAccessToken({prompt: ''});
  }
  console.log("got token")
  
  gapi.client.init({
    apiKey: API_KEY,
    // clientId and scope are optional if auth is not required.
    discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
    clientId: CLIENT_ID,
    scope: SCOPES,
  }).then(function() {
    // 3. Initialize and make the API request.
    return gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A1:B5'
    });
  }, function(error) {
    console.log('Error initialising the google sheets api', error);
  }).then(function(response) {
    console.log(response.result);
  }, function(reason) {
    console.log('Error: ' + reason.result.error.message);
  });
};

*/

function gapiStart() {
  gapi.client
    .init({
      // apiKey: API_KEY,
    })
    .then(function () {
      // if (access_token) {
      //   gapi.auth.setToken({ access_token: access_token })
      // }
      gapi.client.load("sheets", "v4")
    })
    .then(
      function (response) {
        console.dir(response)
        console.log("discovery document loaded")
      },
      function (reason) {
        console.log("Error: " + reason.result.error.message)
      }
    )
}

function login() {
  const existingToken = localStorage.getItem(OAUTH_CALLBACK_KEY)
  if (existingToken) {
    const { accessToken } = JSON.parse(existingToken)
    // gapi.client.setToken({ access_token: accessToken })
    gapi.auth.setToken({ access_token: accessToken })
    return
  }

  // if (gapi.client.getToken() === null) {
  //   // Prompt the user to select a Google Account and ask for consent to share their data
  //   // when establishing a new session.
  //   tokenClient.requestAccessToken({ prompt: "consent" })
  // } else {
  //   // Skip display of account chooser and consent dialog for an existing session.
  //   tokenClient.requestAccessToken({ prompt: "" })
  // }
  // console.log("got token")
}

function listMajors() {
  gapi.client.sheets.spreadsheets.values
    .get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Sheet1!A1:B5",
    })
    .then(function (response) {
      var range = response.result
      console.log(range)
    })
}

const ViewTransactions = () => {
  useEffect(() => {
    // tokenClient = google.accounts.oauth2.initTokenClient({
    //   client_id: CLIENT_ID,
    //   scope: SCOPES,
    //   callback: (tokenResponse: unknown) => {
    //     console.dir(tokenResponse)
    //     access_token = tokenResponse.access_token
    //   },
    // })
    gapi.load("client", gapiStart)
  }, [])
  return (
    <>
      <button onClick={() => login()}>Login</button>
      <button onClick={() => listMajors()}>Call Sheets API</button>
    </>
  )
}

export default ViewTransactions
