# Microexpression Analysis Web App - Documentation

## Overview
This web application uses your device's webcam to identify facial microexpressions based on Paul Ekman's six basic emotions (anger, surprise, disgust, enjoyment, fear, and sadness) and displays them alongside spoken words in real-time.

## Features
- **True Microexpression Detection**: Captures rapid facial movements in the 1/25 to 1/5 second range
- Real-time webcam access and video display
- High-frequency facial expression sampling using requestAnimationFrame (60fps)
- Temporal analysis to identify genuine microexpressions
- Speech-to-text functionality to capture spoken words
- Real-time correlation between detected microexpressions and spoken words
- Scrollable history of emotion-word pairs
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
4. View the current detected emotion in the middle section
5. The bottom section displays a scrollable history of detected microexpressions paired with the words being spoken at that moment

## Understanding Microexpressions
Microexpressions are brief, involuntary facial expressions that occur when a person is trying to conceal or suppress an emotion. Unlike regular expressions:

- They last only 1/25 to 1/5 of a second (40-200 milliseconds)
- They are difficult to fake or control
- They often reveal true emotions that contradict what a person is saying
- They are universal across cultures

This application is specifically designed to capture these fleeting expressions and correlate them with spoken words.

## Project Structure
- `src/App.tsx` - Main application component with enhanced microexpression detection
- `src/App.css` - Styling for the application with mobile-first approach
- `public/models/weights/` - Pre-trained models for facial expression detection

## Future Enhancements
The application has been built with a modular structure that supports future improvements:
- Enhanced false positive filtering
- Emotion intensity analysis
- Emotional pattern recognition over time
- Multi-language support
- Offline capability

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

## GitHub Deployment
To deploy this application from GitHub:
1. Clone the repository
2. Install dependencies: `pnpm install`
3. Build the project: `pnpm run build`
4. Deploy the `dist` folder to any static hosting service

## Notes on Microexpression Detection
The application uses temporal analysis to identify rapid changes in facial expressions that occur within the microexpression timeframe (40-200ms). These are correlated with spoken words to provide insight into potential emotional reactions to specific content.
