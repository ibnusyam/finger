package handler

import (
	"Steril-App/internal/repository"
	"Steril-App/model"
	"net/http"

	"github.com/labstack/echo/v4"
)

type LogFingerHandler struct {
	Repo *repository.FingerLogRepository
}

func NewLogFingerHanlere(repo *repository.FingerLogRepository) *LogFingerHandler {
	return &LogFingerHandler{Repo: repo}
}

func (h *LogFingerHandler) GetFingerLog(c echo.Context) error {
	request := model.FingerLogRequest{}
	c.Bind(&request)
	result, err := h.Repo.GetFingerLog(request.Date)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{
			"error": err,
		})
	}
	return c.JSON(http.StatusOK, result)
}
