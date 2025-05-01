class MTS_Trial_Nodes {

    static get_timeline() {
  
        let fixation_node = MTS_Trial_Nodes.get_fixation_node()
        let blank_screen = MTS_Trial_Nodes.get_blank_screen_node(
            () => {
                return MTS_TASK_GLOBALS.BACKGROUND_COLOR
            },
            () => {
                return MTS_TASK_GLOBALS.get_canvas_width_pixels()
            },
            () => {
                return MTS_TASK_GLOBALS.get_canvas_height_pixels()
            },
            0,
        );
        let stimulus_choice_node = MTS_Trial_Nodes.get_nway_stimulus_choice_node();
        let feedback_node = MTS_Trial_Nodes.get_feedback_node();
  
        let conditional_fixation_node = {
            timeline: [fixation_node, blank_screen],
            conditional_function: function() {
                let show_fixation = jsPsych.timelineVariable('show_fixation');
                if (show_fixation === undefined) {
                    show_fixation = false; //Default false unless overrided (for backwards-compatibility)
                }
                return show_fixation
            }
        }
  
        let conditional_feedback_node = {
            timeline: [blank_screen, feedback_node],
            conditional_function: function() {
                let show_feedback = jsPsych.timelineVariable('show_feedback');
                if (show_feedback === undefined) {
                    show_feedback = true; //Default true unless overrided (for backwards-compatibility)
                }
                return show_feedback
            }
        }
  
        let intertrial_node = MTS_Trial_Nodes.get_intertrial_node();
  
        let window_size_check_node = {
            type: jsPsychWindowSizeCheck,
            minimum_width: MIN_WIDTH,
            minimum_height: MIN_HEIGHT,
            on_finish: function (data) {
                jsPsych.getDisplayElement().innerHTML = '';
            }
        }
  
        let timeline = [
            conditional_fixation_node,
            stimulus_choice_node,
            conditional_feedback_node,
            intertrial_node,
            window_size_check_node,
        ]
        return timeline
    }
  
    static get_blank_screen_node(
        background_color,
        canvas_width_px,
        canvas_height_px,
        duration_msec
    ) {
        let blank_screen = {
            type: jsPsychPsychophysics,
            stimuli: [],
            background_color: background_color,
            response_type: 'key',
            response_ends_trial: true, // from the trial start (ms)
            trial_duration: duration_msec, // One frame
            canvas_width: canvas_width_px,
            canvas_height: canvas_height_px,
            canvas_offsetX: 0,
            canvas_offsetY: 0,
            clear_canvas: true,
            remain_canvas: false, // If true, the canvas is not cleared at the end of the trial.
            show_start_time: 0, // from the trial start (ms)
            show_end_time: undefined, // from the trial start (ms)
        }
        return blank_screen;
    }
  
    static calculateOptimalGrid(numImages) {
        if (numImages <= 1) return { rows: 1, cols: 1 };
        if (numImages === 2) return { rows: 1, cols: 2 };
        
        // For 3 or more images, find a grid as close to square as possible
        const sqrt = Math.sqrt(numImages);
        let cols = Math.ceil(sqrt);
        let rows = Math.ceil(numImages / cols);
        
        // Ensure we have enough spots in the grid
        while (rows * cols < numImages) {
            cols++;
        }
        
        return { rows, cols };
    }
  
    static createStimulusImageGrid(stimulus_image_url, image_width_px, start_time = 0, end_time = undefined, centerX = 'center', centerY = 'center') {
        // If stimulus_image_url is a string, convert to array for consistent handling
        if (!Array.isArray(stimulus_image_url)) {
            stimulus_image_url = [stimulus_image_url];
        }
        
        // If single image, return a simple object
        if (stimulus_image_url.length === 1) {
            return {
                obj_type: 'image',
                startX: centerX,
                startY: centerY,
                origin_center: true,
                file: stimulus_image_url[0],
                image_width: image_width_px,
                show_start_time: start_time,
                show_end_time: end_time,
            };
        }
        
        // For multiple images, calculate grid layout
        const numImages = stimulus_image_url.length;
        const grid = MTS_Trial_Nodes.calculateOptimalGrid(numImages);
        
        // Calculate individual image size based on grid dimensions and spacing
        const spacing_percent = 0.02; // 2% spacing
        const spacing_px = image_width_px * spacing_percent;
        
        // Calculate individual image size to fit all images in the grid within the bounding box
        const individualWidth = (image_width_px - (spacing_px * (grid.cols - 1))) / grid.cols;
        const individualHeight = (image_width_px - (spacing_px * (grid.rows - 1))) / grid.rows;
        const individualSize = Math.min(individualWidth, individualHeight);
        
        // Calculate the grid's total width and height
        const totalWidth = (individualSize * grid.cols) + (spacing_px * (grid.cols - 1));
        const totalHeight = (individualSize * grid.rows) + (spacing_px * (grid.rows - 1));
        
        // Create an array of image objects
        let result = [];
        let imageIndex = 0;
        
        for (let row = 0; row < grid.rows; row++) {
            for (let col = 0; col < grid.cols; col++) {
                if (imageIndex < numImages) {
                    // Calculate position
                    let xPos, yPos;
                    
                    if (centerX === 'center') {
                        xPos = col * (individualSize + spacing_px) - totalWidth/2 + individualSize/2;
                    } else {
                        xPos = centerX + col * (individualSize + spacing_px) - totalWidth/2 + individualSize/2;
                    }
                    
                    if (centerY === 'center') {
                        yPos = row * (individualSize + spacing_px) - totalHeight/2 + individualSize/2;
                    } else {
                        yPos = centerY + row * (individualSize + spacing_px) - totalHeight/2 + individualSize/2;
                    }
                    
                    // Create individual image stimulus
                    result.push({
                        obj_type: 'image',
                        startX: xPos,
                        startY: yPos,
                        origin_center: true,
                        file: stimulus_image_url[imageIndex],
                        image_width: individualSize,
                        show_start_time: start_time,
                        show_end_time: end_time
                    });
                    
                    imageIndex++;
                }
            }
        }
        
        return result;
    }
  
    static get_feedback_node() {
  
        let get_reinforcement = function () {
            let last_trial_data = jsPsych.data.get().last(2).values()[0];
            let trial_outcome = last_trial_data['trial_outcome']
            let perf = trial_outcome['perf']
  
            let reinforcement = 0;
  
            if (perf > 0) {
                reinforcement = 1;
            } else {
                reinforcement = -1;
            }
            return reinforcement
        }
  
        let get_feedback_duration_msec = function () {
            let reinforcement = get_reinforcement();
            if (reinforcement > 0) {
                return jsPsych.timelineVariable('reward_duration_msec');
            } else if (reinforcement < 0) {
                return jsPsych.timelineVariable('incorrect_duration_msec');
            } else {
                return 0;
            }
        }
  
        let get_feedback_lockout_duration_msec = function () {
            let reinforcement = get_reinforcement();
            if (reinforcement > 0) {
                return jsPsych.timelineVariable('correct_feedback_lockout_duration_msec');
            } else if (reinforcement < 0) {
                return jsPsych.timelineVariable('incorrect_feedback_lockout_duration_msec');
            } else {
                return 0;
            }
        }
  
        let get_feedback_stimulus = function () {
  
            let positive_feedback_object;
            let negative_feedback_object;
  
            let feedback_correct_url = jsPsych.timelineVariable('feedback_correct_url', true);
            let feedback_incorrect_url = jsPsych.timelineVariable('feedback_incorrect_url', true);
  
            let canvas_width = MTS_TASK_GLOBALS.get_canvas_width_pixels();
            let canvas_height = MTS_TASK_GLOBALS.get_canvas_height_pixels();
  
            let min_canvas_dim = Math.min(canvas_width, canvas_height);
  
            let get_feedback_size = function () {
              return MTS_TASK_GLOBALS.stimulus_degrees_to_pixels(6)
            }
  
            if (feedback_correct_url !== undefined) {
                positive_feedback_object = {
                    obj_type: 'image', // means a rectangle
                    startX: 'center', // location in the canvas
                    startY: 'center',
                    file: feedback_correct_url,
                    image_width: get_feedback_size, // of the rectangle
                    //line_color: '#ffffff',
                    fill_color: '#62c63b',
                    show_start_time: 0, // from the trial start (ms)
                }
            } else {
                // Fallback
                positive_feedback_object = {
                    obj_type: 'rect', // means a rectangle
                    startX: 'center', // location in the canvas
                    startY: 'center',
                    width: get_feedback_size,
                    height: get_feedback_size,
                    //line_color: '#ffffff',
                    fill_color: '#62c63b',
                    show_start_time: 0, // from the trial start (ms)
                }
            }
  
            if (feedback_incorrect_url !== undefined) {
                negative_feedback_object = {
                    obj_type: 'image', // means a rectangle
                    startX: 'center', // location in the canvas
                    startY: 'center',
                    file: feedback_incorrect_url,
                    image_width: get_feedback_size,
                    //line_color: '#ffffff',
                    fill_color: '#af1111',
                    show_start_time: 0, // from the trial start (ms)
                }
            } else {
                // Fallback
                negative_feedback_object = {
                    obj_type: 'rect', // means a rectangle
                    startX: 'center', // location in the canvas
                    startY: 'center',
                    width: get_feedback_size,
                    height: get_feedback_size,
                    fill_color: '#000000',
                    show_start_time: 0 // from the trial start (ms)
                }
            }
  
            const neutral_feedback_object = {
                obj_type: 'rect', // means a rectangle
                startX: 'center', // location in the canvas
                startY: 'center',
                width: 0, // of the rectangle
                height: 0,
                fill_color: function () {
                    return MTS_TASK_GLOBALS.BACKGROUND_COLOR
                },
                show_start_time: 0 // from the trial start (ms)
            }
  
            // Determine reinforcement and accordingly set feedback and text
            let reinforcement = get_reinforcement();
  
            // Return no stimulus objects if the duration is 0
            let duration = get_feedback_duration_msec();
  
            if (duration === 0) {
              return []
            }
  
            if (reinforcement === 1) {
              return [positive_feedback_object];
            } else if (reinforcement === -1) {
              return [negative_feedback_object];
            } else {
              return [neutral_feedback_object];
            }
        }
  
        let feedback_screen = {
            type: jsPsychPsychophysics,
            stimuli: get_feedback_stimulus,
            background_color: function () {
                return MTS_TASK_GLOBALS.BACKGROUND_COLOR
            },
            canvas_width: function () {
                return MTS_TASK_GLOBALS.get_canvas_width_pixels()
            },
            canvas_height: function () {
                return MTS_TASK_GLOBALS.get_canvas_height_pixels()
            },
            trial_duration: get_feedback_duration_msec,
            canvas_offsetX: 0,
            canvas_offsetY: 0,
            clear_canvas: true,
            remain_canvas: false, // If true, the canvas is not cleared at the end of the trial.
            on_finish: function (data) {
                jsPsych.getCurrentTrial().funcs.dispose();
            }
        }
        return feedback_screen
    }
  
    static get_fixation_node() {
  
        let get_startX_px = function () {
            let px = MTS_TASK_GLOBALS.get_canvas_width_pixels() * 0.5 // Center
            return px
        };
  
        let get_startY_px = function () {
            let px = MTS_TASK_GLOBALS.get_canvas_height_pixels() * 0.5
            return px
        };
  
        let get_radius_px = function () {
            let px = MTS_TASK_GLOBALS.get_canvas_width_pixels() * 0.02 // Legacy choice
            return px
        }
  
        function get_fixation_active_region() {
            return {
                obj_type: 'circle',
                startX: get_startX_px,
                startY: get_startY_px,
                origin_center: false,
                radius: get_radius_px,
                line_color: 'white',
                fill_color: 'white',
                show_start_time: 0
            }
        }
  
        const fixation_cross = {
            obj_type: 'cross',
            startX: 'center',
            startY: 'center',
            line_length: function () {
                let px = MTS_TASK_GLOBALS.get_canvas_width_pixels() * 0.02
                px = Math.max(px, 10) // Legacy choice
                return px
            },
            line_color: 'black',
            show_start_time: 0
        }
  
        function get_active_regions() {
            return [{
                x: get_startX_px(),
                y: get_startY_px(),
                r: get_radius_px(),
            }]
        }
  
        let fixation_clicked_func = get_mouse_listener(
            get_active_regions,
            function (data) {
                document.body.style.cursor = 'none';
                jsPsych.finishTrial(data)
            },
        )
  
        // Trial initiation screen
        return {
            type: jsPsychPsychophysics,
            stimuli: function () {
                return [get_fixation_active_region(), fixation_cross]
            },
            response_type: 'mouse',
            response_start_time: 0,
            response_ends_trial: false,
            mouse_down_func: fixation_clicked_func,
            background_color: function () {
                return MTS_TASK_GLOBALS.BACKGROUND_COLOR
            },
            canvas_width: function () {
                return MTS_TASK_GLOBALS.get_canvas_width_pixels();
            },
            canvas_height: function () {
                return MTS_TASK_GLOBALS.get_canvas_height_pixels();
            },
            canvas_offsetX: 0,
            canvas_offsetY: 0,
            clear_canvas: true,
            remain_canvas: false, // If true, the canvas is not cleared at the end of the trial.
        }
    }
  
  
    static get_nway_stimulus_choice_node() {
  
        let t0_choices_drawn;
        let stimulus_width_px;
        let choice_width_px_default;
        let choice_width_px
        let trial_monitor_width_px = window.screen.width;
        let trial_monitor_height_px = window.screen.height;
        let canvas_width_px = MTS_TASK_GLOBALS.get_canvas_width_pixels();
        let canvas_height_px = MTS_TASK_GLOBALS.get_canvas_height_pixels();
        let cursor_hidden;
        let choices_drawn = false;
        let stimulus_drawn = false;
  
        function get_stimulus_object(
            stimulus_image_url,
            image_width_px,
            stimulus_duration_msec,
            leave_stimulus_on,
        ) {
            let show_end_time;
            if (leave_stimulus_on === true) {
                show_end_time = null;
            } else {
                show_end_time = stimulus_duration_msec;
            }
            
            return MTS_Trial_Nodes.createStimulusImageGrid(
                stimulus_image_url, 
                image_width_px, 
                0, 
                show_end_time
            );
        }
  
        function get_choice_stimuli(
            choice_image_urls,
            radius_px,
            image_width_px,
            choice_onset_msec,
        ) {
            let nchoices = choice_image_urls.length;
            let xy = get_choice_locations(nchoices, radius_px)
  
            let choice_objects = []
            for (let i_choice = 0; i_choice < nchoices; i_choice++) {
                let choice_i_image_url = choice_image_urls[i_choice];
  
                let choice_i_object = {
                    obj_type: 'image',
                    startX: xy[0][i_choice], // location in the canvas
                    startY: xy[1][i_choice],
                    origin_center: true,
                    file: choice_i_image_url,
                    image_width: image_width_px,
                    show_start_time: choice_onset_msec, // from the trial start (ms)
                    show_end_time: undefined, // from the trial start (ms)
                }
  
                choice_objects.push(choice_i_object)
            }
  
            return choice_objects
        }
  
  
        function get_choice_locations(nway, radius_px) {
            // Returns choice centroids in x and y coordinates, [x_seq, y_seq]
            // Ensures the centroids are equally spaced around a circle of r = radius
            // And that the choices are arranged in a way that is horizontally symmetric.
  
            let is_even = nway % 2 === 0
            let theta_0 = 0
            if (is_even === false) {
                theta_0 = Math.PI / 2; // Set the first choice to be theta = -90
            }
            else if (nway === 2) {
                theta_0 = Math.PI
            }
            // let theta_0 = 2*Math.PI*Math.random() // This version creates a random (not necessarily symmetric) rotation of the ring.
  
            let theta_seq = []
            for (let i = 0; i < nway; i++) {
                let theta_i = 2 * Math.PI * i / nway + theta_0;
                theta_seq.push(theta_i)
            }
  
            let x_seq = theta_seq.map(theta_i => radius_px * Math.cos(theta_i))
            let y_seq = theta_seq.map(theta_i => radius_px * Math.sin(theta_i))
            return [x_seq, y_seq]
        }
  
        function get_prompt_draw(
            query_string,
            canvas_width_px,
            canvas_height_px,
            min_y_bound,
            prompt_onset_msec,
        ) {
  
            let size = canvas_width_px;
            let max_text_width = size * 0.75
            let line_height_factor = 1.4;
            let font = 'Arial'
            let max_characters_per_line = 50;
            let horizontal_alignment = 'center';
            let vertical_alignment = 'bottom';
  
  
            let draw_func = function (stimulus, canvas, context, elapsedTime, sumOfStep) {
                let xleft = MTS_TASK_GLOBALS.get_canvas_width_pixels() / 2 - max_text_width / 2;
                let xright = MTS_TASK_GLOBALS.get_canvas_width_pixels() / 2 + max_text_width / 2;
                let ytop = 0;
                let ybottom = min_y_bound;
                renderCenteredWrappedText(
                    context, 
                    query_string, 
                    MTS_TASK_GLOBALS.get_canvas_width_pixels() / 2, 
                    MTS_TASK_GLOBALS.get_canvas_width_pixels() / 2, 
                    max_text_width, 
                    max_characters_per_line,
                    10, 
                    font, 
                    'white'
                )
            }
  
            return {
                obj_type: 'manual',
                startX: 0, // location in the canvas
                startY: 0,
                origin_center: true,
                drawFunc: draw_func,
                show_start_time: prompt_onset_msec, // from the trial start (ms)
                show_end_time: undefined // from the trial start (ms)
            }
        }
  
  
        function assemble_stimuli() {
            // Timeline variables
            let query_string = jsPsych.timelineVariable('query_string');
            let canvas_width_px = MTS_TASK_GLOBALS.get_canvas_width_pixels();
            let canvas_height_px = MTS_TASK_GLOBALS.get_canvas_height_pixels();
            let min_canvas_dim = Math.min(MTS_TASK_GLOBALS.get_canvas_width_pixels(), MTS_TASK_GLOBALS.get_canvas_height_pixels());
            stimulus_width_px = Math.min(MTS_TASK_GLOBALS.stimulus_degrees_to_pixels(jsPsych.timelineVariable('stimulus_width_degrees', true)), 0.7*min_canvas_dim);
            choice_width_px_default = MTS_TASK_GLOBALS.stimulus_degrees_to_pixels(jsPsych.timelineVariable('choice_width_degrees_default', true));
            let stimulus_image_url = jsPsych.timelineVariable('stimulus_image_url');
            let leave_stimulus_on = jsPsych.timelineVariable('keep_stimulus_on');
            let choice_names = jsPsych.timelineVariable('choice_names')
            let choice_image_urls = jsPsych.timelineVariable('choice_image_urls');
            let stimulus_duration_msec = jsPsych.timelineVariable('stimulus_duration_msec');
            let post_stimulus_delay_msec = jsPsych.timelineVariable('post_stimulus_delay_duration_msec');
  
            // Get stimulus object
            let stimulus_object = get_stimulus_object(
                stimulus_image_url,
                stimulus_width_px,
                stimulus_duration_msec,
                leave_stimulus_on
            )
  
            let stimulus_canary_object = {
                obj_type: 'manual',
                show_start_time: 0, // from the trial start (ms)
                show_end_time: undefined, // from the trial start (ms)
                drawFunc: function (stimulus, canvas, context, elapsedTime, sumOfStep) {
                    if (stimulus_drawn === false) {
                        stimulus_width_px = stimulus_width_px;
                        trial_monitor_width_px = window.screen.width;
                        trial_monitor_height_px = window.screen.height;
                        stimulus_drawn = true;
                    }
                }
            }
  
            // Get choice objects
            //let choice_radius_px = parseInt((min_canvas_dim - 1.05*choice_width_px_default)/2.5);
            let choice_radius_px = parseInt(stimulus_width_px/2 + (min_canvas_dim/2 - stimulus_width_px/2)/2)
            let n_choices = choice_image_urls.length
            //choice_width_px = parseInt(Math.sin(Math.PI/n_choices)*2*choice_radius_px)
            choice_width_px = parseInt(Math.min(Math.sin(Math.PI/n_choices)*2*choice_radius_px, 0.9*(min_canvas_dim - stimulus_width_px)/2))
            if (choice_width_px > choice_width_px_default) {
                choice_width_px = choice_width_px_default
            }
            let choice_onset_msec = post_stimulus_delay_msec + stimulus_duration_msec;
            let choice_objects = get_choice_stimuli(
                choice_image_urls,
                choice_radius_px,
                choice_width_px,
                choice_onset_msec,
            )
  
            // Get canary object for getting draw time of the choice stimuli
            let choice_canary_object = {
                obj_type: 'manual',
                show_start_time: choice_onset_msec, // from the trial start (ms)
                show_end_time: undefined, // from the trial start (ms)
                drawFunc: function (stimulus, canvas, context, elapsedTime, sumOfStep) {
                    if (choices_drawn === false) {
                        t0_choices_drawn = performance.now();
                        choices_drawn = true;
  
                    }
                }
            }
  
            // Get text prompt
            let xy = get_choice_locations(choice_image_urls.length, choice_radius_px)
            let min_y_bound = canvas_height_px / 2
            let prompt_object = get_prompt_draw(
                query_string,
                canvas_width_px,
                canvas_height_px,
                min_y_bound,
                choice_onset_msec,
            )
  
            // Assemble all objects
            //let stim_array = choice_objects.concat([stimulus_object, stimulus_canary_object, choice_canary_object])
  
            // If stimulus_objects is an array (multiple images), add all of them
            // Otherwise, treat it as a single object
            let stim_array = choice_objects;
            if (Array.isArray(stimulus_object)) {
                stim_array = stim_array.concat(stimulus_object);
            } else {
                stim_array.push(stimulus_object);
            }
            
            // Add canary objects
            stim_array.push(stimulus_canary_object);
            stim_array.push(choice_canary_object);
  
            return stim_array
        }
  
        function on_valid_response(data) {
            let pre_choice_lockout_delay_duration_msec = jsPsych.timelineVariable('pre_choice_lockout_delay_duration_msec', true)
            let rel_timestamp_response = data['rel_timestamp_response'];
            let reaction_time_msec = rel_timestamp_response - t0_choices_drawn;
  
            if (reaction_time_msec < pre_choice_lockout_delay_duration_msec) {
                // Ignore clicks that occur before the pre-choice lockout delay
                return
            }
  
            // Log processed data
            data['reaction_time_msec'] = reaction_time_msec
  
            // CHeck whether mouse click occurred within a valid timeframe
            jsPsych.finishTrial(data)
        }
  
  
        let get_active_regions = function () {
  
            let stim_array_cur = jsPsych.getCurrentTrial().stim_array;
            let nway = jsPsych.timelineVariable('choice_image_urls', true).length;
  
            let active_regions = []
            for (let i_choice = 0; i_choice < nway; i_choice++) {
                let choice_object = stim_array_cur[i_choice];
                let choice_radius_px = choice_width_px / 2 || choice_object['radius'];
  
                let choice_startX_px = choice_object['startX'];
                let choice_startY_px = choice_object['startY'];
                active_regions.push(
                    {
                        'x': choice_startX_px,
                        'y': choice_startY_px,
                        'r': choice_radius_px,
                    }
                )
            }
  
            return active_regions
        }
  
        let choice_clicked_func = get_mouse_listener(
            get_active_regions,
            on_valid_response,
        )
  
        let screen_node = {
            type: jsPsychPsychophysics,
            stimuli: assemble_stimuli,
            background_color: function () {
                return MTS_TASK_GLOBALS.BACKGROUND_COLOR
            },
            response_type: function() {
                console.log("keypress_fj_response:")
                console.log(jsPsych.timelineVariable('keypress_fj_response'))
                if (jsPsych.timelineVariable('keypress_fj_response')){
                    return 'key'
                } else {
                    return 'mouse'
                }
            },
            response_ends_trial: function() {
                if (jsPsych.timelineVariable('keypress_fj_response')){
                    return true
                } else {
                    return false
                }
            },
            mouse_down_func: null,
            choices: function() {
                if (jsPsych.timelineVariable('keypress_fj_response')){
                    return ['f', 'j']
                } else {
                    return undefined
                }
            },
            response_start_time: jsPsych.timelineVariable('pre_choice_lockout_delay_duration_msec'),
            trial_duration: function () {
                let stimulus_duration_msec = jsPsych.timelineVariable('stimulus_duration_msec');
                let post_stimulus_delay_msec = jsPsych.timelineVariable('post_stimulus_delay_duration_msec');
                let pre_choice_lockout_delay_duration_msec = jsPsych.timelineVariable('pre_choice_lockout_delay_duration_msec');
                let choice_duration_msec = jsPsych.timelineVariable('choice_duration_msec') || undefined;
                let max_trial_duration = stimulus_duration_msec + post_stimulus_delay_msec + pre_choice_lockout_delay_duration_msec + choice_duration_msec || undefined;
                return max_trial_duration
            },
            canvas_width: function () {
                return MTS_TASK_GLOBALS.get_canvas_width_pixels();
            },
            canvas_height: function () {
                return MTS_TASK_GLOBALS.get_canvas_height_pixels();
            },
            canvas_offsetX: 0,
            canvas_offsetY: 0,
            clear_canvas: true,
            remain_canvas: false,
            show_start_time: 0,
            show_end_time: undefined,
            on_start: function (trial) {
                if (!jsPsych.timelineVariable('keypress_fj_response')) {
                    trial.mouse_down_func = choice_clicked_func;
                }
  
                let stimulus_duration_msec = jsPsych.timelineVariable('stimulus_duration_msec', true);
                let post_stimulus_delay_msec = jsPsych.timelineVariable('post_stimulus_delay_duration_msec');
                let pre_choice_lockout_delay_duration_msec = jsPsych.timelineVariable('pre_choice_lockout_delay_duration_msec');
  
                let timeout_msec = stimulus_duration_msec + post_stimulus_delay_msec + pre_choice_lockout_delay_duration_msec || 200;
                timeout_msec = timeout_msec + 100;
                setTimeout(
                    () => {
                        document.body.style.cursor = 'auto'
                    }, timeout_msec
                );
            },
            on_finish: function (data) {
                let rel_timestamp_response = performance.now()
                let reaction_time_msec = rel_timestamp_response - t0_choices_drawn;
  
                // Increment progressbar
                let cur_progress_bar_value = jsPsych.getProgressBarCompleted();
                jsPsych.setProgressBar(cur_progress_bar_value + (1 / MTS_TASK_GLOBALS.NTRIALS));
  
                // Log processed data
                stimulus_drawn = false;
                choices_drawn = false;
                // Evaluate choice if there is a correct choice
                let i_correct_choice = jsPsych.timelineVariable('i_correct_choice');
                let no_correct_choice_exists = i_correct_choice === null || typeof i_correct_choice === 'undefined';
                let correct_choice_exists = !no_correct_choice_exists;
                let gt;
                let i_choice;
  
                let fj_response = jsPsych.timelineVariable('keypress_fj_response');
  
                if (fj_response) { // For keyboard (f/j) responses
                    i_choice = data['response'] === 'f' ? 0 : (data['response'] === 'j' ? 1 : data['response']);
                    if (correct_choice_exists === false) {
                        gt = null;
                    } else {
                        gt = i_choice === i_correct_choice ? 1 : 0;
                    }
                } else { // For mouse responses
                    if (correct_choice_exists === false) {
                        gt = null;
                    } else {
                        if (!data['choices_made'] || i_correct_choice >= data['choices_made'].length) {
                            console.log('choices_made is null, or undefined, or i_correct_choice is out of bounds.')
                            gt = null
                        } else {
                            gt = data['choices_made'][i_correct_choice] === true ? 1 : 0;
                        }
                    }
                    i_choice = data['i_choice']
                }
  
                let trial_outcome = {}
                let tstart = performance.timing.navigationStart;
                let tstart_trial = data['time_elapsed'] // Round to the millisecond
                trial_outcome['timestamp_start'] = (tstart + tstart_trial) / 1000 // Unix timestamp
                trial_outcome['choices_made'] = data['choices_made']
                trial_outcome['i_choice'] = i_choice
                
                trial_outcome['i_correct_choice'] = i_correct_choice;
                trial_outcome['rel_timestamp_response'] = rel_timestamp_response
                trial_outcome['perf'] = gt; // Needed for feedback screen
                trial_outcome['reaction_time_msec'] = reaction_time_msec;
  
                delete data['choices_made']
                delete data['rel_timestamp_response']
                delete data['reaction_time_msec']
                delete data['i_choice']
  
                trial_outcome['trial_type'] = jsPsych.timelineVariable('trial_type', true)
  
                trial_outcome['block'] = jsPsych.timelineVariable('block', true)
                trial_outcome['stimulus_image_url'] = jsPsych.timelineVariable('stimulus_image_url', true)
                trial_outcome['class'] = jsPsych.timelineVariable('class', true)
                trial_outcome['choice_names'] = jsPsych.timelineVariable('choice_names', true)
                trial_outcome['choice_image_urls'] = jsPsych.timelineVariable('choice_image_urls', true)
                trial_outcome['query_string'] = jsPsych.timelineVariable('query_string', true)
                trial_outcome['stimulus_duration_msec'] = jsPsych.timelineVariable('stimulus_duration_msec', true)
                trial_outcome['post_stimulus_delay_duration_msec'] = jsPsych.timelineVariable('post_stimulus_delay_duration_msec', true)
                trial_outcome['pre_choice_lockout_delay_duration_msec'] = jsPsych.timelineVariable('pre_choice_lockout_delay_duration_msec', true)
                trial_outcome['choice_duration_msec'] = jsPsych.timelineVariable('choice_duration_msec', true)
                trial_outcome['keep_stimulus_on'] = jsPsych.timelineVariable('keep_stimulus_on', true)
                trial_outcome['trial_number'] = MTS_TASK_GLOBALS.TRIALS_COMPLETED;
                trial_outcome['stimulus_width_px'] = stimulus_width_px
                trial_outcome['choice_width_px'] = choice_width_px
                trial_outcome['monitor_width_px'] = trial_monitor_width_px;
                trial_outcome['monitor_height_px'] = trial_monitor_height_px;
                
                trial_outcome['stimulus_name'] = trial_outcome['choice_names'][trial_outcome['i_correct_choice']]  
                trial_outcome['choice_name'] = trial_outcome['choice_names'][trial_outcome['i_choice']]
  
                trial_outcome['condition_idx'] = jsPsych.timelineVariable('condition_idx', true)
  
                // Set condition_idx (to be collected as metadata). 'Inconsistent' if more than one different value is provided. 
                if (condition_idx === null) {
                    condition_idx = trial_outcome['condition_idx']
                    jsPsych.data.addProperties({'condition_idx': condition_idx})
                } else if (condition_idx != trial_outcome['condition_idx']) {
                    condition_idx = 'INCONSISTENT'
                }
  
                let bonus_usd_if_correct = jsPsych.timelineVariable('bonus_usd_if_correct', true) || 0;
                trial_outcome['bonus_usd_if_correct'] = bonus_usd_if_correct;
  
                data['trial_outcome'] = trial_outcome
                MTS_TASK_GLOBALS.TRIALS_COMPLETED += 1;
                if (MTS_TASK_GLOBALS.CORRECT_CLASS_COUNTS[trial_outcome['class']] === undefined) {
                  MTS_TASK_GLOBALS.CORRECT_CLASS_COUNTS[trial_outcome['class']] = 0;
                }
                if (correct_choice_exists === true) {
                    if (gt === 1) {
                        if (trial_outcome['trial_type'] != "repeat_stimulus" && trial_outcome['trial_type'] != "calibration") {
                          MTS_TASK_GLOBALS.CORRECT_TRIALS_COUNT += 1;
                          MTS_TASK_GLOBALS.BONUS_USD_EARNED += bonus_usd_if_correct;
                          MTS_TASK_GLOBALS.CORRECT_CLASS_COUNTS[trial_outcome['class']]++;
                        }
                    }
                }
  
                jsPsych.getCurrentTrial().funcs.dispose();
            }
        }
  
        return screen_node
    }
  
  
    static get_intertrial_node() {
  
        return MTS_Trial_Nodes.get_blank_screen_node(
            () => {
                return MTS_TASK_GLOBALS.BACKGROUND_COLOR
            },
            () => {
                return MTS_TASK_GLOBALS.get_canvas_width_pixels()
            },
            () => {
                return MTS_TASK_GLOBALS.get_canvas_height_pixels()
            },
            jsPsych.timelineVariable('intertrial_delay_duration_msec'),
        )
    }
  }