class PCMCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.samples = [];
  }
  process(inputs) {
    const input = inputs[0]?.[0];
    if (input) {
      for (const sample of input) this.samples.push(sample);
      if (this.samples.length >= 2048) {
        const block = Float32Array.from(this.samples);
        this.port.postMessage(block, [block.buffer]);
        this.samples = [];
      }
    }
    return true;
  }
}
registerProcessor("pcm-capture", PCMCapture);
