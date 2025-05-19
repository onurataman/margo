// Mikromimik Analiz Sistemi - Ana Uygulama Kodu

// Global değişkenler
let emotionWordPairs = [];
let expressionBuffer = [];
let lastWord = '';
let currentWord = '';
let frameCount = 0;
let thresholdManager;

// DOM elementleri
const webcamElement = document.getElementById('webcam');
const overlayCanvas = document.getElementById('overlay');
const emotionText = document.getElementById('emotion-text');
const transcriptText = document.getElementById('transcript-text');
const emotionWordPairsElement = document.getElementById('emotion-word-pairs');
const loadingOverlay = document.getElementById('loading-overlay');

// Renk haritası
const emotionColors = {
  'ANGER': '#ff0000',     // Kırmızı
  'DISGUST': '#8b008b',   // Koyu mor
  'FEAR': '#800080',      // Mor
  'ENJOYMENT': '#ffff00', // Sarı
  'SADNESS': '#0000ff',   // Mavi
  'SURPRISE': '#ffa500',  // Turuncu
  'NEUTRAL': '#ffffff'    // Beyaz
};

// Adaptif eşik değeri yöneticisi
class AdaptiveThresholdManager {
  constructor(initialThreshold = 0.65) {
    this.currentThreshold = initialThreshold;
    this.minThreshold = 0.4;
    this.maxThreshold = 0.9;
    this.recentScores = [];
    this.maxRecentScores = 20;
    this.adjustmentRate = 0.05;
    this.falsePositiveRate = 0;
    this.truePositiveRate = 0;
    this.environmentalConditions = {
      lowLight: false
    };
  }
  
  // Yeni bir güven skoru ekle
  addScore(score, isCorrect) {
    this.recentScores.push({ score, isCorrect });
    
    // Tampon boyutunu kontrol et
    if (this.recentScores.length > this.maxRecentScores) {
      this.recentScores.shift();
    }
    
    // Doğru/yanlış pozitif oranlarını güncelle
    if (isCorrect) {
      this.truePositiveRate = this.calculatePositiveRate(true);
    } else {
      this.falsePositiveRate = this.calculatePositiveRate(false);
    }
    
    // Eşik değerini ayarla
    this.adjustThreshold();
  }
  
  // Pozitif oran hesaplama
  calculatePositiveRate(isCorrect) {
    const relevantScores = this.recentScores.filter(item => item.isCorrect === isCorrect);
    return relevantScores.length / Math.max(1, this.recentScores.length);
  }
  
  // Eşik değerini ayarla
  adjustThreshold() {
    // Hedef: Yüksek doğru pozitif, düşük yanlış pozitif
    if (this.falsePositiveRate > 0.2) {
      // Çok fazla yanlış pozitif, eşiği yükselt
      this.currentThreshold = Math.min(
        this.maxThreshold,
        this.currentThreshold + this.adjustmentRate
      );
    } else if (this.truePositiveRate < 0.5 && this.falsePositiveRate < 0.1) {
      // Çok az doğru pozitif ve kabul edilebilir yanlış pozitif, eşiği düşür
      this.currentThreshold = Math.max(
        this.minThreshold,
        this.currentThreshold - this.adjustmentRate
      );
    }
    
    // Işık koşullarına göre ayarlama
    if (this.environmentalConditions.lowLight) {
      // Düşük ışıkta eşiği biraz düşür
      this.currentThreshold = Math.max(
        this.minThreshold,
        this.currentThreshold - 0.05
      );
    }
  }
  
  // Mevcut eşik değerini al
  getCurrentThreshold() {
    return this.currentThreshold;
  }
  
  // Çevresel koşulları güncelle
  updateEnvironmentalConditions(conditions) {
    this.environmentalConditions = conditions;
  }
}

// Uygulama başlangıcı
async function startApp() {
  try {
    // Adaptif eşik değeri yöneticisini başlat
    thresholdManager = new AdaptiveThresholdManager();
    
    // Modelleri yükle
    await loadModels();
    
    // Kamerayı başlat
    await setupCamera();
    
    // Konuşma tanımayı başlat
    setupSpeechRecognition();
    
    // Yüz ifadesi tespitini başlat
    startFaceDetection();
    
    // Yükleme ekranını kaldır
    loadingOverlay.style.display = 'none';
  } catch (error) {
    console.error('Uygulama başlatma hatası:', error);
    loadingOverlay.innerHTML = `<div class="loading-text">Hata: ${error.message}</div>`;
  }
}

// Face-API modellerini yükle
async function loadModels() {
  const MODEL_URL = '/models';
  
  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
    ]);
    
    console.log('Modeller başarıyla yüklendi');
  } catch (error) {
    console.error('Model yükleme hatası:', error);
    throw new Error('Yüz tanıma modelleri yüklenemedi');
  }
}

