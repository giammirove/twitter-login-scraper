import fetch from "node-fetch";
import https from 'https';
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import fs from "fs";
import cryptoall from "crypto";
const crypto = cryptoall.webcrypto;
import promptly from "promptly";
import jsdom from "jsdom";
const { JSDOM } = jsdom;
const { window } = new JSDOM(``, { runScripts: "outside-only" });

const FOLLOWING = "Following";
const FOLLOWERS = "Followers";
// todo : generalize those two
const FOLLOWING_CODE = "KEnSg91tBErLrKtuMppCzQ";
const FOLLOWERS_CODE = "kinZjqayUDKefGgrJxu7Tg";
const FILENAME = "users.json";
const DIR = "users_data";

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

// yes twitter hardcoded this one in main.xxxxx.js
let bearer =
  "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";
let auth_token = "";
let csrf_token = "";
let guest_token = "";
let att = "";
let cookie = "";

async function Main() {
  await ask_login();
  yargs(hideBin(process.argv))
    .command(
      "followers",
      "Find all the followers",
      {
        username: {
          description: "Username of the user to scrape",
          type: "string",
          alias: "u",
        },
        user_id: {
          description: "User id of the user to scrape",
          type: "Number",
          alias: "i",
        },
      },
      (argv) => {
        if (argv.user_id) {
          scrape_followers(argv.user_id);
        } else if (argv.username) {
          scrape_followers_by_name(argv.username);
        } else {
          console.log("[x] User id or username not inserted (run --help)");
        }
      }
    )
    .command(
      "following",
      "Find all the following",
      {
        username: {
          description: "Username of the user to scrape",
          type: "string",
          alias: "u",
        },
        user_id: {
          description: "User id of the user to scrape",
          type: "Number",
          alias: "i",
        },
      },
      (argv) => {
        if (argv.user_id) {
          scrape_following(argv.user_id);
        } else if (argv.username) {
          scrape_following_by_name(argv.username);
        } else {
          console.log("[x] User id or username not inserted (run --help)");
        }
      }
    )
    .demandCommand(1)
    .strictCommands()
    .parse();
}

function get_headers() {
  return {
    "X-Twitter-Client-Language": "en",
    "X-Csrf-Token": csrf_token,
    "Sec-Ch-Ua-Mobile": "?0",
    Authorization: `Bearer ${bearer}`,
    "Content-Type": "application/json",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36",
    "X-Guest-Token": guest_token,
    "X-Twitter-Active-User": "yes",
    Accept: "*/*",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Dest": "empty",
    "Accept-Encoding": "gzip, deflate",
    "Accept-Language": "en-US,en;q=0.9",
  };
}

function get_login_headers() {
  return {
    "accept": "*/*",
    "accept-language": "en-US,en;q=0.9",
    "authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
    "cache-control": "no-cache",
    "content-type": "application/json",
    "pragma": "no-cache",
    "sec-ch-ua": "\"Not?A_Brand\";v=\"8\", \"Chromium\";v=\"108\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"Linux\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-site",
    "x-csrf-token": csrf_token,
    "x-guest-token": guest_token,
    "cookie": att,
    "x-twitter-active-user": "yes",
    "x-twitter-client-language": "en",
    "Referer": "https://twitter.com/",
    "Referrer-Policy": "strict-origin-when-cross-origin"
  }

}


function get_agent() {
  let opts = get_headers();
  opts.rejectUnauthorized = false;
  const ha = new https.Agent(opts);
  return ha;
}


