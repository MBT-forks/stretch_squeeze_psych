function getUrlParameters() {
  const params = new URLSearchParams(window.location.search);
  const output = {};
  for (const [key, value] of params.entries()) {
      output[key] = value;
  }
  return output;
}

function redirect(url) {
  try {
      window.location.href = url;
  } catch (e) {
      window.location.replace(url);
  }
  
  // Fallback if the above methods fail
  setTimeout(function() {
      window.location = url;
  }, 100);
}

function load_script(url) {
  return new Promise((resolve, reject) => {
      var script = document.createElement('script');
      script.src = `${url}?v=${new Date().getTime()}`;
      script.onload = () => resolve(script);
      script.onerror = () => reject(new Error(`Script load error for ${url}`));
      document.head.appendChild(script);
  });
}

async function getUserIP() {
  try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
  } catch (error) {
      console.error('Error fetching the IP address:', error);
      return null;
  }
}

function get_mouse_listener(
  get_active_regions_function,
  on_valid_response_function,
) {
  /*
  get_active_regions_function: Returns an array of Objects, each of which defines a different active region. Each active region is an object with the following properties:
      - x. A callable which returns the x-centroid of the active region, in coordinates of the target node to which the listener belongs.
      - y. A callable which returns the y-centroid of the active region.
      - r. A callable which returns the radius of the circle.
  on_valid_response_function: A function that is called when a valid response is made. The function is called with the following arguments:
      - data:
          {
              responseX: int,
              responseY: int,
              choices_made: [bool, bool, ...],
              rel_timestamp_response:int
          }
   */

  function check_if_inside_circle(x, y, xc, yc, r) {
      var dxs = Math.pow(x - xc, 2);
      var dys = Math.pow(y - yc, 2);
      return (dxs + dys) <= Math.pow(r, 2);
  }


  function clicked_func(event) {
      let rel_t = performance.now();
      let userX_px = event.offsetX;
      let userY_px = event.offsetY;

      let choice_was_selected = false;
      let data = {
          responseX: userX_px,
          responseY: userY_px,
          rel_timestamp_response: rel_t,
          choices_made:[],
          i_choice: null,
      }

      let active_regions = get_active_regions_function();
      let nactive_regions = active_regions.length;
      for (let i_region = 0; i_region < nactive_regions; i_region++) {

          let region_cur = active_regions[i_region];
          let xc = region_cur['x'];
          let yc = region_cur['y'];
          let r = region_cur['r'];

          let is_inside = check_if_inside_circle(
              userX_px,
              userY_px,
              xc,
              yc,
              r,
          );

          data['choices_made'].push(is_inside)
          if (is_inside === true) {
              // todo - handle multiple simultaneous choices
              data['i_choice'] = i_region;
          }
          choice_was_selected = choice_was_selected || is_inside;
      }

      if (choice_was_selected === true) {
          on_valid_response_function(data)
      }
  }

  return clicked_func
}

function renderCenteredWrappedText(context, text, x, y, max_width_px, max_characters_per_line, lineHeight, font, color) {
  font = font || "Arial";
  context.fillStyle = color || "black";
  context.textAlign = "center";
  context.textBaseline = "middle";

    // Estimate the font size
    let max_width_px_per_character = max_width_px / max_characters_per_line;
    let font_size_px = max_width_px_per_character * 1.7 || 12;

    font_size_px = Math.max(Math.round(font_size_px), 2);
    context.font = font_size_px.toString() + "px " + font;

  // Split text by words
  var words = text.split(' ');
  var line = '';
  var lines = [];

  for(var n = 0; n < words.length; n++) {
    var testLine = line + words[n] + ' ';
    var metrics = context.measureText(testLine);
    var testWidth = metrics.width;
    if (testWidth > max_width_px && n > 0) {
      lines.push(line);
      line = words[n] + ' ';
    } else {
      line = testLine;
    }
  }
  lines.push(line);

  // Calculate the starting y position
  var startingY = y - (lines.length - 1) * lineHeight / 2;

  // Draw each line
  for (var i = 0; i < lines.length; i++) {
    context.fillText(lines[i], x, startingY + i * lineHeight);
  }
}

class CookieUtils {

  static setCookie(cname, cvalue, exdays) {
      const d = new Date();
      cvalue = encodeURIComponent(cvalue);
      d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
      let expires = "expires=" + d.toUTCString();
      let cookie_set = cname + "=" + cvalue
      let suffix = 'SameSite=None; Secure'
      document.cookie = cookie_set + ";" + expires + ";path=/" + ";" + suffix;
  }

