# Microexpression Analysis Web App - Documentation

## Overview
This web application uses your device's webcam to identify facial microexpressions based on Paul Ekman's six basic emotions (anger, surprise, disgust, enjoyment, fear, and sadness) and displays them alongside spoken words in real-time.

## Features
- Real-time webcam access and video display
- Facial microexpression detection using face-api.js
- Speech-to-text functionality to capture spoken words
- Large text display of detected emotions and spoken words
- Mobile-friendly responsive design
- Color-coded emotion display for better visual feedback

## Technologies Used
- React with TypeScript
- face-api.js for facial expression detection
- TensorFlow.js for machine learning capabilities
- react-webcam for camera access
- react-speech-recognition for speech-to-text functionality
- CSS for responsive mobile-first design

## How to Use
1. Allow camera and microphone access when prompted
2. Position your face in the camera view
3. Speak naturally while the app detects your facial expressions
4. View the detected emotion in large text at the bottom of the screen
5. Your spoken words will appear below the emotion text

## Project Structure
- `src/App.tsx` - Main application component with webcam, face detection, and speech recognition
- `src/App.css` - Styling for the application with mobile-first approach
- `public/models/weights/` - Pre-trained models for facial expression detection

## Future Enhancements
As requested, the application has been built with a modular structure that supports future design improvements:
- Enhanced UI with more sophisticated animations
- Emotion history tracking and analysis
- Custom theming options
- Offline capability
- Multi-language support

## Running the Application Locally
1. Extract the zip file
2. Navigate to the project directory
3. Install dependencies: `pnpm install`
4. Start development server: `pnpm run dev`
5. Build for production: `pnpm run build`

## Browser Compatibility
- Chrome (recommended for best speech recognition support)
- Firefox
- Safari
- Edge

## Mobile Device Support
The application is designed with a mobile-first approach and works on:
- iOS devices (Safari)
- Android devices (Chrome)
