import React, { useEffect, useRef, useState } from 'react';
import './App.css';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import * as tf from '@tensorflow/tfjs';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

// Define interfaces for our data structures
interface EmotionWordPair {
  emotion: string;
  word: string;
  confidence: number;
  timestamp: number;
}

interface ExpressionData {
  timestamp: number;
  expression: string;
  confidence: number;
  expressionMap: Record<string, number>;
}

function App() {
  // References
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // State variables
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState('NEUTRAL');
  const [emotionWordPairs, setEmotionWordPairs] = useState<EmotionWordPair[]>([]);
  const [expressionBuffer, setExpressionBuffer] = useState<ExpressionData[]>([]);
  const [currentWord, setCurrentWord] = useState('');
  const [lastWord, setLastWord] = useState('');
  const [thresholdValue, setThresholdValue] = useState(0.65);
  
  // Speech recognition
  const { transcript, listening, browserSupportsSpeechRecognition } = useSpeechRecognition();
  
  // Emotion colors
  const emotionColors: Record<string, string> = {
    'ANGER': '#ff0000',     // Red
    'DISGUST': '#8b008b',   // Dark purple
    'FEAR': '#800080',      // Purple
    'ENJOYMENT': '#ffff00', // Yellow
    'SADNESS': '#0000ff',   // Blue
    'SURPRISE': '#ffa500',  // Orange
    'NEUTRAL': '#ffffff'    // White
  };
  
  // Load models on component mount
  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = `${process.env.PUBLIC_URL}/models`;
        
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
        ]);
        
        console.log('Models loaded successfully');
        setIsModelLoaded(true);
      } catch (error) {
        console.error('Error loading models:', error);
      }
    };
    
    loadModels();
    
    // Start speech recognition
    if (browserSupportsSpeechRecognition) {
      SpeechRecognition.startListening({ continuous: true, language: 'tr-TR' });
    }
    
    // Cleanup on unmount
    return () => {
      SpeechRecognition.stopListening();
    };
  }, [browserSupportsSpeechRecognition]);
  
  // Process transcript changes
  useEffect(() => {
    if (transcript) {
      const words = transcript.split(' ');
      if (words.length > 0) {
        setLastWord(currentWord);
        setCurrentWord(words[words.length - 1]);
      }
    }
  }, [transcript, currentWord]);
  
  // Start face detection when models are loaded and webcam is ready
  useEffect(() => {
    if (isModelLoaded && webcamRef.current?.video?.readyState === 4) {
      const detectFace = async () => {
        if (webcamRef.current && canvasRef.current) {
          const video = webcamRef.current.video as HTMLVideoElement;
          const canvas = canvasRef.current;
          
          // Set canvas dimensions
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          // Detect face and expressions
          const detection = await faceapi.detectSingleFace(
            video, 
            new faceapi.TinyFaceDetectorOptions()
          ).withFaceExpressions();
          
          if (detection) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              // Clear canvas
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              
              // Draw face box
              const box = detection.detection.box;
              ctx.strokeStyle = '#00ff00';
              ctx.lineWidth = 2;
              ctx.strokeRect(box.x, box.y, box.width, box.height);
              
              // Get dominant expression
              const expressions = detection.expressions;
              const dominantExpression = getDominantExpression(expressions);
              
              // Add to expression buffer
              const newExpressionData: ExpressionData = {
                timestamp: Date.now(),
                expression: dominantExpression.expression,
                confidence: dominantExpression.confidence,
                expressionMap: expressions
              };
              
              setExpressionBuffer(prevBuffer => {
                const newBuffer = [...prevBuffer, newExpressionData];
                // Keep last 120 frames (about 2 seconds at 60fps)
                if (newBuffer.length > 120) {
                  return newBuffer.slice(newBuffer.length - 120);
                }
                return newBuffer;
              });
              
              // Update current emotion display
              const ekmanEmotion = mapToEkmanEmotion(dominantExpression.expression);
              setCurrentEmotion(ekmanEmotion);
            }
          }
        }
        
        // Continue detection loop
        requestAnimationFrame(detectFace);
      };
      
      detectFace();
    }
  }, [isModelLoaded]);
  
  // Analyze buffer for microexpressions
  useEffect(() => {
    if (expressionBuffer.length < 5) return;
    
    // Microexpression time thresholds (in ms)
    const MIN_DURATION = 40;  // 1/25 second
    const MAX_DURATION = 200; // 1/5 second
    
    // Analyze last few frames
    const bufferLength = expressionBuffer.length;
    const prevFrame = expressionBuffer[bufferLength - 5];
    const startFrame = expressionBuffer[bufferLength - 4];
    const currentFrame = expressionBuffer[bufferLength - 3];
    const nextFrame = expressionBuffer[bufferLength - 2];
    const afterFrame = expressionBuffer[bufferLength - 1];
    
    // Look for microexpression pattern: previous-next expressions same, middle different
    if (startFrame.expression !== currentFrame.expression && 
        currentFrame.expression !== nextFrame.expression &&
        startFrame.expression === nextFrame.expression) {
      
      // Calculate duration
      const duration = nextFrame.timestamp - startFrame.timestamp;
      
      // Check if within microexpression time range
      if (duration >= MIN_DURATION && duration <= MAX_DURATION) {
        // Calculate confidence score
        const confidenceScore = calculateConfidenceScore(
          currentFrame.confidence,
          currentFrame.expressionMap[currentFrame.expression],
          duration
        );
        
        // Check against threshold
        if (confidenceScore > thresholdValue) {
          // Microexpression detected
          const microexpression = {
            emotion: currentFrame.expression,
            startTime: startFrame.timestamp,
            endTime: nextFrame.timestamp,
            duration: duration,
            confidence: confidenceScore
          };
          
          // Match with speech
          matchWithSpeech(microexpression);
        }
      }
    }
  }, [expressionBuffer, thresholdValue]);
  
  // Get dominant expression
  const getDominantExpression = (expressions: Record<string, number>) => {
    let maxValue = 0;
    let dominantExpression = 'neutral';
    
    for (const [expression, value] of Object.entries(expressions)) {
      if (value > maxValue) {
        maxValue = value;
        dominantExpression = expression;
      }
    }
    
    return {
      expression: dominantExpression,
      confidence: maxValue
    };
  };
  
  // Calculate confidence score
  const calculateConfidenceScore = (baseConfidence: number, emotionStrength: number, duration: number) => {
    // Ideal microexpression duration ~100ms
    const durationFactor = 1 - Math.abs(duration - 100) / 100;
    
    // Composite confidence score
    return baseConfidence * emotionStrength * durationFactor;
  };
  
  // Match microexpression with speech
  const matchWithSpeech = (microexpression: any) => {
    // Speech recognition delay (ms)
    const SPEECH_RECOGNITION_DELAY = 500;
    
    // Adjust microexpression time for speech recognition delay
    const adjustedMicroTime = microexpression.startTime - SPEECH_RECOGNITION_DELAY;
    
    // Match with word if available
    if (currentWord) {
      // Convert to Ekman emotion
      const ekmanEmotion = mapToEkmanEmotion(microexpression.emotion);
      
      // Save the match
      const emotionWordPair: EmotionWordPair = {
        emotion: ekmanEmotion,
        word: currentWord,
        confidence: microexpression.confidence,
        timestamp: Date.now()
      };
      
      // Add to list
      setEmotionWordPairs(prevPairs => [...prevPairs, emotionWordPair]);
    }
  };
  
  // Map to Ekman emotions
  const mapToEkmanEmotion = (emotion: string) => {
    const ekmanMap: Record<string, string> = {
      'angry': 'ANGER',
      'disgusted': 'DISGUST',
      'fearful': 'FEAR',
      'happy': 'ENJOYMENT',
      'sad': 'SADNESS',
      'surprised': 'SURPRISE',
      'neutral': 'NEUTRAL'
    };
    
    return ekmanMap[emotion] || emotion.toUpperCase();
  };
  
  return (
    <div className="app-container">
      <div className="webcam-container">
        <Webcam
          ref={webcamRef}
          mirrored={true}
          screenshotFormat="image/jpeg"
          videoConstraints={{
            facingMode: "user"
          }}
        />
        <canvas ref={canvasRef} className="overlay" />
      </div>
      
      <div className="text-display">
        <div 
          className="emotion-text"
          style={{ color: emotionColors[currentEmotion] || '#ffffff' }}
        >
          {currentEmotion}
        </div>
        <div className="transcript-text">{transcript}</div>
      </div>
      
      <div className="emotion-word-pairs-container">
        <h3>Tespit Edilen Mikromimikler</h3>
        <div className="emotion-word-pairs">
          {emotionWordPairs.slice(-10).reverse().map((pair, index) => (
            <div className="emotion-word-pair" key={index}>
              <span 
                className="emotion"
                style={{ color: emotionColors[pair.emotion] || '#ffffff' }}
              >
                {pair.emotion}
              </span>
              <span className="word">"{pair.word}"</span>
            </div>
          ))}
        </div>
      </div>
      
      {!isModelLoaded && (
        <div className="loading-overlay">
          <div className="loading-text">Modeller yükleniyor...</div>
        </div>
      )}
      
      {!browserSupportsSpeechRecognition && (
        <div className="error-message">
          Tarayıcınız konuşma tanımayı desteklemiyor.
        </div>
      )}
    </div>
  );
}

export default App;
