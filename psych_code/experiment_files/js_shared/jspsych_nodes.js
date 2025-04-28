function get_browser_check_node(){
  let return_message = '<p>We apologize for the inconvenience. Please press the "Return" button or close the tab/window to exit.</p>'
  return {
      timeline: [
          {
              type: jsPsychBrowserCheck,
              inclusion_function: (data) => {
                  return data.mobile === false
              },
              exclusion_message: (data) => {
                  if (data.mobile) {
                      return '<p>You must use a desktop/laptop computer to participate in this experiment.</p>' + return_message;
                  }
              },
          },
          {
              type: jsPsychBrowserCheck,
              inclusion_function: (data) => {
                  const os = data.os.toLowerCase();
                  return os.includes("windows") || os.includes("mac") || os.includes("linux") || os.includes("chrome");
              },
              exclusion_message: (data) => {
                  return `<p>Your operating system is not supported for this experiment. Please use a device with Windows, Mac, Linux, or Chrome OS.</p>` + return_message;
              },
          },
          {
              type: jsPsychBrowserCheck,
              minimum_width: MIN_WIDTH,
              minimum_height: MIN_HEIGHT,
              exclusion_message: (data) => {
                  return `<p>Your browser does not meet the technical requirements for this experiment. Please use a device with a larger screen.</p>` + return_message;
              }
          },
      ],
  };
}

function submit_data_to_lambda(request_purpose, was_screened_out = false) {
    let data = jsPsych.data.get().json() //get_submission_data_function()
    let datastring = JSON.stringify(data);

    session_metadata_lambda(experiment_name, experiment_number, aws_prefix, session_metadata_api_url, platform, assignment_id_global, data, MTS_TASK_GLOBALS.BONUS_USD_EARNED, null, request_purpose, was_screened_out)
        .then(response => {
            if (response.redirectUrl) {

                // Fallback message with link in case the participant is not redirected automatically
                const container = document.createElement('div');
                container.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; background-color: #f0f0f0; padding: 20px; border-radius: 5px; box-shadow: 0 0 10px rgba(0,0,0,0.1);';
                const message = document.createElement('p');
                message.textContent = 'If you are not automatically redirected, please click the link below:';
                container.appendChild(message);
                const link = document.createElement('a');
                link.href = response.redirectUrl.toString();
                link.textContent = 'Continue to next page';
                link.style.cssText = 'display: inline-block; margin-top: 10px; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;';
                container.appendChild(link);
                document.body.appendChild(container);
                
                // Attempt redirect
                redirect(response.redirectUrl);
            } else {
                console.log("No redirect URL provided");
            }
        })
        .catch(error => {
            console.error("Error when storing final session data:", error);
        });

    const turkInfo = jsPsych.turk.turkInfo();
    if (turkInfo.outsideTurk === false) {
        let dataobject = {
            'datastring': datastring,
            'workerId': turkInfo.workerId,
            'assignmentId': turkInfo.assignmentId,
            'trialset_id': trialset_id,
            'bonus_usd': MTS_TASK_GLOBALS.BONUS_USD_EARNED,
            'turkInfo': turkInfo,
        }
        jsPsych.turk.submitToTurk(dataobject);
    } else if (platform == null) {
        console.log(data)
        jsPsych.data.displayData('JSON');
    }
}

function get_instructions_node(instructions_html_pages, check_for_screen_out=false){

    function wrap_instructions_html(
        instructions_string_html,
    ) {

        let div = document.createElement("div");
        div.style['width'] = "auto";
        //div.style['maxWidth'] = "80%";
        div.style['margin'] = '0 auto'
        //div.style['padding'] = '10px'
        div.style['display'] = 'flex';
        div.style['align-items'] = 'center';
        div.style['flex-direction'] = 'column';
        div.style['font-size'] = '14px';
        //div.style['z-index'] = '-1';
        //div.style['font-family'] = '\'Helvetica Neue\', serif';
        div.style['text-align'] = 'left';
        div.style['color'] = '#4B4B4B';
        div.style['background-color'] = '#E4E4E4';
        div.style['border-radius'] = '8px';
        div.style['border-color'] = '#7F7F7F';
        div.style['border-style'] = 'solid';
        div.style['padding-right'] = '2%';
        div.style['padding-left'] = '2%';
        div.style['padding-bottom'] = '2%';

        let span = document.createElement('span');
        span.innerHTML = instructions_string_html;
        div.appendChild(span);
        return div.outerHTML;
    }

    function createTrialSequence(pages) {
        let trial_seq = [];
        for (let i_page = 0; i_page < pages.length; i_page++) {
            let html_cur = wrap_instructions_html(
                pages[i_page],
            );

            let button_text;
            if (i_page < pages.length - 1) {
                button_text = `Next (${i_page + 1}/${pages.length})`;
            }
            else{
                button_text = 'Continue';
            }
            let cur_trial = {
                    type: jsPsychHtmlButtonResponse,
                    stimulus: html_cur,
                    choices: function () {
                        if (jsPsych.turk.turkInfo().previewMode === true)
                            return ['In preview mode. Accept HIT to continue.']
                        else
                            return [button_text]
                    },
                }
            trial_seq.push(cur_trial);
        }
        return trial_seq;
    }

    function create_instructions_timeline(default_instructions) {
        if (check_for_screen_out) {

            let has_correct_total = MTS_TASK_GLOBALS.CORRECT_TRIALS_COUNT >= min_correct_total_for_auto_qual;
            let has_min_correct_per_class = Object.values(MTS_TASK_GLOBALS.CORRECT_CLASS_COUNTS).every(count => count >= min_correct_per_class_for_auto_qual);

            console.log("Correct count: " + MTS_TASK_GLOBALS.CORRECT_TRIALS_COUNT.toString())
            console.log(MTS_TASK_GLOBALS.CORRECT_CLASS_COUNTS)


            let passed_screening = has_correct_total && has_min_correct_per_class;

            if (accuracy_based_screening && !passed_screening) {
                sco = true //Screen out participant. This is a global variable
                return createTrialSequence([session_settings['screening_out_instructions_html']]);
            }
        }
        return createTrialSequence(default_instructions);
    }

    let instructions_timeline = {
        timeline: createTrialSequence(instructions_html_pages),
        on_timeline_start: function() {
            let new_timeline = create_instructions_timeline(instructions_html_pages)
            this.timeline[0].trial_parameters.stimulus = new_timeline[0].stimulus
        },
        on_finish: function() {
            if (accuracy_based_screening && sco) {
                submit_data_to_lambda("store_session_data_screen_out", was_screened_out=true)
                jsPsych.endExperiment('The study has concluded. Thank you for your participation.');
            }
        },
        loop_function: function (data) {
            return jsPsych.turk.turkInfo().previewMode;
        },
    }

    return instructions_timeline;

}

