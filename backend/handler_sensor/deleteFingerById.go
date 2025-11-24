package handlersensor

import (
	"Steril-App/model"
	"Steril-App/ws"
	"net/http"

	"github.com/labstack/echo/v4"
)

func DeleteFingerByID(c echo.Context) error {
	// 1. Ambil data ID yang mau dihapus
	payload := model.ScanCommand{}
	if err := c.Bind(&payload); err != nil {
		return c.JSON(http.StatusBadRequest, "Format data salah")
	}

	// 2. Set Perintah
	payload.Command = "DELETE"

	// 3. Kirim
	if err := ws.SendCommand(payload); err != nil {
		return err
	}

	return c.JSON(http.StatusOK, map[string]string{"status": "Perintah Hapus Terkirim"})
}
