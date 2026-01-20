class AudioProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.bufferSize = 2048; // ~128ms at 16kHz
        this.buffer = new Int16Array(this.bufferSize);
        this.bytesWritten = 0;
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (input && input.length > 0) {
            const inputChannelData = input[0];

            for (let i = 0; i < inputChannelData.length; i++) {
                // Convert to PCM16
                const s = Math.max(-1, Math.min(1, inputChannelData[i]));
                this.buffer[this.bytesWritten++] = s < 0 ? s * 0x8000 : s * 0x7FFF;

                // Flush if buffer is full
                if (this.bytesWritten >= this.bufferSize) {
                    this.port.postMessage(this.buffer, [this.buffer.buffer]);
                    // Create new buffer (transfer detaches the old one)
                    this.buffer = new Int16Array(this.bufferSize);
                    this.bytesWritten = 0;
                }
            }
        }
        return true;
    }
}

registerProcessor('audio-processor', AudioProcessor);
