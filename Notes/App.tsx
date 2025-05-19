import React, { useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import './App.css';

// Interface for emotion-word pair
interface EmotionWordPair {
  emotion: string;
  word: string;
  color: string;
  timestamp: number;
}

const App: React.FC = () => {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [detectedEmotion, setDetectedEmotion] = useState<string>('');
  const [emotionColor, setEmotionColor] = useState<string>('#ffffff');
  const [emotionWordPairs, setEmotionWordPairs] = useState<EmotionWordPair[]>([]);
  
  // Buffer for microexpression detection
  const expressionBufferRef = useRef<{timestamp: number, expression: string, confidence: number}[]>([]);
  const lastWordRef = useRef<string>('');
  const currentWordRef = useRef<string>('');
  const frameCountRef = useRef<number>(0);
  
  // Speech recognition
  const { transcript, listening, browserSupportsSpeechRecognition } = useSpeechRecognition();
  
  // Track words for correlation with microexpressions
  useEffect(() => {
    if (transcript) {
      const words = transcript.trim().split(' ');
      if (words.length > 0) {
        const latestWord = words[words.length - 1];
        if (latestWord !== lastWordRef.current) {
          lastWordRef.current = currentWordRef.current;
          currentWordRef.current = latestWord;
        }
      }
    }
  }, [transcript]);

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

  // Detect faces and expressions with high-frequency sampling
  useEffect(() => {
    if (isModelLoaded) {
      // Using requestAnimationFrame for higher frequency sampling
      // This typically runs at 60fps, giving ~16.7ms between frames (1/60 second)
      // which is within the 1/25 to 1/5 second range for microexpressions
      let animationFrameId: number;
      
      const detectExpressions = async () => {
        frameCountRef.current += 1;
        
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
            );
            
            const expressionName = dominantExpression[0];
            const confidence = dominantExpression[1];
            
            // Add to buffer with timestamp
            expressionBufferRef.current.push({
              timestamp: Date.now(),
              expression: expressionName,
              confidence: confidence
            });
            
            // Keep buffer size manageable (last 2 seconds at ~60fps = 120 frames)
            if (expressionBufferRef.current.length > 120) {
              expressionBufferRef.current.shift();
            }
            
            // Analyze buffer for microexpressions (rapid changes)
            analyzeForMicroexpressions();
            
            // Map to Paul Ekman's six basic emotions for current display
            let ekmanEmotion = expressionName;
            let color = '#ffffff';
            
            switch (expressionName) {
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
        
        // Continue the animation loop
        animationFrameId = requestAnimationFrame(detectExpressions);
      };
      
      // Start the detection loop
      animationFrameId = requestAnimationFrame(detectExpressions);
      
      // Cleanup function
      return () => {
        cancelAnimationFrame(animationFrameId);
      };
    }
  }, [isModelLoaded]);
  
  // Function to analyze the buffer for microexpressions
  const analyzeForMicroexpressions = () => {
    if (expressionBufferRef.current.length < 3) return;
    
    // Get the most recent entries
    const recentExpressions = expressionBufferRef.current.slice(-10);
    
    // Look for rapid changes in expression
    for (let i = 1; i < recentExpressions.length - 1; i++) {
      const prev = recentExpressions[i-1];
      const current = recentExpressions[i];
      const next = recentExpressions[i+1];
      
      // Check if current expression is different from both previous and next
      // This indicates a brief microexpression
      if (current.expression !== prev.expression && 
          current.expression !== next.expression &&
          prev.expression === next.expression) {
        
        // Calculate duration of the expression
        const duration = next.timestamp - prev.timestamp;
        
        // Check if duration is within microexpression range (40-200ms)
        if (duration >= 40 && duration <= 200) {
          // This is likely a microexpression
          const word = currentWordRef.current || lastWordRef.current;
          
          if (word) {
            // Map to Ekman emotion
            let ekmanEmotion = current.expression;
            let color = '#ffffff';
            
            switch (current.expression) {
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
            
            // Add to emotion-word pairs
            setEmotionWordPairs(prevPairs => {
              // Avoid duplicates
              const isDuplicate = prevPairs.some(
                pair => pair.emotion === ekmanEmotion && pair.word === word && 
                        Date.now() - pair.timestamp < 2000
              );
              
              if (!isDuplicate) {
                return [...prevPairs, {
                  emotion: ekmanEmotion,
                  word: word,
                  color: color,
                  timestamp: Date.now()
                }];
              }
              return prevPairs;
            });
          }
        }
      }
    }
  };

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
      
      <div className="emotion-word-pairs-container">
        <h3>Detected Microexpressions</h3>
        <div className="emotion-word-pairs">
          {emotionWordPairs.slice().reverse().map((pair, index) => (
            <div key={index} className="emotion-word-pair">
              <span className="emotion" style={{ color: pair.color }}>{pair.emotion}</span>
              <span className="word">"{pair.word}"</span>
            </div>
          ))}
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