  static getCookie(cname) {
      let name = cname + "=";
      let decodedCookie = decodeURIComponent(document.cookie);
      let ca = decodedCookie.split(';');
      for (let i = 0; i < ca.length; i++) {
          let c = ca[i];
          while (c.charAt(0) === ' ') {
              c = c.substring(1);
          }
          if (c.indexOf(name) === 0) {
              return c.substring(name.length, c.length);
          }
      }
      return "";
  }
}

function _store_jspsych_cookie(trial_data) {
  CookieUtils.setCookie('jspsych-my-virtual-chinrest', JSON.stringify(trial_data), 7,)
}

function session_metadata_lambda(experiment_name, experiment_number, aws_prefix, api_gateway_url, platform = null, assignment_id = null, datastring = null, bonus_usd = null, trialset_id = null, request_purpose = null, max_retries = 3, initial_delay = 1000) {
  const turkInfo = jsPsych.turk.turkInfo();

  function makeRequest(retryCount) {
      return new Promise((resolve, reject) => {
          var xhr = new XMLHttpRequest();
          xhr.onreadystatechange = function() {
              if (xhr.readyState == 4) {
                  if (xhr.status == 200) {
                      var response = JSON.parse(xhr.responseText);
                      resolve(response);
                  } else {
                      reject('Request failed with status: ' + xhr.status);
                  }
              }
          };

          xhr.open("POST", api_gateway_url, true);
          xhr.setRequestHeader("Content-Type", "application/json");
          xhr.setRequestHeader("Accept", "application/json");

          let payload = {
              experiment_name: experiment_name,
              experiment_number: experiment_number,
              aws_prefix: aws_prefix,
          };

          if (turkInfo.outsideTurk === false && turkInfo.previewMode === false) {
              payload.worker_id = turkInfo.workerId;
              payload.hit_id = turkInfo.hitId;
              payload.assignment_id = turkInfo.assignmentId;
          }
          
          if (pid_from_url !== null) {
              payload.worker_id = pid_from_url; // Overrides a values set by turk, if present
          }
          if (study_id_from_url !== null) {
              payload.hit_id = study_id_from_url; // Overrides a values set by turk, if present
          }

          if (assignment_id !== null) {
              payload.assignment_id = assignment_id;
          }
          else if (assignment_id_global !== null) { // Overrides value set by turk, if present
              payload.assignment_id = assignment_id_global;
          }

          if (datastring !== null) {
              payload.datastring = datastring;
          }
          if (bonus_usd !== null) {
              payload.bonus_usd = bonus_usd.toString();
          }
          if (platform !== null) {
              payload.platform = platform;
          }
          if (trialset_id !== null) {
              payload.trialset_id = trialset_id
          }
          if (condition_idx !== null) { // Note that this is a global variable defined near the top of the script
              payload.condition_idx = condition_idx
          }
          if (user_ip != null) {
              payload.user_ip = user_ip
          }
          if (user_email !== null) {
              payload.user_email = user_email
          }
          if (request_purpose !== null) {
              payload.request_purpose = request_purpose
          }

          xhr.send(JSON.stringify(payload));
      });
  }

  function retryWithExponentialBackoff(retryCount) {
      return makeRequest(retryCount).catch(error => {
          if (retryCount < max_retries) {
              const delay = initial_delay * Math.pow(2, retryCount);
              console.log(`Attempt ${retryCount + 1} failed. Retrying in ${delay}ms...`);
              return new Promise(resolve => setTimeout(resolve, delay))
                  .then(() => retryWithExponentialBackoff(retryCount + 1));
          } else {
              throw error;
          }
      });
  }

  return retryWithExponentialBackoff(0);
}

function assign_quals_lambda(qualification_type_ids, sandbox) {
  const turkInfo = jsPsych.turk.turkInfo();
  return new Promise((resolve, reject) => {
      var xhr = new XMLHttpRequest();
      xhr.onreadystatechange = function() {
          if (xhr.readyState == 4) {
              if (xhr.status == 200) {
                  var response = JSON.parse(xhr.responseText);
                  resolve(response);
              } else {
                  reject('Request failed with status: ' + xhr.status);
              }
          }
      };

      xhr.open("POST", ASSIGN_QUALS_LAMBDA_API_GATEWAY_URL, true);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.setRequestHeader("Accept", "application/json");
      
      if (turkInfo.outsideTurk === false && turkInfo.previewMode === false) {
          xhr.send(JSON.stringify({
              worker_id: turkInfo.workerId,
              qualification_type_ids: qualification_type_ids,
              score: parseInt(MTS_TASK_GLOBALS.BONUS_USD_EARNED*100),
              sandbox: sandbox
          }));
      }
  });
}

async function assign_quals_lambda_wrapper(qualification_type_ids, sandbox) {
  console.log("assigning quals")
  qual_lambda_response = await assign_quals_lambda(qualification_type_ids, SANDBOX);
  console.log(qual_lambda_response)
}