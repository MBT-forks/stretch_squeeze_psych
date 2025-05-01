async function run_experiment(experiment_name, experiment_number, aws_prefix) {
  try {
      const turkInfo = jsPsych.turk.turkInfo();
      let user_in_preview_mode = turkInfo.previewMode;
      
      bucket_url = 'https://' + `${aws_prefix}-${experiment_name.replace(/_/g, "-").toLowerCase()}-${experiment_number}` + '.s3.amazonaws.com';

      user_ip = await getUserIP();

      await load_script(bucket_url + "/aws_constants.js"); // session_metadata_api_url defined inside

      let trialset_id;
      if (platform == 'test') {
          assignment_id_global = 'test_assignment'
          if (trialset_id_from_url !== null) {
              trialset_id = trialset_id_from_url
          }
          else {
              trialset_id = 0
          }
      }
      else {
          if (turkInfo.outsideTurk === false && turkInfo.previewMode === false) {
              platform = 'mturk'
          }
          const response = await session_metadata_lambda(experiment_name, experiment_number, aws_prefix, session_metadata_api_url, platform, null, null, null, trialset_id_from_url, "initialize_session_metadata", 3, 1000, MTS_TASK_GLOBALS.MAX_NUM_REFRESHES);

          if (response && response.end_experiment) {
                  if (response.end_experiment_message) {
                      end_experiment_outside_jspsych(response.end_experiment_message);
                  } else {
                      end_experiment_outside_jspsych('The study has concluded. Thank you for your participation.');
                  }
                  return;
          }

          trialset_id = response.trialset_id;
          assignment_id_global = response.assignment_id;
      }

      jsPsych.data.addProperties({
          'experiment_name': experiment_name,
          'experiment_number': experiment_number,
          'aws_prefix': aws_prefix,
          'assignment_id': assignment_id_global,
          'trialset_id': trialset_id,
          'platform': platform,
          'request_purpose': 'store_trial_data'
      })

      // Load the trialset as a js file in s3
      let trialset_url = new URL(bucket_url + '/trialsets/' + `${experiment_name}_${experiment_number}_trials_${trialset_id}.js`)
      trialset_url.searchParams.set('x', Math.random().toString()) // Encourage browser to refresh
      trialset_url_string = trialset_url.toString()
      await load_script(trialset_url_string);

      let experiment_timeline = get_nway_afc_trials(trial_variables, session_settings);

      jsPsych.run([
          preview_gate,
          browser_check_node,
          experiment_timeline,
          get_mailing_list_node(),
          get_turk_submission_node(trialset_id)
      ],)

  } catch (error) {
      console.error('Error:', error);
  }
}

let jsPsych = initJsPsych(
  {
      show_progress_bar: true,
      auto_update_progress_bar: false,
      message_progress_bar: 'Progress',
  }
);

let browser_check_node = get_browser_check_node();

// Run the timeline
let preview_gate = {
  timeline: [{
      type: jsPsychHtmlKeyboardResponse,
      stimulus: '<h1 style="color:red">PREVIEW MODE</h1> Please accept the HIT to continue.',
      choices: [' '],
      on_start: function () {
          console.log('At preview gate.')
      },
  }],
  conditional_function: function () {
      return jsPsych.turk.turkInfo().previewMode || platform === null
  },
};

run_experiment(experiment_name, experiment_number, aws_prefix)