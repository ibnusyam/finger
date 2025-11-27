#include <ESP8266WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <SoftwareSerial.h>
#include <Adafruit_Fingerprint.h>
#include <Wire.h> 
#include <LiquidCrystal_I2C.h>

// --- KONFIGURASI WIFI & SERVER ---
// const char* ssid = "Ibnu";
// const char* password = "12345678";
// const char* backend_ip = "192.168.0.2"; 
// const int backend_port = 8080;

const char* ssid = "PRD_2.4G";
const char* password = "Qw3rtyGrapha2023";
const char* backend_ip = "192.168.0.58"; 
const int backend_port = 8080;



// --- PIN DEFINITION ---
SoftwareSerial mySerial(D6, D5); // RX=D5, TX=D6
const int pinBuzzer = D7; 

LiquidCrystal_I2C lcd(0x27, 16, 2);
WebSocketsClient webSocket;
Adafruit_Fingerprint finger = Adafruit_Fingerprint(&mySerial);

// --- VARIABEL GLOBAL ---
unsigned long previousMillis = 0;
const long interval = 2000; 

bool sensorConnected = false;
unsigned long lastCheckSensor = 0;
bool isBackendConnected = false;

// --- VARIABEL FLAGS (BENDERA) ---
// Digunakan untuk memindahkan tugas berat dari Event ke Loop
bool enrollRequested = false;
int enrollId = 0;

// --- FUNGSI SMART DELAY ---
void smartDelay(unsigned long ms) {
  unsigned long start = millis();
  while (millis() - start < ms) {
    webSocket.loop(); 
    yield();          
  }
}

// --- FUNGSI BUZZER ---
void beep(int jumlah, int durasi) {
  for (int i = 0; i < jumlah; i++) {
    digitalWrite(pinBuzzer, HIGH);
    smartDelay(durasi); 
    digitalWrite(pinBuzzer, LOW);
    if (jumlah > 1) smartDelay(100);
  }
}

// --- FUNGSI LCD ---
void printToDisplay(String row1, String row2 ){
      lcd.clear();
      lcd.setCursor(0,0);
      lcd.print(row1);
      lcd.setCursor(0,1);
      lcd.print(row2);
}

// --- KIRIM DATA KE BACKEND ---
void kirimDataKeBackend(String action, int idJari, String status, String pemicu) {
  if (webSocket.isConnected()) {
    String jsonString;
    StaticJsonDocument<200> doc;
    
    doc["action"] = action; 
    doc["id"] = idJari;
    doc["status"] = status;
    doc["trigger"] = pemicu; 

    serializeJson(doc, jsonString);
    webSocket.sendTXT(jsonString);
    Serial.println(">> Data Terkirim: " + jsonString);
  } else {
    Serial.println("!! Gagal Kirim: WebSocket Terputus !!");
    isBackendConnected = false;
  }
}

// --- FUNGSI SCAN SEMUA JARI (Maintenance) ---
void scanAllFinger() {
  if (!sensorConnected) return;
  
  Serial.println("---------------------------------");
  Serial.println("Memindai seluruh ID (1-127)...");
  
  int templatesTerpakai = 0;
  
  for (int id = 1; id <= 127; id++) {
    webSocket.loop(); 
    yield();

    uint8_t status = finger.loadModel(id);
    if (status == FINGERPRINT_OK) {
      Serial.printf("ID #%d \t -> ✅ TERPAKAI\n", id);
      templatesTerpakai++;
    } 
  }
  
  Serial.println("== Selesai Memindai ==");
  kirimDataKeBackend("SCAN", templatesTerpakai, "SUCCES", "Alat-1");
  beep(2, 100); 
}

// --- FUNGSI HAPUS JARI ---
void deleteFingerprint(uint8_t id) {
  if (!sensorConnected) return;

  Serial.print("Menghapus ID #"); Serial.println(id);
  uint8_t p = finger.deleteModel(id);

  if (p == FINGERPRINT_OK) {
    Serial.println("SUKSES: ID dihapus!");
    beep(2, 200); 
    kirimDataKeBackend("DELETE", id, "SUCCES", "Alat-1");
  } else {
    Serial.print("Error Hapus: 0x"); Serial.println(p, HEX);
    beep(3, 50); 
  }
}

// --- FUNGSI DAFTAR JARI BARU ---
void getFingerprintEnroll(uint8_t id) {
  if (!sensorConnected) {
    printToDisplay("Sensor Error", "Cek Kabel");
    return;
  }

  Serial.println("Tempelkan jari Anda...");
  printToDisplay("Tempel jari", "anda");
  
  while (finger.getImage() != FINGERPRINT_OK) {
    webSocket.loop(); 
    yield();
  }
  
  finger.image2Tz(1);
  Serial.println("Gambar 1 diambil.");
  printToDisplay("Angkat Jari", "Sekarang");
  beep(1, 100); 
  
  smartDelay(2000); 

  while (finger.getImage() != FINGERPRINT_NOFINGER) {
    webSocket.loop(); yield();
  }

  Serial.println("Tempelkan JARI YANG SAMA...");
  printToDisplay("Tempel Jari", "Yang Sama");
  
  while (finger.getImage() != FINGERPRINT_OK) {
    webSocket.loop(); yield();
  }
  
  finger.image2Tz(2);
  Serial.println("Gambar 2 diambil.");
  beep(1, 100);

  Serial.println("Membuat model...");
  if (finger.createModel() != FINGERPRINT_OK) {
    Serial.println("Gagal cocok!");
    printToDisplay("Jari Tidak", "Cocok/Gagal");
    beep(3, 100); 
    return;
  }
 
  if (finger.storeModel(id) != FINGERPRINT_OK) {
    Serial.println("Gagal simpan!");
    return;
  }
 
  Serial.printf("SUKSES SIMPAN ID #%d\n", id);
  printToDisplay("DAFTAR SUKSES", "ID: " + String(id));
  beep(1, 1000); 
  kirimDataKeBackend("ADD", id, "SUCCES", "Alat-1");
  smartDelay(2000);
  printToDisplay("Siap Scan", "Tempel Jari");
}

