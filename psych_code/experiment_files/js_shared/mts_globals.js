let MTS_TASK_GLOBALS = new class {
  constructor() {
      /*
      Get default viewing parameters (legacy choices)
      Legacy choice is that 17.5% of the smallest screen dimension corresponds to 6 degrees of visual angle.
       */

      let reference_degrees_default = 6;
      let reference_proportion_default = 0.175;
      let screen_s = Math.min(window.screen.height, window.screen.width); // Min of height and width
      let viewing_distance_pixels_default = (reference_proportion_default * screen_s / 2) / Math.tan((reference_degrees_default / 2) * Math.PI / 180)

      function infer_canvas_size_legacy() {
          // Present the canvases at 70% of the smallest screen dimension
          let [screen_height, screen_width] = [window.screen.height, window.screen.width]
          let screen_margin = 0.3;
          return Math.round(Math.min(screen_height, screen_width)) * (1 - screen_margin);
      }

      this.BACKGROUND_COLOR = '#7F7F7F';
      this.VIEWING_DISTANCE_PIXELS = viewing_distance_pixels_default;

      //this.CANVAS_HEIGHT_PIXELS = get_size()//infer_canvas_size_legacy();
      //this.CANVAS_WIDTH_PIXELS = get_size(); //infer_canvas_size_legacy();
      this.CALIBRATED = false;

      /*
      HUD parameters for tracking
       */
      this.BONUS_USD_EARNED = 0;
      this.TRIALS_COMPLETED = 0;
      this.NTRIALS = 0;

      this.CORRECT_TRIALS_COUNT = 0;
      this.CORRECT_CLASS_COUNTS = {};
  }

  _get_size() {
      let [h, w] = [0.90 * window.innerHeight, 0.95 * window.innerWidth];
      return Math.round(Math.min(h, w))

  }

  get_canvas_height_pixels() {
      return this._get_size();
  }

  get_canvas_width_pixels() {
      return this._get_size();
  }

  calibrate_viewing_distance(viewing_distance_pixels) {
      if (typeof viewing_distance_pixels === 'number') {
          if (viewing_distance_pixels > 0) {
              this.VIEWING_DISTANCE_PIXELS = viewing_distance_pixels;
              this.CALIBRATED = true;
          }
      }
  }

  stimulus_degrees_to_pixels(degrees) {
      /*
      Convert degrees of visual angle to pixels on the screen, assuming stimulus is
      presented at normal angle.
       */

      let radians = degrees * Math.PI / 180;
      let pixels = 2 * this.VIEWING_DISTANCE_PIXELS * Math.tan(radians / 2);

      // Safety checks
      // Underflow
      let min_pixels = 0;
      let max_pixels = Math.min(this.get_canvas_height_pixels(), this.get_canvas_width_pixels())
      if (pixels < 0) {
          pixels = min_pixels;
      }
      // Overflow
      if (pixels > max_pixels) {
          pixels = max_pixels
      }

      return pixels
  }
}()