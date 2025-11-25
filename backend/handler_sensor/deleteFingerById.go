package handlersensor

import (
	"Steril-App/model"
	"Steril-App/ws"
	"fmt"
)

func DeleteFingerByID(fingerID string) error {
	// 1. Ambil data ID yang mau dihapus
	payload := model.ScanCommand{
		ID:      fingerID,
		Command: "DELETE",
	}

	// 2. Set Perintah
	payload.Command = "DELETE"
	fmt.Println(payload)

	// 3. Kirim
	if err := ws.SendCommand(payload); err != nil {
		return err
	}

	return nil
}