// --- WEBSOCKET EVENT ---
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("[WS] Terputus!");
      isBackendConnected = false;
      printToDisplay("Server Terputus", "Reconnecting...");
      break;
    case WStype_CONNECTED:
      Serial.println("[WS] Terhubung!");
      isBackendConnected = true;
      printToDisplay("Server OK", "Siap Scan");
      beep(1, 100);
      break;
    case WStype_TEXT:
      Serial.printf("[WS] Pesan: %s\n", payload);
      StaticJsonDocument<200> doc;
      DeserializationError error = deserializeJson(doc, (char*)payload);
      
      if (error) return;

      const char* command = doc["Command"];
      
      if (strcmp(command, "DAFTAR_BARU") == 0) {
        // JANGAN panggil getFingerprintEnroll di sini (bisa bikin crash/timeout)
        // Aktifkan bendera agar loop() yang mengerjakannya
        enrollId = atoi(doc["id"]);
        enrollRequested = true;
      } else if(strcmp(command, "SCAN") == 0){
        scanAllFinger();
      } else if(strcmp(command, "DELETE") == 0){
        deleteFingerprint(atoi(doc["id"]));
      }
      break;
  }
}

// --- SETUP ---
void setup() {
  Serial.begin(115200);
  
  pinMode(pinBuzzer, OUTPUT);
  digitalWrite(pinBuzzer, LOW);

  lcd.init();                      
  lcd.backlight();
  
  WiFi.begin(ssid, password);
  printToDisplay("Menghubungkan", "Wifi...");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500); Serial.print("."); 
  }
  printToDisplay("WiFi OK", WiFi.localIP().toString());
  Serial.println("\nWiFi Connected");
  beep(2, 100);
  delay(1000);

  finger.begin(57600);
  if (finger.verifyPassword()) {
    Serial.println("Sensor ditemukan!");
    sensorConnected = true;
  } else {
    Serial.println("Sensor GAGAL!");
    printToDisplay("Sensor Error", "Cek Kabel!");
    sensorConnected = false;
    beep(3, 200); 
  }

  webSocket.begin(backend_ip, backend_port, "/ws");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
  webSocket.enableHeartbeat(2000, 6000, 2);
}

// --- FUNGSI UTAMA ABSENSI ---
int getFingerprintID() {
  uint8_t p = finger.getImage();
  if (p != FINGERPRINT_OK) return -1;

  p = finger.image2Tz();
  if (p != FINGERPRINT_OK) return -1;

  p = finger.fingerSearch();
  if (p != FINGERPRINT_OK) {
    Serial.println("Jari Tidak Dikenal");
    printToDisplay("Akses Ditolak", "Coba Lagi");
    beep(2, 80); 
    smartDelay(1000); 
    if (isBackendConnected) printToDisplay("Siap Scan", "Tempel Jari");
    return -1;
  }
  
  Serial.printf("Jari ID: #%d\n", finger.fingerID);
  printToDisplay("Berhasil Terkirim", "Dengan ID: " + String(finger.fingerID));
  beep(1, 300); 
  
  kirimDataKeBackend("ABSENSI", finger.fingerID, "sukses", "sensor_fisik");
  smartDelay(1500); 
  printToDisplay("Siap Scan", "Tempel Jari");
  
  return finger.fingerID; 
}

// --- LOOP UTAMA ---
void loop() {
  webSocket.loop();
  unsigned long currentMillis = millis();

  // 1. PRIORITAS TUGAS DARI BACKEND (Flag Check)
  if (enrollRequested) {
    Serial.println(">> Menjalankan Perintah Enroll...");
    getFingerprintEnroll(enrollId);
    enrollRequested = false; // Reset bendera
    enrollId = 0;
    return; // Skip scan sensor di putaran ini
  }

  // 2. AUTO RECONNECT SENSOR
  if (!sensorConnected && (currentMillis - lastCheckSensor >= 5000)) {
    lastCheckSensor = currentMillis;
    Serial.println("Mencoba konek sensor ulang...");
    
    if (finger.verifyPassword()) {
      Serial.println("Sensor KEMBALI!");
      printToDisplay("Siap Scan", "Sensor OK");
      sensorConnected = true;
      beep(1, 100);
    } else {
      printToDisplay("Sensor Error", "Reconnecting...");
    }
  }

  // 3. LOGIKA SCAN (Hanya jika sensor & backend aman)
  if (sensorConnected && isBackendConnected) {
    if (currentMillis - previousMillis >= interval) {
      int result = getFingerprintID();
      
      if (result != -1) {
         previousMillis = currentMillis;
      }
    } else {
       getFingerprintID();
    }
  }
}