package repository

import (
	"Steril-App/model"
	"database/sql"
	"fmt"
	"log"
	"time"
)

type FingerLogRepository struct {
	DB *sql.DB
}

func NewFingerLogRepostory(db *sql.DB) *FingerLogRepository {
	return &FingerLogRepository{DB: db}
}

func (repo *FingerLogRepository) AddFingerLog(nik string) error {
	query := `INSERT INTO fingerlog (nik) VALUES ($1)`
	result, err := repo.DB.Exec(query, nik)
	if err != nil {
		// Log error SQL yang mungkin terjadi (misal: NIK sudah ada/duplikat)
		fmt.Println("gagal")
		return fmt.Errorf("gagal insert log finger: %w", err)
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		fmt.Println("gagal ini")
		log.Printf("Gagal mendapatkan jumlah baris terpengaruh: %v", err)
	}

	if rowsAffected == 0 {
		fmt.Println("0")
		return fmt.Errorf("insert user gagal: 0 baris terpengaruh")
	}
	return nil
}

func (repo *FingerLogRepository) GetFingerLog(date string) ([]model.FingerLogResult, error) {
	query := `SELECT
    u.nik,
    u.full_name,
    f.timestamp
    FROM
        fingerlog f
    JOIN
        users u ON f.nik = u.nik
    WHERE
        f.timestamp::date = $1
    ORDER BY
        u.nik ASC,
        f.timestamp ASC;`

	// Query ke database
	result, err := repo.DB.Query(query, date)
	if err != nil {
		return nil, fmt.Errorf("error executing query: %w", err)
	}
	defer result.Close()

	// 1. Slice untuk menampung hasil akhir (Agar urutan terjaga)
	var data []model.FingerLogResult

	// 2. Map 'pembantu' untuk melacak posisi index berdasarkan NIK
	// Key: NIK, Value: Index di dalam slice 'data'
	indices := make(map[string]int)

	for result.Next() {
		var row model.RawFingerLog

		if err := result.Scan(&row.NIK, &row.FullName, &row.Timestamp); err != nil {
			return nil, fmt.Errorf("gagal scan data :%w", err)
		}

		// Cek apakah NIK ini sudah pernah kita masukkan ke slice 'data'?
		if idx, exists := indices[row.NIK]; exists {
			// KASUS: SUDAH ADA
			// Kita ambil data di slice berdasarkan index-nya, lalu append timestamp
			data[idx].Timestamps = append(data[idx].Timestamps, row.Timestamp)

			// fmt.Println("Append data ke:", row.NIK)
		} else {
			// KASUS: BELUM ADA (Data Baru)
			newEntry := model.FingerLogResult{
				NIK:        row.NIK,
				FullName:   row.FullName,
				Timestamps: []time.Time{row.Timestamp},
			}

			// Masukkan ke slice utama
			data = append(data, newEntry)

			// Catat posisi index-nya di map
			// len(data)-1 adalah index elemen yang baru saja kita masukkan
			indices[row.NIK] = len(data) - 1

			// fmt.Println("Buat entry baru:", row.NIK)
		}
	}

	// Tidak perlu looping map lagi disini, karena 'data' sudah terisi rapi & urut
	return data, nil
}

func (db *FingerLogRepository) GetDetailLog(request model.DetailLogRequest) (*model.DetailLogResponse, error) {
	response := model.DetailLogResponse{}
	query := `SELECT * FROM detaillog where "date" = $1`
	err := db.DB.QueryRow(query, request.Date).Scan(&response.ID, &response.Detail, &response.Date)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("tidak ada data :%w", err)

		}
		fmt.Println(err)

		return nil, fmt.Errorf("gagal mengambil data ke tabel detail :%w", err)
	}
	fmt.Println(response.Detail)

	return &response, nil
}