// Kamera erişimini ayarla
async function setupCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 30, min: 25 }
      }
    });
    
    webcamElement.srcObject = stream;
    
    return new Promise((resolve) => {
      webcamElement.onloadedmetadata = () => {
        resolve();
      };
    });
  } catch (error) {
    console.error('Kamera erişim hatası:', error);
    throw new Error('Kamera erişimi sağlanamadı');
  }
}

// Konuşma tanımayı ayarla
function setupSpeechRecognition() {
  if (!('webkitSpeechRecognition' in window)) {
    transcriptText.textContent = 'Tarayıcınız konuşma tanımayı desteklemiyor.';
    return;
  }
  
  const recognition = new webkitSpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'tr-TR';
  
  recognition.onresult = (event) => {
    let transcript = '';
    
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        const text = event.results[i][0].transcript.trim();
        transcript += text + ' ';
        
        // Kelimelere ayır
        const words = text.split(' ');
        if (words.length > 0) {
          lastWord = currentWord;
          currentWord = words[words.length - 1];
        }
      }
    }
    
    if (transcript) {
      transcriptText.textContent = transcript;
    }
  };
  
  recognition.onerror = (event) => {
    console.error('Konuşma tanıma hatası:', event.error);
  };
  
  recognition.onend = () => {
    // Konuşma tanıma bittiğinde yeniden başlat
    recognition.start();
  };
  
  // Konuşma tanımayı başlat
  recognition.start();
}

// Yüz ifadesi tespitini başlat
function startFaceDetection() {
  const ctx = overlayCanvas.getContext('2d');
  
  // Canvas boyutlarını ayarla
  overlayCanvas.width = webcamElement.videoWidth;
  overlayCanvas.height = webcamElement.videoHeight;
  
  // Yüksek frekanslı tespit için requestAnimationFrame kullan
  function detectFace() {
    frameCount++;
    
    if (webcamElement.readyState === 4) {
      // Yüz tespiti yap
      faceapi.detectSingleFace(
        webcamElement, 
        new faceapi.TinyFaceDetectorOptions()
      )
      .withFaceExpressions()
      .then(detection => {
        // Canvas'ı temizle
        ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        
        if (detection) {
          // Yüz çerçevesini çiz
          const box = detection.detection.box;
          ctx.strokeStyle = '#00ff00';
          ctx.lineWidth = 2;
          ctx.strokeRect(box.x, box.y, box.width, box.height);
          
          // İfadeleri analiz et
          const expressions = detection.expressions;
          const dominantExpression = getDominantExpression(expressions);
          
          // İfade tamponuna ekle
          expressionBuffer.push({
            timestamp: Date.now(),
            expression: dominantExpression.expression,
            confidence: dominantExpression.confidence,
            expressionMap: expressions
          });
          
          // Tampon boyutunu kontrol et (son 2 saniye, ~60fps = 120 kare)
          if (expressionBuffer.length > 120) {
            expressionBuffer.shift();
          }
          
          // Mikromimikleri analiz et
          analyzeForMicroexpressions();
          
          // Ekman duygusuna dönüştür
          const ekmanEmotion = mapToEkmanEmotion(dominantExpression.expression);
          
          // Duygu metnini ve rengini güncelle
          emotionText.textContent = ekmanEmotion;
          emotionText.style.color = emotionColors[ekmanEmotion] || '#ffffff';
        }
        
        // Döngüyü devam ettir
        requestAnimationFrame(detectFace);
      })
      .catch(error => {
        console.error('Yüz tespiti hatası:', error);
        requestAnimationFrame(detectFace);
      });
    } else {
      requestAnimationFrame(detectFace);
    }
  }
  
  // Tespit döngüsünü başlat
  detectFace();
}

// Baskın ifadeyi bul
function getDominantExpression(expressions) {
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
}

// Mikromimikleri analiz et
function analyzeForMicroexpressions() {
  if (expressionBuffer.length < 5) return;
  
  // Mikromimik zaman eşikleri (ms cinsinden)
  const MIN_DURATION = 40;  // 1/25 saniye
  const MAX_DURATION = 200; // 1/5 saniye
  
  // Son birkaç kareyi analiz et
  for (let i = 2; i < expressionBuffer.length - 2; i++) {
    const prevFrame = expressionBuffer[i-2];
    const startFrame = expressionBuffer[i-1];
    const currentFrame = expressionBuffer[i];
    const nextFrame = expressionBuffer[i+1];
    const afterFrame = expressionBuffer[i+2];
    
    // Mikromimik deseni ara: önceki-sonraki ifadeler aynı, ortadaki farklı
    if (startFrame.expression !== currentFrame.expression && 
        currentFrame.expression !== nextFrame.expression &&
        startFrame.expression === nextFrame.expression) {
      
      // Süreyi hesapla
      const duration = nextFrame.timestamp - startFrame.timestamp;
      
      // Mikromimik süre aralığında mı kontrol et
      if (duration >= MIN_DURATION && duration <= MAX_DURATION) {
        // Güven skorunu hesapla
        const confidenceScore = calculateConfidenceScore(
          currentFrame.confidence,
          currentFrame.expressionMap[currentFrame.expression],
          duration
        );
        
        // Eşik değerini geç
        if (confidenceScore > thresholdManager.getCurrentThreshold()) {
          // Mikromimik tespit edildi
          const microexpression = {
            emotion: currentFrame.expression,
            startTime: startFrame.timestamp,
            endTime: nextFrame.timestamp,
            duration: duration,
            confidence: confidenceScore
          };
          
          // Konuşma ile eşleştir
          matchWithSpeech(microexpression);
        }
      }
    }
  }
}

