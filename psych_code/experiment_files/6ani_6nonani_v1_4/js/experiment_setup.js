function get_nway_afc_trials(trial_sequence, session_settings) {

    MTS_TASK_GLOBALS.NTRIALS = trial_sequence.length;
    let instructions_node = get_instructions_node([session_settings['instructions_html']])

    let mts_nodes = [];
    let image_urls_to_load = [];

    // Sample random integer
    const refresh_param = Math.random().toString()//
    function refresh_url(url_string){
        // Encourage browser to refresh image
        let url = new URL(url_string);
        url.searchParams.set('x', refresh_param);
        let url_string_refreshed = url.toString()
        return url_string_refreshed
    }

    let show_warmup_complete_instructions = false
    let show_test_instructions = false

    for (let i = 0; i < trial_sequence.length; i++) {
        let timeline_cur = MTS_Trial_Nodes.get_timeline();
        let timeline_variables_cur = trial_sequence[i];

        // If we're transitioning to the post-warmup block, show associated instructions
        if (timeline_variables_cur['show_warmup_complete_instructions'] && !show_warmup_complete_instructions) {
            let warmup_complete_instructions_node = get_instructions_node([session_settings['warmup_complete_instructions_html']], check_for_screen_out=true)
            mts_nodes.push(warmup_complete_instructions_node)
        }
        show_warmup_complete_instructions = timeline_variables_cur['show_warmup_complete_instructions']

        // If we're transitioning to the test block, show test instructions
        if (timeline_variables_cur['show_test_instructions'] && !show_test_instructions) {
            let test_instructions_node = get_instructions_node([session_settings['test_instructions_html']], check_for_screen_out=false)
            mts_nodes.push(test_instructions_node)
        }
        show_test_instructions = timeline_variables_cur['show_test_instructions']

        let stimulus_image_url = DEVELOPER_MODE ? refresh_url(timeline_variables_cur['stimulus_image_url']) : timeline_variables_cur['stimulus_image_url'];
        let choice_image_urls = timeline_variables_cur['choice_image_urls'].map(refresh_url);
        let feedback_correct_url = DEVELOPER_MODE ? refresh_url(timeline_variables_cur['feedback_correct_url']) : timeline_variables_cur['feedback_correct_url'];
        let feedback_incorrect_url = DEVELOPER_MODE ? refresh_url(timeline_variables_cur['feedback_incorrect_url']) : timeline_variables_cur['feedback_incorrect_url'];

        timeline_variables_cur['stimulus_image_url'] = stimulus_image_url;
        timeline_variables_cur['choice_image_urls'] = choice_image_urls;
        timeline_variables_cur['feedback_correct_url'] = feedback_correct_url;
        timeline_variables_cur['feedback_incorrect_url'] = feedback_incorrect_url;

        image_urls_to_load.push(stimulus_image_url);
        image_urls_to_load.push(feedback_correct_url);
        image_urls_to_load.push(feedback_incorrect_url);
        image_urls_to_load = image_urls_to_load.concat(choice_image_urls);

        mts_nodes.push({
                timeline: timeline_cur,
                timeline_variables: [timeline_variables_cur],
            }
        )
    }

    // The following function checks the image URLs for testing purposes, to be run ONLY if outside mechanical turk. 
    function preloadImagesAndIdentifyErrors(imageUrls, onComplete) {
        let loadedCount = 0;
        const errors = [];
        imageUrls.forEach((url) => {
            const img = new Image();
            img.onload = () => {
                loadedCount++;
                if (loadedCount === imageUrls.length) {
                    onComplete(errors);
                }
            };
            img.onerror = () => {
                console.error('Failed to load:', url);
                errors.push(url);
                loadedCount++;
                if (loadedCount === imageUrls.length) {
                    onComplete(errors);
                }
            };
            img.src = url;
        });
    }

    if (jsPsych.turk.turkInfo().outsideTurk & platform !== "prolific") {
        preloadImagesAndIdentifyErrors(image_urls_to_load, (errors) => {
            if (errors.length > 0) {
                console.log('Failed URLs:', errors);
            } else {
                console.log('All images loaded successfully.');
            }
        });
    }

    function cleanupImageCache() {
        const imgCache = jsPsych.pluginAPI.img_cache;
        for (let src in imgCache) {
            if (imgCache.hasOwnProperty(src)) {
                imgCache[src].onload = null;
                imgCache[src].onerror = null;
                imgCache[src].oncanplaythrough = null;
                imgCache[src].onabort = null;
                // imageCache[src] = '';
                // delete imgCache[src];
            }
        }

        // // Clear the cache object itself
        // for (let prop in jsPsych.pluginAPI.img_cache) {
        //     if (jsPsych.pluginAPI.img_cache.hasOwnProperty(prop)) {
        //         delete jsPsych.pluginAPI.img_cache[prop];
        //     }
        // }

        if (window.gc) {
            window.gc();
        }
    }

    let task_preload = {
        type: jsPsychPreload,
        auto_preload: false,
        show_progress_bar: true,
        message: 'Loading images...',
        images: image_urls_to_load,
        on_start: function () {
            document.body.style.backgroundColor = '#7F7F7F';
        },
        on_finish: function () {
            console.log('Done preloading MTS assets.')
            jsPsych.setProgressBar(0.005);
            console.log("Clearing event listeners associated with preloading...")
            cleanupImageCache();
        }
    }

    // Setup fullscreen

    let fullscreen_node = {
        timeline: [
            {
                type: jsPsychFullscreen,
            }
        ],
        conditional_function: function () {
            let run = session_settings['force_fullscreen'] === true
            return run;
        },
    }
    // console.log('MTS nodes:', mts_nodes)
    let monitor_calibration_node = {
        timeline: [
            {
                type: jsPsychMyVirtualChinrest,
                credit_card_reps: 1,
                blindspot_reps: 2,
                credit_card_image_path: 'https://miljspsych.s3.amazonaws.com/resources/assets/images/card.png',
                credit_card_init_size: function () {
                    let loaded_cookie = CookieUtils.getCookie('external-my-virtual-chinrest')
                    let initial_credit_card_size_pixels = 400; // Default

                    if (loaded_cookie.length > 0) {
                        loaded_cookie = JSON.parse(loaded_cookie)
                        console.log('Loaded cookie:', loaded_cookie)
                        let final_item_width_px = loaded_cookie['outputs']['average_reported_item_width_px']
                        if (typeof final_item_width_px === 'number') {
                            initial_credit_card_size_pixels = Math.min(1000, Math.max(40, final_item_width_px))
                        }
                    }
                    return initial_credit_card_size_pixels
                },
                on_finish: function (data) {
                    console.log('Monitor calibration done. Result:', data)
                    _store_jspsych_cookie(data)
                    console.log(data)
                    let viewing_distance_px = data['outputs']['viewing_distance_px']
                    MTS_TASK_GLOBALS.calibrate_viewing_distance(viewing_distance_px);
                }
            },
        ],
        conditional_function: function () {
            let run = session_settings['calibrate_monitor'] === true
            return run;
        },
    }
    let timeline = [fullscreen_node, instructions_node, task_preload, monitor_calibration_node].concat(mts_nodes)
    let finish_node = {
        type: jsPsychHtmlButtonResponse,
        choices: ['Press to continue'],
        trial_duration: 10000,
        stimulus: function () {
            let bonus_usd_earned = MTS_TASK_GLOBALS.BONUS_USD_EARNED

            if (bonus_usd_earned > 0) {
                return 'Thank you for your work! Bonus earned: $' + bonus_usd_earned.toFixed(2).toString();
            } else {
                return 'No bonus earned. Thank you for your work.'
            }
        },
    }

    timeline.push(finish_node)
    let block_timeline = {
        'timeline': timeline,
    }
    return block_timeline
}