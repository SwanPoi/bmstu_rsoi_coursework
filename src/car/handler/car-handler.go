package handler

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/SwanPoi/bmstu_rsoi_lab2/src/car/models"
)

/*
* Получение всех машин по фильтрам
 */

func (h *CarHandler) GetCars(ctx *gin.Context) {
	pageStr := ctx.DefaultQuery("page", "1")
	sizeStr := ctx.DefaultQuery("size", "1")
	showAll := ctx.Query("showAll") == "true"
	
	page, err := strconv.Atoi(pageStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, models.ErrorResponse{Message: err.Error()})
		return
	}
	
	size, err := strconv.Atoi(sizeStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, models.ErrorResponse{Message: err.Error()})
		return
	}
	
	if page < 1 {
		ctx.JSON(http.StatusBadRequest, models.ErrorResponse{Message: "Page must be not less than 0"})
		return
	}
	
	if size < 1 || size > 100 {
		ctx.JSON(http.StatusBadRequest, models.ErrorResponse{Message: "Size must be greater than 0 but smaller than 101"})
		return
	}

	var excludeIds []string
	if excludeIdsStr := ctx.Query("excludeIds"); excludeIdsStr != "" {
		excludeIds = strings.Split(excludeIdsStr, ",")
	}

	carsResponse, err := h.services.GetCars(page, size, showAll, excludeIds)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: err.Error()})
		return
	}
	
	ctx.JSON(http.StatusOK, carsResponse)
}
// func (h *CarHandler) GetCars(ctx *gin.Context) {
// 	pageStr := ctx.DefaultQuery("page", "1")
// 	sizeStr := ctx.DefaultQuery("size", "1")
// 	showAll := ctx.Query("showAll") == "true"

// 	page, err := strconv.Atoi(pageStr)
// 	if err != nil {
// 		ctx.JSON(http.StatusBadRequest, models.ErrorResponse{Message: err.Error()})
// 		return
// 	}

// 	size, err := strconv.Atoi(sizeStr)
// 	if err != nil {
// 		ctx.JSON(http.StatusBadRequest, models.ErrorResponse{Message: err.Error()})
// 		return
// 	}

// 	if page < 1 {
// 		ctx.JSON(http.StatusBadRequest, models.ErrorResponse{Message: "Page must be not less than 0"})
// 		return
// 	}

// 	if size < 1 || size > 100 {
// 		ctx.JSON(http.StatusBadRequest, models.ErrorResponse{Message: "Size must be greater than 0 but smaller than 101"})
// 		return
// 	}

// 	carsResponse, err := h.services.GetCars(page, size, showAll)
// 	if err != nil {
// 		ctx.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: err.Error()})
// 		return
// 	}

// 	ctx.JSON(http.StatusOK, carsResponse)
// }

/*
* Получение машин по идентификаторам
 */
func (h *CarHandler) GetCarsBatch(ctx *gin.Context) {
	var req models.CarsRequest

	if err := ctx.BindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, models.ErrorResponse{Message: "Bad cars request model"})
		return
	}

	cars, err := h.services.GetCarsByUids(req.UIDs)

	if err != nil {
		ctx.JSON(http.StatusInternalServerError, err)
		return
	}

	ctx.JSON(http.StatusOK, cars)
}

/*
* Получение информации о машине по идентификатору
 */
func (h *CarHandler) GetCarById(ctx *gin.Context) {
	carUid := ctx.Param("uid")
	if _, err := uuid.Parse(carUid); err != nil {
		ctx.JSON(http.StatusBadRequest, models.ErrorResponse{Message: "CarUid must be valid"})
		return
	}

	isFullStr := ctx.DefaultQuery("isFull", "false")
	isFull := isFullStr == "true"

	var carData interface{}
	var err error

	if isFull {
		carData, err = h.services.GetFullCarByUid(carUid)
	} else {
		carData, err = h.services.GetCarByUid(carUid)
	}

	if err != nil {
		if errors.Is(err, models.ErrorNotFound) {
			message := "Car with car_uid = " + carUid + " is not found"
			ctx.JSON(http.StatusNotFound, models.ErrorResponse{Message: message})
		} else {
			ctx.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: err.Error()})
		}
		return
	}

	ctx.JSON(http.StatusOK, carData)
}

func (h *CarHandler) UpdateCar(ctx *gin.Context) {
	carUid := ctx.Param("uid")

	if _, err := uuid.Parse(carUid); err != nil {
		ctx.JSON(http.StatusBadRequest, models.ErrorResponse{Message: "Car Uid must be valid"})
		return
	}

	var req models.CarUpsert

	if err := ctx.BindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, models.ErrorResponse{Message: "Bad Car Upsert body"})
		return
	}

	updatedCar, err := h.services.UpdateCar(req, carUid)
	if err != nil {
		if err == models.ErrorNotFound {
			message := "Car with uid = " + carUid + " is not found"
			ctx.JSON(http.StatusNotFound, models.ErrorResponse{Message: message})
		} else {
			ctx.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: err.Error()})
		}

		return
	}

	ctx.JSON(http.StatusOK, updatedCar)
}

func (h *CarHandler) CreateCar(ctx *gin.Context) {
	var req models.Car

	if err := ctx.BindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, models.ErrorResponse{Message: "Bad Car creation body"})
		return
	}

	if req.Brand == "" || req.Model == "" || req.RegistrationNumber == "" || req.Price == 0 {
		ctx.JSON(http.StatusBadRequest, models.ErrorResponse{Message: "Brand, Model, RegistrationNumber and Price are required"})
		return
	}

	validTypes := map[string]bool{"SEDAN": true, "SUV": true, "MINIVAN": true, "ROADSTER": true}
	if req.Type != "" && !validTypes[req.Type] {
		ctx.JSON(http.StatusBadRequest, models.ErrorResponse{Message: "Invalid car type. Must be SEDAN, SUV, MINIVAN, or ROADSTER"})
		return
	}

	createdCar, err := h.services.CreateCar(req)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Failed to create car: " + err.Error()})
		return
	}

	ctx.JSON(http.StatusCreated, createdCar)
}