function get_mailing_list_node() {
  return {
      type: jsPsychSurveyText,
      questions: [{'name': 'user_email', prompt:'<b>CLICK BELOW TO SUBMIT YOUR WORK.</b><br> Optional: enter your email if you wish to be notified of additional studies in the future (if you are on Prolific, it will look like "594a5d31833f6d0001623f8a@email.prolific.co"):'}],
      button_label: 'SUBMIT',
  }
}

function get_turk_submission_node(trialset_id) {  //(get_submission_data_function) {
  // The get_session_data_function should return a JSON object of the data you'd wish to submit to Turk.
  return {
      type: jsPsychHtmlButtonResponse,
      stimulus: '<h1>Click below to submit your work.</h1>',
      choices: ['Submit'],
      trial_duration: 0, // Optional: wait some number of seconds before autosubmitting
      on_finish: function () {
          const turkInfo = jsPsych.turk.turkInfo();
          let data = jsPsych.data.get().json() //get_submission_data_function()
          let datastring = JSON.stringify(data);
          let dataobject = {
              'datastring': datastring,
              'workerId': turkInfo.workerId,
              'assignmentId': turkInfo.assignmentId,
              'trialset_id': trialset_id,
              'bonus_usd': MTS_TASK_GLOBALS.BONUS_USD_EARNED,
              'turkInfo': turkInfo,
          }
          jsPsych.turk.submitToTurk(dataobject);

          // Check if the user entered their email
          try {
              const last_data = jsPsych.data.get().last(10).values();
              last_data.forEach(function(entry) {
                  if (entry.trial_type === 'survey-text' && entry.response && entry.response.user_email) {
                      const isWhitespaceString = str => !str.replace(/\s/g, '').length
                      if (!isWhitespaceString(entry.response.user_email.toString())) {
                          const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
                          if (emailPattern.test(entry.response.user_email.toString())) {
                              user_email = entry.response.user_email.toString()
                          } else {
                              user_email = "invalid email: " + entry.response.user_email.toString()
                          }
                      } 
                  }
              });
          } catch (error) {
              console.warn("Error occurred while checking for email:", error);
          }

          session_metadata_lambda(experiment_name, experiment_number, aws_prefix, session_metadata_api_url, platform, assignment_id_global, data, MTS_TASK_GLOBALS.BONUS_USD_EARNED, null, "store_session_data")
              .then(response => {
                  if (response.redirectUrl) {

                      // Fallback message with link in case the participant is not redirected automatically
                      const container = document.createElement('div');
                      container.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; background-color: #f0f0f0; padding: 20px; border-radius: 5px; box-shadow: 0 0 10px rgba(0,0,0,0.1);';
                      const message = document.createElement('p');
                      message.textContent = 'If you are not automatically redirected, please click the link below:';
                      container.appendChild(message);
                      const link = document.createElement('a');
                      link.href = response.redirectUrl.toString();
                      link.textContent = 'Continue to next page';
                      link.style.cssText = 'display: inline-block; margin-top: 10px; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;';
                      container.appendChild(link);
                      document.body.appendChild(container);
                      
                      // Attempt redirect
                      redirect(response.redirectUrl);
                  } else {
                      console.log("No redirect URL provided");
                  }
              })
              .catch(error => {
                  console.error("Error when storing final session data:", error);
              });

          if (turkInfo.outsideTurk === true && platform == null) {
              console.log(data)
              jsPsych.data.displayData('JSON');
          }
      },
  };
}