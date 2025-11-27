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

type DetailLogRequest struct {
	Date string `json:"date"`
}

type DetailLogResponse struct {
	ID     int       `json:"id"`
	Detail string    `json:"detail"`
	Date   time.Time `json:"date"`
}
