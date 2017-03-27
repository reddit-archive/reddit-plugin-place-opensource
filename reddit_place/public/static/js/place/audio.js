!r.placeModule('audio', function(require) {
  /**
   * Utility for getting the frequency of a note.
   * The formula can be found here http://www.phy.mtu.edu/~suits/NoteFreqCalcs.html
   * Uses the A440 pitch standard, with A4 is defined as the 69th key (as it is in MIDI).
   * @function
   * @param {number} key A number representing a key on the piano scale.  A value of
   *    1 represents a half-step on the scale.
   * @returns {number} The frequency (Hz) of the note.
   */
  function getKeyFrenquency(key) {
    return Math.pow(2, (key - 69) / 12) * 440;
  }

  // We're going to create a map of human-readable key indicies to
  // frequencies, so that we don't need to constantly calculate them *and*
  // so they are a little more friendly to use (i.e. 'C4' is easier to
  // think about as 'middle C' than the number 60 or the frequency 261.63)

  // Note letters.  Each note's number will be its index in this array;
  var NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  // Aliases so we can use 'flat' notes if needed.
  var NOTE_ALIASES = {
    'C#': 'D@',
    'D#': 'E@',
    'F#': 'G@',
    'G#': 'A@',
    'A#': 'B@',
  }

  // The number of octaves to map out in our Key map.
  var OCTAVES = 8;

  // Map of human-readable notes to key frequencies.
  // e.g. Keys['C4'] === 261.63
  var Keys = {};

  NOTES.forEach(function(note, noteIndex) {
    var i, key, freq;
    for (i = 0; i < OCTAVES; i++) {
      // The key number will be the octave number * 12 + the index of the current note.
      // We're offsetting the octave number by 1 so that middle C (key number 60) ends up being 'C4'.
      key = (i + 1) * 12 + noteIndex;
      freq = getKeyFrenquency(key);
      Keys[note + i] = freq;

      // If this note has an alias, add it to the map as well.
      if (note in NOTE_ALIASES) {
        Keys[NOTE_ALIASES[note] + i] = freq;
      }
    }
  });

  // Audio controller.  Must be initialized before use!
  return {
    audioCtx: null,
    audioGain: null,
    enabled: true,
    isSupported: true,

    init: function() {
      var AudioContext = window.AudioContext // Default
        || window.webkitAudioContext; // Safari and old versions of Chrome

      if (AudioContext) {
        this.audioCtx = new AudioContext();
        this.audioGain = this.audioCtx.createGain();
        this.audioGain.connect(this.audioCtx.destination);
      } else {
        this.enabled = false;
        this.isSupported = false;
      }
    },

    /**
     * Disable sound effects.
     * @function
     */
    disable: function() {
      this.enabled = false;
    },

    /**
     * Re-enable sound effects
     * @function
     */
    enable: function() {
      this.enabled = true;
    },

    /**
     * Schedules a frequency to be played between the given times.
     * Times are in seconds, relative to when the audio context was initialized.
     * @function
     * @param {number} frequency The frequency (Hz) of the note to play
     * @param {number} startTime Time (in seconds from initialization) to start playing
     * @param {number} stopTime Time (in seconds from initialization) to stop playing
     */
    scheduleAudio: function(frequency, startTime, stopTime) {
      var o = this.audioCtx.createOscillator();
      o.frequency.value = frequency;
      o.connect(this.audioGain);
      o.start(startTime);
      o.stop(stopTime);
    },

    /**
     * @typedef {Array} ClipNote
     * @property {number} 0 The frequency of the note
     * @property {number} 1 The duration of the note, in seconds
     */

    /**
     * Play a compiled audio clip right now.
     * @function
     * @param {ClipNote[]} audioClip A 2d array, where the inner arrays
     *    each contain a frequency as the first item and a duration (in seconds)
     *    as the second.
     * @param {number} [volume] optionally sets the volume.  Should be a float
     *    between 0 (muted) and 1 (full volume).  Defaults to globalVolume.
     */
    playClip: function(audioClip, volume) {
      if (!this.enabled) { return }

      volume = volume === undefined ? this.globalVolume : Math.max(0, Math.min(1, volume));

      this.audioGain.gain.value = volume;

      var currentTime = this.audioCtx.currentTime;

      var clipNote, frequency, duration;
      for (var i = 0; i < audioClip.length; i++) {
        clipNote = audioClip[i];
        frequency = clipNote[0];
        duration = clipNote[1];

        // Allows for defining rest notes as frequency 0;
        if (frequency) {
          this.scheduleAudio(frequency, currentTime, currentTime + duration);
        }

        currentTime += duration;
      }
    },

    /**
     * @typedef {Array} NoteDef
     * @property {string} 0 The human-readable key, e.g. "C4" or "B#5"
     * @property {number} 1 The duration of the note, in seconds
     */

    /**
     * Compile a list of human-readable notes for playback with AudioManager.playClip
     *
     *    var mySoundClip = AudioManager.compileClip([
     *      ['E4', 1/8], ['D4', 1/8], ['C4', 1/8], ['D4', 1/8], ['E4', 1/2],
     *    ]);
     *    AudioManager.playClip(mySoundClip);
     *
     * @function
     * @param {NoteDef[]}
     * @returns {ClipNote[]}
     */
    compileClip: function(noteList) {
      return noteList.map(function(noteDef) {
        var key = noteDef[0];
        var duration = noteDef[1];
        var frequency = Keys[key] || 0;
        return [frequency, duration];
      });
    },

    /**
     * Set the default volume for all clips played via playClip.
     * @function
     * @param {number} volume sets globalVolume.  Should be a float
     *    between 0 (muted) and 1 (full volume)
     */
    setGlobalVolume: function(volume) {
      this.globalVolume = Math.min(1, Math.max(0, volume));
    },
  };
});
