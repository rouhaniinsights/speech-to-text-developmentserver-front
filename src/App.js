import React, { useState, useRef } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const audioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("Processing...");
    setLoading(10);

    const formData = new FormData();
    formData.append('file', file || audioBlob);

    try {
      setLoading(30);
      const response = await axios.post('http://127.0.0.1:5000//process-audio', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setResult(response.data);
      setStatus("Processing complete!");
      setLoading(100);
    } catch (error) {
      console.error("Error:", error.response ? error.response.data : error.message);
      setStatus("An error occurred: " + (error.response ? error.response.data.error : error.message));
      setLoading(0);
    }
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setAudioBlob(audioBlob);
        const audioUrl = URL.createObjectURL(audioBlob);
        audioRef.current.src = audioUrl;
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
    }
  };

  const handleStopRecording = () => {
    mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  const handlePlayAudio = () => {
    if (result && result.corrected_transcription) {
      const speech = new SpeechSynthesisUtterance(result.corrected_transcription);
      speech.lang = 'en-US';
      speech.onstart = () => setIsPlaying(true);
      speech.onend = () => setIsPlaying(false);
      window.speechSynthesis.speak(speech);
    }
  };
  const handleStopAudio = () => {
    window.speechSynthesis.cancel(); // Stop the audio
    setIsPlaying(false); // Update the state
  };

  const handleDownloadAudio = () => {
    if (audioBlob) {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(audioBlob);
      link.download = 'recorded_audio.wav';
      link.click();
    }
  };
  const handleDownloadEnhancedAudio = async () => {
    if (result && result.corrected_transcription) {
      try {
        const response = await axios.post(
          'https://speech-to-text-backend.onrender.com/generate-audio',
          { text: result.corrected_transcription },
          { responseType: 'blob' } // Important to handle binary data
        );
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'enhanced_audio.mp3');
        document.body.appendChild(link);
        link.click();
      } catch (error) {
        console.error("Error downloading enhanced audio:", error);
      }
    }
  };
  
  

  return (
    <div className="App">
      <h1>Speech Enhancer App</h1>

      {/* File Upload Section */}
      <form onSubmit={handleSubmit} className="form-container">
        <input type="file" onChange={handleFileChange} className="file-input" />
        <button type="submit" className="submit-button">Upload and Process</button>
      </form>

      <div className="separator"></div>

      {/* Microphone Recording Section */}
       <div className="microphone-container">
        {!isRecording ? (
          <button onClick={handleStartRecording} className="microphone-button">Start Recording</button>
        ) : (
          <button onClick={handleStopRecording} className="microphone-button stop">Stop Recording</button>
        )}
        {audioBlob && (
          <>
             <audio ref={audioRef} controls='true' className="audio-player" /> 
            <button onClick={handleDownloadAudio} className="audio-button">Download Recorded Audio</button>
          </>
         )} 
      </div> 

      {status && <p className="status">{status}</p>}

      {/* Progress Bar */}
      {loading > 0 && (
        <div className="progress-container">
          <div className="progress-bar" style={{ width: `${loading}%` }}></div>
        </div>
      )}

      {result && (
        <div className="results-container">
           {/* Raw and Enhanced Transcription Section  */}
          <div className="section">
            <h3 className="section-header">Transcription Results</h3>
            <p><strong>Raw Transcription:</strong> {result.raw_transcription}</p>
            <p><strong>Enhanced Transcription:</strong> {result.corrected_transcription}</p>
          </div>

          <div className="audio-controls">
          <p>If you want to listen to the enhanced_audio transcription then click Play.</p>
            <button onClick={handlePlayAudio} className="audio-button" disabled={isPlaying}>
              {isPlaying ? 'Playing...' : 'Play Enhanced Audio'}
            </button>
            <button onClick={handleStopAudio} className="audio-button" disabled={!isPlaying}
            style={{margin:'3px'}}>
            Stop Audio
          </button>
             <p>If you want to download the enhanced_audio transcription then click on the button.</p>
            <button onClick={handleDownloadEnhancedAudio} className="audio-button">Download Enhanced Audio
            </button> 
          </div>

          <div className="separator"></div>

          {/* Phoneme Comparison Table */}
          {result.phoneme_comparison_data && (
            <div className="section">
              <h3 className="section-header">Phoneme Comparison (Raw vs Corrected)</h3>
              <table className="styled-table">
                <thead>
                  <tr>
                    <th>Raw Word</th>
                    <th>Raw Phonemes</th>
                  </tr>
                </thead>
                <tbody>
                  {result.phoneme_comparison_data.map((item, index) => (
                    <tr key={index}>
                      <td>{item["Raw Word"]}</td>
                      <td>{item["Raw Phonemes"]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="separator"></div>

          {/* Enhanced Text Phonemes */}
          {result.enhanced_phoneme_data && (
            <div className="section">
              <h3 className="section-header">Enhanced Text Phonemes</h3>
              <table className="styled-table">
                <thead>
                  <tr>
                    <th>Enhanced Word</th>
                    <th>Enhanced Phonemes</th>
                  </tr>
                </thead>
                <tbody>
                  {result.enhanced_phoneme_data.map((item, index) => (
                    <tr key={index}>
                      <td>{item["Enhanced Word"]}</td>
                      <td>{item["Enhanced Phonemes"]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="separator"></div>

          {/* Download Links */}
          <div className='userlogs'>
            <h1>User Log</h1>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
