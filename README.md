# Mikromimik Analiz Sistemi

Bu React uygulaması, konuşma sırasında oluşan kısa süreli yüz ifadelerini (mikromimikler) tespit eden ve bunları konuşulan kelimelerle eşleştiren gelişmiş bir web uygulamasıdır. Paul Ekman'ın mikromimik teorisine dayanan bu sistem, gerçek duyguları yansıtan 1/25 - 1/5 saniye (40-200 ms) süren ifadeleri tespit ederek, uzun süreli (sahte veya bilinçli) mimiklerden ayırt eder.

## Özellikler

- **Gerçek Mikromimik Tespiti**: 40-200 ms süren gerçek mikromimikleri tespit etme
- **Konuşma-Duygu Eşleştirmesi**: Mikromimikleri konuşulan kelimelerle gerçek zamanlı eşleştirme
- **Mobil Uyumluluk**: Cep telefonu tarayıcılarında sorunsuz çalışma
- **Yüksek Doğruluk**: Gelişmiş filtreleme ve adaptif eşik değerleri ile yüksek güvenilirlik
- **Kullanıcı Geri Bildirimi**: Sistem doğruluğunu sürekli iyileştirmek için geri bildirim mekanizmaları

## Desteklenen Duygular

Sistem, Paul Ekman'ın tanımladığı altı temel duyguyu tespit eder:
- **ANGER** (Öfke)
- **DISGUST** (Tiksinti)
- **FEAR** (Korku)
- **ENJOYMENT** (Keyif/Mutluluk)
- **SADNESS** (Üzüntü)
- **SURPRISE** (Şaşkınlık)

## Kurulum

1. Projeyi indirin veya klonlayın
2. Gerekli bağımlılıkları yükleyin:
   ```
   npm install
   ```
3. Uygulamayı başlatın:
   ```
   npm start
   ```

## Kullanım

1. Uygulamayı mobil cihazınızın tarayıcısında açın
2. Kamera ve mikrofon erişim izinlerini onaylayın
3. Yüzünüzün kamera görüş alanında olduğundan emin olun
4. Normal şekilde konuşmaya başlayın

## Optimum Kullanım İçin Öneriler

- **Işık Koşulları**: Yüzünüzün iyi aydınlatıldığından emin olun
- **Kamera Pozisyonu**: Yüzünüz kameranın merkezinde olmalı
- **Mesafe**: Cihazdan yaklaşık 30-50 cm uzaklıkta durun
- **Arka Plan**: Mümkünse sade ve az hareketli bir arka plan tercih edin
- **Ses Seviyesi**: Normal ses seviyesinde konuşun

## Model Dosyaları

Uygulamanın çalışması için face-api.js model dosyalarını `public/models/weights/` klasörüne eklemeniz gerekmektedir. Bu dosyaları şu adresten indirebilirsiniz:
https://github.com/justadudewhohacks/face-api.js/tree/master/weights

Gerekli model dosyaları:
- tiny_face_detector_model-shard1
- tiny_face_detector_model-weights_manifest.json
- face_expression_model-shard1
- face_expression_model-weights_manifest.json

## Teknik Detaylar

Sistem, modüler bir mimariye sahiptir:

1. **Görüntü İşleme Modülü**: Kamera erişimi ve yüz tespiti
2. **Mikromimik Analiz Motoru**: Yüz ifadelerinin zamansal analizi
3. **Konuşma İşleme Modülü**: Ses tanıma ve kelime segmentasyonu
4. **Senkronizasyon Modülü**: Mikromimik ve kelime eşleştirmesi
5. **Kullanıcı Arayüzü**: Sonuçların görselleştirilmesi

## Lisans

MIT
