package model

import "time"

type FingerLogResult struct {
	NIK        string      `json:"nik"`
	FullName   string      `json:"full_name"`
	Timestamps []time.Time `json:"timestamps"` // Slice yang akan diisi
}

// Structure sementara untuk memindai setiap baris dari database
type RawFingerLog struct {
	NIK       string
	FullName  string
	Timestamp time.Time
}

type FingerLogRequest struct {
	Date string `json:"date"`
}
