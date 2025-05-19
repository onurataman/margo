import React, { useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import './App.css';

const App: React.FC = () => {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [detectedEmotion, setDetectedEmotion] = useState<string>('');
  const [emotionColor, setEmotionColor] = useState<string>('#ffffff');

  const { transcript, listening, browserSupportsSpeechRecognition } = useSpeechRecognition();

  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = '/models/weights';
        
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
        ]);
        
        setIsModelLoaded(true);
        console.log('Models loaded successfully');
      } catch (error) {
        console.error('Error loading models:', error);
      }
    };

    loadModels();
  }, []);

  // Start speech recognition
  useEffect(() => {
    if (browserSupportsSpeechRecognition && !listening) {
      SpeechRecognition.startListening({ continuous: true });
    }
    
    return () => {
      SpeechRecognition.stopListening();
    };
  }, [browserSupportsSpeechRecognition, listening]);

  // Detect faces and expressions
  useEffect(() => {
    if (isModelLoaded) {
      const interval = setInterval(async () => {
        if (webcamRef.current && webcamRef.current.video && webcamRef.current.video.readyState === 4) {
          const video = webcamRef.current.video;
          const canvas = canvasRef.current;
          
          if (!canvas) return;
          
          // Set canvas dimensions to match video
          const displaySize = { width: video.videoWidth, height: video.videoHeight };
          faceapi.matchDimensions(canvas, displaySize);
          
          // Detect faces with expressions
          const detections = await faceapi
            .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceExpressions();
          
          if (detections && detections.length > 0) {
            // Get the dominant expression
            const expressions = detections[0].expressions;
            const dominantExpression = Object.entries(expressions).reduce(
              (prev, current) => (prev[1] > current[1] ? prev : current)
            )[0];
            
            // Map to Paul Ekman's six basic emotions
            let ekmanEmotion = dominantExpression;
            let color = '#ffffff';
            
            switch (dominantExpression) {
              case 'angry':
                ekmanEmotion = 'ANGER';
                color = '#ff0000'; // Red
                break;
              case 'disgusted':
                ekmanEmotion = 'DISGUST';
                color = '#8b008b'; // Dark magenta
                break;
              case 'fearful':
                ekmanEmotion = 'FEAR';
                color = '#800080'; // Purple
                break;
              case 'happy':
                ekmanEmotion = 'ENJOYMENT';
                color = '#ffff00'; // Yellow
                break;
              case 'sad':
                ekmanEmotion = 'SADNESS';
                color = '#0000ff'; // Blue
                break;
              case 'surprised':
                ekmanEmotion = 'SURPRISE';
                color = '#ffa500'; // Orange
                break;
              default:
                ekmanEmotion = 'NEUTRAL';
                color = '#ffffff'; // White
            }
            
            setDetectedEmotion(ekmanEmotion);
            setEmotionColor(color);
          }
        }
      }, 100);
      
      return () => clearInterval(interval);
    }
  }, [isModelLoaded]);

  if (!browserSupportsSpeechRecognition) {
    return <div className="error-message">Browser doesn't support speech recognition.</div>;
  }

  return (
    <div className="app-container">
      <div className="webcam-container">
        <Webcam
          ref={webcamRef}
          audio={false}
          width="100%"
          height="100%"
          screenshotFormat="image/jpeg"
          videoConstraints={{
            facingMode: "user"
          }}
        />
        <canvas ref={canvasRef} className="webcam-overlay" />
      </div>
      
      <div className="text-display">
        <div 
          className="emotion-text"
          style={{ color: emotionColor }}
        >
          {detectedEmotion}
        </div>
        <div className="transcript-text">
          {transcript}
        </div>
      </div>
      
      {!isModelLoaded && (
        <div className="loading-overlay">
          <div className="loading-text">Loading models...</div>
        </div>
      )}
    </div>
  );
};

export default App;