async function login(username, password) {
  try {
    console.log(`[-] Trying to login as ${username}`);
    csrf_token = generate_csrf();
    guest_token = await get_guest_token(csrf_token);
    let first_res = await fetch(
      "https://api.twitter.com/1.1/onboarding/task.json?flow_name=login",
      {
        method: "POST",
        headers: get_login_headers(),
        body:
          JSON.stringify({ "input_flow_data": { "flow_context": { "debug_overrides": {}, "start_location": { "location": "unknown" } } }, "subtask_versions": { "action_list": 2, "alert_dialog": 1, "app_download_cta": 1, "check_logged_in_account": 1, "choice_selection": 3, "contacts_live_sync_permission_prompt": 0, "cta": 7, "email_verification": 2, "end_flow": 1, "enter_date": 1, "enter_email": 2, "enter_password": 5, "enter_phone": 2, "enter_recaptcha": 1, "enter_text": 5, "enter_username": 2, "generic_urt": 3, "in_app_notification": 1, "interest_picker": 3, "js_instrumentation": 1, "menu_dialog": 1, "notifications_permission_prompt": 2, "open_account": 2, "open_home_timeline": 1, "open_link": 1, "phone_verification": 4, "privacy_options": 1, "security_key": 3, "select_avatar": 4, "select_banner": 2, "settings_list": 7, "show_code": 1, "sign_up": 2, "sign_up_review": 4, "tweet_selection_urt": 1, "update_users": 1, "upload_media": 1, "user_recommendations_list": 4, "user_recommendations_urt": 1, "wait_spinner": 3, "web_modal": 1 } })
        ,
      },
    );
    att = /att=.*?;/gm.exec(
      first_res.headers.get("set-cookie")
    )[0];
    let data = await first_res.json();
    // console.log(1, data);
    let flow_token = data.flow_token;
    let jsins_url = data.subtasks[0].js_instrumentation.url;

    let second_res = await fetch(jsins_url);
    let jsins_source = await second_res.text();
    var jsins_func = /function .*\(\) \{var.*?\n /gm.exec(jsins_source);
    var jsins_func_name = /function (.*?) /gm.exec(jsins_func)[1];
    jsins_func += "; " + jsins_func_name;
    let jsins_response = window.eval(jsins_func);

    let third_res = await
      fetch("https://api.twitter.com/1.1/onboarding/task.json", {
        "headers": get_login_headers(),
        body: JSON.stringify({
          flow_token: flow_token,
          subtask_inputs: [
            {
              subtask_id: "LoginJsInstrumentationSubtask",
              js_instrumentation: {
                response: JSON.stringify(jsins_response),
                link: "next_link",
              },
            },
          ],
        }),
        "method": "POST"
      });
    data = await third_res.json();
    flow_token = data.flow_token;
    // console.log(3, data)

    let fourth_res = await fetch(
      "https://twitter.com/i/api/1.1/onboarding/task.json",
      {
        method: "POST",
        headers: get_login_headers(),
        body: JSON.stringify({
          flow_token: flow_token,
          subtask_inputs: [
            {
              subtask_id: "LoginEnterUserIdentifierSSO",
              settings_list: {
                setting_responses: [
                  {
                    key: "user_identifier",
                    response_data: {
                      text_data: {
                        result: username,
                      },
                    },
                  },
                ],
                link: "next_link",
              },
            },
          ],
        }),
      }
    );
    data = await fourth_res.json();
    // console.log(4, data)
    flow_token = data.flow_token;

    let fifth_res = await fetch(
      "https://twitter.com/i/api/1.1/onboarding/task.json",
      {
        method: "POST",
        headers: get_login_headers(),
        body: JSON.stringify({
          flow_token: flow_token,
          subtask_inputs: [
            {
              subtask_id: "LoginEnterPassword",
              enter_password: {
                password: password,
                link: "next_link",
              },
            },
          ],
        }),
      }
    );
    data = await fifth_res.json();
    flow_token = data.flow_token;
    // console.log(5, data);

    let sixth_res = await fetch(
      "https://twitter.com/i/api/1.1/onboarding/task.json",
      {
        method: "POST",
        headers: get_login_headers(),
        body: JSON.stringify({
          flow_token: flow_token,
          subtask_inputs: [
            {
              subtask_id: "AccountDuplicationCheck",
              check_logged_in_account: {
                link: "AccountDuplicationCheck_false",
              },
            },
          ],
        }),
      }
    );
    data = await sixth_res.json();
    auth_token = /auth_token=.*?;/gm.exec(
      sixth_res.headers.get("set-cookie")
    )[0];
    cookie = auth_token + "; ct0=" + csrf_token;
    console.log("[-] Successfully logged in");
  } catch (e) {
    console.log("[x] Error while login ... ops");
    console.error(e)
  }
}

async function get_guest_token(csrf_token) {
  let res = await fetch("https://api.twitter.com/1.1/guest/activate.json", {
    method: "POST",
    headers: {
      Host: "api.twitter.com",
      "Content-Length": "0",
      "Sec-Ch-Ua": '" Not A;Brand";v="99", "Chromium";v="90"',
      "X-Twitter-Client-Language": "en",
      "X-Csrf-Token": csrf_token,
      "Sec-Ch-Ua-Mobile": "?0",
      Authorization: `Bearer ${bearer}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36",
      "X-Twitter-Active-User": "yes",
      Accept: "*/*",
      Origin: "https://twitter.com",
      "Sec-Fetch-Site": "same-site",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Dest": "empty",
      Referer: "https://twitter.com/",
      "Accept-Encoding": "gzip, deflate",
      "Accept-Language": "en-US,en;q=0.9",
      Connection: "close",
      Cookie: `ct0=${csrf_token}`,
    },
  });
  let data = await res.json();
  return data.guest_token;
}

// this one will be used during the login
function generate_csrf() {
  var t = new Uint8Array(32);
  crypto.getRandomValues(t);
  for (var n = "", r = 0; r < t.length; r++) n += t[r].toString(16).substr(-1);
  return n;
}
// this one will be used for scraping followers and following
async function get_user_csrf() {
  let headers = get_headers();
  headers.cookie = cookie;
  let res = await fetch(
    "https://twitter.com/i/api/graphql/Zsl7hxz5nsAwzQHtBQ0cXw/Viewer?variables=%7B%22withCommunitiesMemberships%22%3Atrue%2C%22withCommunitiesCreation%22%3Atrue%2C%22withSuperFollowsUserFields%22%3Atrue%7D",
    {
      headers: headers,
    }
  );
  csrf_token = /ct0=(.*?);/gm.exec(res.headers.get("set-cookie"))[1];
  cookie = auth_token + "; ct0=" + csrf_token;
}

async function get_id(username) {
  try {
    let res = await fetch(
      `https://twitter.com/i/api/graphql/gr8Lk09afdgWo7NvzP89iQ/UserByScreenName?variables=%7B%22screen_name%22%3A%22${username}%22%2C%22withSafetyModeUserFields%22%3Atrue%2C%22withSuperFollowsUserFields%22%3Atrue%7D`,
      {
        headers: {
          Host: "twitter.com",
          Pragma: "no-cache",
          "Cache-Control": "no-cache",
          "Sec-Ch-Ua": '" Not A;Brand";v="99", "Chromium";v="90"',
          "X-Twitter-Client-Language": "en",
          "X-Csrf-Token": csrf_token,
          "Sec-Ch-Ua-Mobile": "?0",
          Authorization: `Bearer ${bearer}`,
          "Content-Type": "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36",
          "X-Twitter-Active-User": "yes",
          Accept: "*/*",
          "Sec-Fetch-Site": "same-origin",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Dest": "empty",
          "Accept-Encoding": "gzip, deflate",
          "Accept-Language": "en-US,en;q=0.9",
          Connection: "close",
          Cookie: cookie,
        },
      }
    );
    let data = await res.json();
    let id = data?.data?.user?.result?.rest_id;
    if (id) return id;

    throw "NOT FOUND";
  } catch (e) {
    throw e;
  }
}

async function scrape(user_id, scrape_type, scrape_code) {
  try {
    await get_user_csrf();
    let count = 200;
    let total = 0;
    let cursor = "";
    let raw = [];
    let users = [];
    let update = false;
    console.log("[!] Start scraping ... plz wait");
    do {
      update = false;
      let res = await fetch(
        `https://twitter.com/i/api/graphql/${scrape_code}/${scrape_type}?variables=%7B%22userId%22%3A%22${user_id}%22%2C%22count%22%3A${count}%2C%22cursor%22%3A%22${encodeURIComponent(
          cursor
        )}%22%2C%22includePromotedContent%22%3Afalse%2C%22withSuperFollowsUserFields%22%3Atrue%2C%22withDownvotePerspective%22%3Afalse%2C%22withReactionsMetadata%22%3Afalse%2C%22withReactionsPerspective%22%3Afalse%2C%22withSuperFollowsTweetFields%22%3Atrue%7D&features=%7B%22unified_cards_follow_card_query_enabled%22%3Afalse%2C%22dont_mention_me_view_api_enabled%22%3Atrue%2C%22responsive_web_uc_gql_enabled%22%3Atrue%2C%22vibe_api_enabled%22%3Atrue%2C%22responsive_web_edit_tweet_api_enabled%22%3Atrue%2C%22standardized_nudges_misinfo%22%3Atrue%2C%22tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled%22%3Afalse%2C%22interactive_text_enabled%22%3Atrue%2C%22responsive_web_text_conversations_enabled%22%3Afalse%2C%22responsive_web_enhance_cards_enabled%22%3Atrue%7D`,
        {
          headers: {
            Host: "twitter.com",
            "Sec-Ch-Ua": '" Not A;Brand";v="99", "Chromium";v="90"',
            "X-Twitter-Client-Language": "en",
            "X-Csrf-Token": csrf_token,
            "Sec-Ch-Ua-Mobile": "?0",
            Authorization: `Bearer ${bearer}`,
            "Content-Type": "application/json",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36",
            "X-Twitter-Auth-Type": "OAuth2Session",
            "X-Twitter-Active-User": "yes",
            Accept: "*/*",
            "Sec-Fetch-Site": "same-origin",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Dest": "empty",
            Referer: "https://twitter.com/CeredaDiego/following",
            "Accept-Encoding": "gzip, deflate",
            "Accept-Language": "en-US,en;q=0.9",
            Connection: "close",
            Cookie: cookie,
          },
        }
      );
      let data = await res.json();
      let ins = data?.data?.user?.result?.timeline?.timeline?.instructions;
      if (ins == undefined) {
        console.log(`[x] User ${user_id} has not ${scrape_type.toLowerCase()}`);
        return;
      }
      raw = ins[ins.length - 1].entries;
      for (let i = 0; i < raw.length; i++) {
        let user = raw[i]?.content?.itemContent?.user_results?.result;
        if (user != undefined) {
          let name = user?.legacy?.name;
          if (name == undefined) {
            // probably it's private or your are blocked
            // I don't much about twitter
          } else {
            update = true;
            total++;
            users.push(user);
          }
        } else {
          // it's cursor
          if (
            raw[i]?.content?.entryType == "TimelineTimelineCursor" &&
            raw[i]?.content?.cursorType == "Bottom"
          ) {
            cursor = raw[i].content.value;
          }
        }
      }
      if (update) {
        console.log(`[-] Current users found ${total}`);
      }
    } while (update);
    console.log(`[-] Total users found ${total}`);
    let path = `${DIR}/${user_id}_${String(
      scrape_type
    ).toLowerCase()}_${FILENAME}`;
    if (!fs.existsSync(DIR)) {
      fs.mkdirSync(DIR);
    }
    fs.writeFileSync(path, JSON.stringify(users, null, 2));
    console.log(`[!] All users data is saved in ${path}`);
  } catch (e) {
    error();
  }
}
async function ask_login() {
  console.log("[!] Login is required");
  let username = await promptly.prompt("[?] Username : ");
  let password = await promptly.password("[?] Password : ");
  await login(username, password);
}
async function scrape_following(user_id) {
  return scrape(user_id, FOLLOWING, FOLLOWING_CODE);
}
async function scrape_followers(user_id) {
  return scrape(user_id, FOLLOWERS, FOLLOWERS_CODE);
}
async function scrape_followers_by_name(username) {
  try {
    let id = await get_id(username);
    scrape_followers(id);
  } catch (e) {
    error();
  }
}
async function scrape_following_by_name(username) {
  try {
    let id = await get_id(username);
    scrape_following(id);
  } catch (e) {
    error();
  }
}
function error() {
  console.log("[x] Error during scraping");
}

Main();
