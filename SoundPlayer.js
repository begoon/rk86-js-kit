export class SoundPlayer {
    /**
     * @param {AudioContext} audioContext
     */
    constructor(audioContext) {
        this.audioCtx = audioContext;
        this.gainNode = this.audioCtx.createGain();
        this.gainNode.connect(this.audioCtx.destination);
        this.oscillator = null;
    }

    /**
     *
     * @param {number} freq
     * @param {number} volume
     * @param {OscillatorType} wave
     */
    play(freq, volume, wave) {
        this.oscillator = this.audioCtx.createOscillator();
        this.oscillator.connect(this.gainNode);
        this.oscillator.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
        if (wave) {
            this.oscillator.type = wave;
        }
        this.gainNode.gain.value = volume;
        this.oscillator.start();
    }

    /**
     * @param {number} when
     */
    stop(when) {
        const offset = when || 0.05;
        if (this.oscillator) this.oscillator.stop(this.audioCtx.currentTime + offset);
    }
}
