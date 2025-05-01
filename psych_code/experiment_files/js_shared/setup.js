const params = getUrlParameters();
let platform = params.PLATFORM || null;
const pid_from_url = params.PID || params.PROLIFIC_PID || null;
const study_id_from_url = params.STUDY_ID || null;
const trialset_id_from_url = params.TRIALSET_ID || null;
let assignment_id_global = params.SESSION_ID || null;  


let session_settings = {
  "instructions_html": "\n            <ul>\n                <li>Thank you for your joining our study! This task involves making judgements about pictures. \n                <li>To start a trial, press the white \"+\" button at the center of the screen.\n                <li>Once the trial starts, a picture will be shown to you. Then, some choices will appear.</li>\n                <li><b>Your task</b> is to click the choice which best describes the first image.\n                <li>Making accurate choices will <text style=\"color:green; font-style:oblique\">increase your bonus payout</text>, but random guessing will lead to <text style=\"color:red; font-style:oblique\">no bonus</text> and to the task ending early.</li>\n     <li>Some trials may be extremely challenging or ambiguous. We cannot guarantee that it is possible to choose accurately in all cases.</li>\n                <li>We reserve the right to end the experiment at any time.</li>\n                <li>If you encounter a bug (e.g., the task freezing), please contact us and let us know. You will be compensated for your time.\n            <li>If you wish, you may view our full consent form document <a href=\"https://morgan-study-misc.s3.amazonaws.com/Consent_Form_19Nov2019.pdf\">here.</a></li>\n                <li>By clicking \"Continue,\" you voluntarily agree to be a participant in our experiment and agree to all of the rules above.</li>\n                </ul>",
  "warmup_complete_instructions_html": "\n <ul>\n    <li>Warmup complete!</li>\n   <li>From now on, images will become more abstract. Please try your best to make your choices within <b>10 seconds</b>.</li>\n  <li>There will be no feedback from now on, but <b>accurate choices will still increase your bonus.</b> </li>   </ul>",
  "screening_out_instructions_html": "\n <ul>\n    <li> This study requires a certain level of task performance that wasn't met in the initial phase. Your effort is appreciated, and you will be compensated for <b>up to 5 minutes</b> of your time for the initial phase. </li>  <li> If you wish to <b>try again</b>, you may refresh the page up to 2 times in total (keep in mind that your time limit will not reset) </li>  <li> To <b>conclude</b> your participation, press Continue.</li>   </ul>",
  "calibrate_monitor": true,
  "force_fullscreen": false
};