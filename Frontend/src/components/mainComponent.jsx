import React, { useState, useRef } from "react";
import axios from "axios";

export default function MainComponent() {
  const [showTranscriber, setShowTranscriber] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [summary, setSummary] = useState("");

  // Replace with your actual values
  const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
  const GROQ_API_URL = import.meta.env.VITE_GROQ_API_URL;

  const transcribeSendToServer = async (textRes) => {
    try {
      if (!textRes || textRes.trim() === "") {
        throw new Error("Empty transcription result. Nothing to send.");
      }

      const response = await axios.post(
        "http://localhost:80/transcribe",
        { audio: textRes },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Backend response:", response.data);
      setSummary(response.data);
      return response.data;
    } catch (error) {
      console.error("❌ Error sending transcription to server:", error);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        setAudioBlob(audioBlob);
        processAudio(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };


      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("Couldn't start recording. Please allow microphone access!");
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob) => {
    if (!audioBlob) return;

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", audioBlob, "recording.webm");
      formData.append("model", "whisper-large-v3");
      formData.append("response_format", "json");

      const response = await axios.post(GROQ_API_URL, formData, {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "multipart/form-data",
        },
      });

      const transcription = response.data.text || response.data.transcription;
      console.log("Transcription received:", transcription);
      if (transcription) {
        transcribeSendToServer(transcription);
      } else {
        throw new Error("No transcription returned");
      }
    } catch (error) {
      console.error("Error processing audio:", error);
      alert("❌ Oops! Couldn't transcribe the audio!");
    } finally {
      setIsLoading(false);
      setAudioBlob(null);
    }
  };

  const renderTranscriber = () => {
    return (
      <div className="w-full h-full bg-white rounded-lg p-5 flex flex-col justify-between font-sans">
        {/* Header */}
        <h2 className="text-xl font-bold text-gray-800 text-center mb-4">
          🎙 Meeting Summarizer
        </h2>

        {/* Content */}
        <div className="flex flex-col items-center mt-3">
          {isRecording && (
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse mb-2"></div>
          )}
          <p className="text-sm text-gray-600">
            {isRecording
              ? "Recording... Tap stop to finish."
              : "Press start to record your audio."}
          </p>
        </div>
        <div className="flex justify-center gap-3 mt-4">
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="px-5 py-2 bg-green-500 hover:bg-green-600 active:scale-95 transition text-white rounded-lg shadow-md"
              disabled={isLoading}
            >
              Start
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="px-5 py-2 bg-red-500 hover:bg-red-600 active:scale-95 transition text-white rounded-lg shadow-md"
              disabled={isLoading}
            >
              Stop
            </button>
          )}
        </div>

        {summary && (
          <div className="mt-4 p-3 bg-gray-100 rounded-lg text-sm text-gray-800 overflow-y-auto max-h-32">
            <h3 className="font-semibold mb-1">📝 Meeting Summary:</h3>
            <p>{summary}</p>
          </div>
        )}

        {isLoading && (
          <div className="flex justify-center items-center mt-4">
            <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-2 text-sm text-gray-600">Processing...</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex justify-center items-center h-screen">
      {!showTranscriber ? (
        <button
          onClick={() => setShowTranscriber(true)}
          className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg shadow-md transition"
        >
          Open Audio Transcriber
        </button>
      ) : (
        renderTranscriber()
      )}
    </div>
  );
}