// Güven skoru hesaplama
function calculateConfidenceScore(baseConfidence, emotionStrength, duration) {
  // İdeal mikromimik süresi ~100ms
  const durationFactor = 1 - Math.abs(duration - 100) / 100;
  
  // Bileşik güven skoru
  return baseConfidence * emotionStrength * durationFactor;
}

// Mikromimik ve konuşma eşleştirme
function matchWithSpeech(microexpression) {
  // Konuşma tanıma gecikmesi (ms)
  const SPEECH_RECOGNITION_DELAY = 500;
  
  // Mikromimik zamanını konuşma tanıma gecikmesine göre ayarla
  const adjustedMicroTime = microexpression.startTime - SPEECH_RECOGNITION_DELAY;
  
  // Kelime varsa eşleştir
  if (currentWord) {
    // Ekman duygusuna dönüştür
    const ekmanEmotion = mapToEkmanEmotion(microexpression.emotion);
    
    // Eşleşmeyi kaydet
    const emotionWordPair = {
      emotion: ekmanEmotion,
      word: currentWord,
      confidence: microexpression.confidence,
      timestamp: Date.now()
    };
    
    // Eşleşmeyi listeye ekle
    emotionWordPairs.push(emotionWordPair);
    
    // UI'ı güncelle
    updateEmotionWordPairsUI();
  }
}

// Ekman duygularına dönüştürme
function mapToEkmanEmotion(emotion) {
  const ekmanMap = {
    'angry': 'ANGER',
    'disgusted': 'DISGUST',
    'fearful': 'FEAR',
    'happy': 'ENJOYMENT',
    'sad': 'SADNESS',
    'surprised': 'SURPRISE',
    'neutral': 'NEUTRAL'
  };
  
  return ekmanMap[emotion] || emotion.toUpperCase();
}

// Duygu-kelime çiftleri UI'ını güncelle
function updateEmotionWordPairsUI() {
  // En son 10 çifti göster
  const recentPairs = emotionWordPairs.slice(-10).reverse();
  
  // HTML oluştur
  let html = '';
  
  for (const pair of recentPairs) {
    html += `
      <div class="emotion-word-pair">
        <span class="emotion" style="color: ${emotionColors[pair.emotion] || '#ffffff'}">${pair.emotion}</span>
        <span class="word">"${pair.word}"</span>
      </div>
    `;
  }
  
  // UI'ı güncelle
  emotionWordPairsElement.innerHTML = html;
}

// Işık seviyesini tespit et
function detectLightLevel() {
  // Canvas üzerinden ortalama parlaklık hesapla
  const ctx = document.createElement('canvas').getContext('2d');
  const width = 50;
  const height = 50;
  
  ctx.drawImage(webcamElement, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  let totalBrightness = 0;
  
  // Her piksel için parlaklık hesapla (RGB ortalaması)
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Ortalama parlaklık
    const brightness = (r + g + b) / 3;
    totalBrightness += brightness;
  }
  
  // Ortalama parlaklık
  const averageBrightness = totalBrightness / (width * height);
  
  // Düşük ışık koşullarını güncelle
  thresholdManager.updateEnvironmentalConditions({
    lowLight: averageBrightness < 50 // 0-255 aralığında 50'nin altı düşük ışık
  });
  
  return averageBrightness;
}

// Periyodik ışık seviyesi kontrolü
function startLightLevelDetection() {
  setInterval(() => {
    const lightLevel = detectLightLevel();
    console.log('Işık seviyesi:', lightLevel);
  }, 5000); // 5 saniyede bir kontrol et
}

// Kullanıcı geri bildirimi
function provideFeedback(feedbackType, data) {
  console.log('Kullanıcı geri bildirimi:', feedbackType, data);
  
  // Geri bildirim tipine göre işlem yap
  switch (feedbackType) {
    case 'false_positive':
      // Yanlış pozitif bildirimi
      thresholdManager.addScore(data.confidence, false);
      break;
    case 'missed_detection':
      // Kaçırılan tespit bildirimi
      thresholdManager.currentThreshold = Math.max(
        thresholdManager.minThreshold,
        thresholdManager.currentThreshold - 0.05
      );
      break;
    case 'emotion_correction':
      // Duygu düzeltme bildirimi
      thresholdManager.addScore(0.5, false);
      break;
  }
}

// Uygulamayı başlat
document.addEventListener('DOMContentLoaded', startApp);
