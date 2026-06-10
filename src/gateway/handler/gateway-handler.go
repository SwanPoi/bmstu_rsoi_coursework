package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"time"
	"strings"

	"github.com/SwanPoi/bmstu_rsoi_lab2/src/gateway/converters"
	"github.com/SwanPoi/bmstu_rsoi_lab2/src/gateway/models"
	cb "github.com/SwanPoi/bmstu_rsoi_lab2/src/gateway/circuitBreaker"
	queue "github.com/SwanPoi/bmstu_rsoi_lab2/src/gateway/queue"

	"github.com/gin-gonic/gin"
)

func forwardRequest(c *gin.Context, method, targetURL string, headers map[string]string, body []byte) (int, []byte, http.Header, error) {
	if len(c.Request.URL.RawQuery) > 0 {
		targetURL = fmt.Sprintf("%s?%s", targetURL, c.Request.URL.RawQuery)
	}

	req, err := http.NewRequest(method, targetURL, bytes.NewReader(body))
	if err != nil {
		return 0, nil, nil, err
	}

	if token, exists := c.Get("raw_token"); exists {
        req.Header.Set("Authorization", "Bearer " + token.(string))
    }

	for k, v := range headers {
		req.Header.Set(k, v)
	}

	if c.Request.Header.Get("Content-Type") != "" {
		req.Header.Set("Content-Type", c.Request.Header.Get("Content-Type"))
	}

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return 0, nil, nil, err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return resp.StatusCode, nil, resp.Header, err
	}

	return resp.StatusCode, respBody, resp.Header, nil
}

// Функция forward с Circuit Breaker
func (h *GatewayHandler) forwardRequestWithCB(
	c *gin.Context,
	method, targetURL string,
	headers map[string]string,
	body []byte,
	cb *cb.CircuitBreaker,
	isCritical bool,
) (int, []byte, http.Header, error) {

	if !cb.AllowRequest() {
		if isCritical {
			log.Println(targetURL + " is unavailable (critical)")
			return 0, nil, nil, fmt.Errorf(targetURL + " is unavailable")
		}
		log.Println(targetURL + " is unavailable (not critical)")
		return http.StatusOK, []byte("{}"), nil, nil
	}

	if len(c.Request.URL.RawQuery) > 0 {
		targetURL = fmt.Sprintf("%s?%s", targetURL, c.Request.URL.RawQuery)
	}

	req, err := http.NewRequest(method, targetURL, bytes.NewReader(body))
	if err != nil {
		cb.RecordFailure()
		return 0, nil, nil, err
	}

	if token, exists := c.Get("raw_token"); exists {
        req.Header.Set("Authorization", "Bearer " + token.(string))
    }

	for k, v := range headers {
		req.Header.Set(k, v)
	}

	if c.Request.Header.Get("Content-Type") != "" {
		req.Header.Set("Content-Type", c.Request.Header.Get("Content-Type"))
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		cb.RecordFailure()
		return 0, nil, nil, err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		cb.RecordFailure()
		return resp.StatusCode, nil, resp.Header, err
	}

	if resp.StatusCode >= 500 {
		cb.RecordFailure()
		if isCritical {
			return resp.StatusCode, respBody, resp.Header, fmt.Errorf("service error: %d", resp.StatusCode)
		}
		return http.StatusOK, []byte("{}"), nil, nil
	}

	cb.RecordSuccess()
	return resp.StatusCode, respBody, resp.Header, nil
}

// Rollbacks
func (h *GatewayHandler) rollbackCarBooking(ctx *gin.Context, carUID string) {
	carStatusUpsert := models.CarStatusUpsert{Availability: true}
	carStatusBytes, _ := json.Marshal(carStatusUpsert)
	forwardRequest(ctx, "PATCH", h.config.CarUrl + "/cars/" + carUID, nil, carStatusBytes)
}

func (h *GatewayHandler) rollbackPayment(ctx *gin.Context, paymentUID string) {
	paymentStatusUpsert := models.PaymentUpsert{Status: "CANCELED"}
	paymentStatusBytes, _ := json.Marshal(paymentStatusUpsert)
	forwardRequest(ctx, "PATCH", h.config.PaymentUrl + "/payment/" + paymentUID, nil, paymentStatusBytes)
}

func (h *GatewayHandler) rollbackRental(ctx *gin.Context, rentalUID string, headers map[string]string) {
	rentalStatusUpsert := models.RentalUpsert{Status: "CANCELED"}
	rentalStatusBytes, _ := json.Marshal(rentalStatusUpsert)

	rentalUrl := h.config.RentalUrl + "/rental/" + rentalUID
	forwardRequest(ctx, "PATCH", rentalUrl, headers, rentalStatusBytes)
}



// Main functions
func (h *GatewayHandler) GetCars(ctx *gin.Context) {
    dateFromStr := ctx.Query("dateFrom")
    dateToStr := ctx.Query("dateTo")
    var excludeIdsStr string

    if dateFromStr != "" && dateToStr != "" {
        originalRawQuery := ctx.Request.URL.RawQuery  
        ctx.Request.URL.RawQuery = ""

        rentalUrl := fmt.Sprintf("%s/rental/booked?dateFrom=%s&dateTo=%s", 
            h.config.RentalUrl, dateFromStr, dateToStr)
        
        rentalStatus, rentalBody, _, rentalErr := h.forwardRequestWithCB(
            ctx, "GET", rentalUrl, nil, nil, h.rentalCB, false,
        )

        ctx.Request.URL.RawQuery = originalRawQuery

        if rentalErr != nil || rentalStatus != http.StatusOK {
            log.Printf("WARNING: Rental Service unavailable, skipping date filter. Error: %v", rentalErr)
        } else {
            var bookedCarUIDs []string
            if len(rentalBody) > 2 && string(rentalBody) != "{}" {
                if err := json.Unmarshal(rentalBody, &bookedCarUIDs); err == nil && len(bookedCarUIDs) > 0 {
                    excludeIdsStr = strings.Join(bookedCarUIDs, ",")
                }
            }
        }
    }

    queryParams := url.Values{}
    if page := ctx.Query("page"); page != "" {
        queryParams.Set("page", page)
    }
    if size := ctx.Query("size"); size != "" {
        queryParams.Set("size", size)
    }
    if showAll := ctx.Query("showAll"); showAll != "" {
        queryParams.Set("showAll", showAll)
    }
    if excludeIdsStr != "" {
        queryParams.Set("excludeIds", excludeIdsStr)
    }

    originalRawQuery := ctx.Request.URL.RawQuery
    ctx.Request.URL.RawQuery = queryParams.Encode()
    status, body, headers, err := h.forwardRequestWithCB(ctx, "GET", h.config.CarUrl+"/cars", nil, nil, h.carCB, true)
    ctx.Request.URL.RawQuery = originalRawQuery

    if err != nil {
        log.Println("GET /cars, ", err.Error())
        ctx.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Car Service unavailable"})
        return
    }

    ctx.Data(status, headers.Get("Content-Type"), body)
}

func (h *GatewayHandler) GetCarById(ctx *gin.Context) {
	carUid := ctx.Param("uid")
	if carUid == "" {
		ctx.JSON(http.StatusBadRequest, models.ErrorResponse{Message: "CarUid is required"})
		return
	}

	carUrl := fmt.Sprintf("%s/cars/%s?isFull=true", h.config.CarUrl, carUid)

	status, body, headers, err := h.forwardRequestWithCB(ctx, "GET", carUrl, nil, nil, h.carCB, true)
	if err != nil {
		log.Println("GET /cars/:uid, ", err.Error())
		ctx.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Car Service unavailable"})
		return
	}

	ctx.Data(status, headers.Get("Content-Type"), body)
}

// func (h *GatewayHandler) GetCars(ctx *gin.Context) {
// 	status, body, headers, err := h.forwardRequestWithCB(ctx, "GET", h.config.CarUrl + "/cars", nil, nil, h.carCB, true)

// 	if err != nil {
// 		log.Println("GET /cars, ", err.Error())
// 		ctx.JSON(http.StatusInternalServerError, models.ErrorResponse{ Message: "Car Service unavailable" })
// 		return
// 	}

// 	ctx.Data(status, headers.Get("Content-Type"), body)
// }

func (h *GatewayHandler) CreateCar(ctx *gin.Context) {
	bodyBytes, err := io.ReadAll(ctx.Request.Body)
	if err != nil {
		log.Println("POST /cars, invalid body")
		ctx.JSON(http.StatusBadRequest, models.ErrorResponse{Message: "Fail during reading of request body for car creation"})
		return
	}

	ctx.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

	var carReq models.CarInsertRequest
	if err := json.Unmarshal(bodyBytes, &carReq); err != nil {
		log.Println("POST /cars, body parsing error, ", err.Error())
		ctx.JSON(http.StatusBadRequest, models.ErrorResponse{Message: "Car creation request parsing error"})
		return
	}

	if carReq.Brand == "" || carReq.Model == "" || carReq.RegistrationNumber == "" || carReq.Price == 0 {
		ctx.JSON(http.StatusBadRequest, models.ErrorResponse{Message: "Brand, Model, RegistrationNumber and Price are required"})
		return
	}

	status, body, headers, err := h.forwardRequestWithCB(ctx, "POST", h.config.CarUrl+"/cars", nil, bodyBytes, h.carCB, true)
	if err != nil {
		log.Println("POST /cars, ", err.Error())
		ctx.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Car Service unavailable"})
		return
	}

	ctx.Data(status, headers.Get("Content-Type"), body)
}

func (h *GatewayHandler) GetUserRentals(ctx *gin.Context) {
	// 1. Получить аренды
	status, body, _, err := h.forwardRequestWithCB(ctx, "GET", h.config.RentalUrl + "/rental", nil, nil, h.rentalCB, true)

	if err != nil {
		log.Println("GET /rentals, can't get rentals", err.Error())
		ctx.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Rental Service unavailable"})
		return
	}

	if status != http.StatusOK {
		ctx.Data(status, "application/json", body)
		return
	}

	var rentals []models.RentalInfo
	if err := json.Unmarshal(body, &rentals); err != nil {
		log.Println("GET /rentals, rental parsing error, ", err.Error())
		ctx.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Rental parsing error"})
		return
	}

	carUIDs := make([]string, len(rentals))
	paymentUIDs := make([]string, len(rentals))

	for i, rental := range rentals {
		carUIDs[i] = rental.CarUID
		paymentUIDs[i] = rental.PaymentUID
	}
	// 2. Получить автомобили
	carUrl := h.config.CarUrl + "/cars/query"
	carsRequest := models.CarsRequest{ UIDs: carUIDs }
	carReqBody, _ := json.Marshal(carsRequest)

	carStatus, carBody, _, err := h.forwardRequestWithCB(ctx, "POST", carUrl, nil, carReqBody, h.carCB, false)
	if err != nil {
		log.Println("GET /rentals, can't get cars, ", err.Error())
	}

	var cars []models.ShortCarResponse
	if err == nil && carStatus == http.StatusOK && len(carBody) > 2 && string(carBody) != "{}" {
		if err := json.Unmarshal(carBody, &cars); err != nil {
			log.Println("GET /rentals, car parsing error, ", err.Error())
			cars = nil
		}
	}
	
	// 3. Получить оплаты
	paymentUrl := h.config.PaymentUrl + "/payment/query"
	paymentsRequest := models.PaymentsRequest{ UIDs: paymentUIDs }
	paymentsReqBody, _ := json.Marshal(paymentsRequest)

	paymentStatus, paymentBody, _, err := h.forwardRequestWithCB(ctx, "POST", paymentUrl, nil, paymentsReqBody, h.paymentCB, false)
	if err != nil {
		log.Println("GET /rentals, can't get payments, ", err.Error())
	}

	var payments []models.PaymentInfo
	if err == nil && paymentStatus == http.StatusOK && len(paymentBody) > 2 && string(paymentBody) != "{}" {
		if err := json.Unmarshal(paymentBody, &payments); err != nil {
			log.Println("GET /rentals, payments parsing error, ", err.Error())
			payments = nil
		}
	}
	
	// 4. Смэтчить в массив RentalResponse
	carMap := make(map[string]models.CarInfo)
	if cars != nil {
		for _, car := range cars {
			carMap[car.CarUID] = models.CarInfo{
				CarUID:            car.CarUID,
				Brand:             car.Brand,
				Model:             car.Model,
				RegistrationNumber: car.RegistrationNumber,
			}
		}
	}

	for _, rental := range rentals {
		if _, exists := carMap[rental.CarUID]; !exists {
			carMap[rental.CarUID] = models.CarInfo{CarUID: rental.CarUID}
		}
	}

    paymentMap := make(map[string]models.PaymentInfo)
	if payments != nil {
		for _, payment := range payments {
			paymentMap[payment.PaymentUID] = payment
		}
	}

	for _, rental := range rentals {
		if _, exists := paymentMap[rental.PaymentUID]; !exists {
			paymentMap[rental.PaymentUID] = models.PaymentInfo{PaymentUID: rental.PaymentUID}
		}
	}

	rentalsResponse := make([]models.RentalResponse, len(rentals))

	for i, rental := range rentals {
		rentalsResponse[i] = converters.ConvertToRentalResponse(rental, carMap[rental.CarUID], paymentMap[rental.PaymentUID])
	}

	ctx.JSON(http.StatusOK, rentalsResponse)
}

func (h *GatewayHandler) GetRentalById(ctx *gin.Context) {
	rentalUid := ctx.Param("rentalUid")

	if rentalUid == "" {
		log.Println("GET /rental/:id, need valid uid")
		ctx.JSON(http.StatusBadRequest, models.ErrorResponse{Message: "RentalUid is required"})
	}

	rentalUrl := h.config.RentalUrl + "/rental/" + rentalUid
	
	status, body, _, err := h.forwardRequestWithCB(ctx, "GET", rentalUrl, nil, nil, h.rentalCB, true)

	if err != nil {
		log.Println("GET /rental/:id, can't get rental with id = " + rentalUid + ", ", err.Error())
		ctx.JSON(http.StatusInternalServerError, models.ErrorResponse{ Message: "Rental Service unavailable" })
		return
	}

	if status != http.StatusOK {
		log.Println("GET /rental/:id, rental getting error with uid = " + rentalUid)
		ctx.Data(status, "application/json", body)
		return
	}

	var rental models.RentalInfo
	if err := json.Unmarshal(body, &rental); err != nil {
		log.Println("GET /rental/:id, rental parsing error")
		ctx.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Rental parsing error"})
		return
	}

	// Получить авто
	carUrl := h.config.CarUrl + "/cars/" + rental.CarUID

	carStatus, carBody, _, err := h.forwardRequestWithCB(ctx, "GET", carUrl, nil, nil, h.carCB, false)
	// if err != nil {
	// 	log.Println("GET /rental/:id, can't get car with uid = " + rental.CarUID + " ", err.Error())
	// 	ctx.JSON(http.StatusBadGateway, models.ErrorResponse{Message: err.Error()})
	// 	return
	// }

	if carStatus != http.StatusOK && err == nil {
		log.Println("GET /rental/:id, car getting error with uid = " + rental.CarUID + " ")
		ctx.Data(carStatus, "application/json", carBody)
		return
	}

	var car models.CarInfo
	if err == nil && carStatus == http.StatusOK && len(carBody) > 2 && string(carBody) != "{}" {
		var carResponse models.ShortCarResponse
		if err := json.Unmarshal(carBody, &carResponse); err == nil {
			car = models.CarInfo{
				CarUID:            carResponse.CarUID,
				Brand:             carResponse.Brand,
				Model:             carResponse.Model,
				RegistrationNumber: carResponse.RegistrationNumber,
			}
		} else {
			car = models.CarInfo{CarUID: rental.CarUID}
		}
	} else {
		car = models.CarInfo{CarUID: rental.CarUID}
	}
	
	// Получить оплату
	paymentUrl := h.config.PaymentUrl + "/payment/" + rental.PaymentUID

	paymentStatus, paymentBody, _, err := h.forwardRequestWithCB(ctx, "GET", paymentUrl, nil, nil, h.paymentCB, false)

	if paymentStatus != http.StatusOK && err == nil {
		log.Println("GET /rental/:id, payment getting error with with uid = " + rental.CarUID + " ")
		ctx.Data(paymentStatus, "application/json", paymentBody)
		return
	}

	var payment models.PaymentInfo
	if err == nil && paymentStatus == http.StatusOK && len(paymentBody) > 2 && string(paymentBody) != "{}" {
		if err := json.Unmarshal(paymentBody, &payment); err != nil {
			payment = models.PaymentInfo{PaymentUID: rental.PaymentUID}
		}
	} else {
		payment = models.PaymentInfo{PaymentUID: rental.PaymentUID}
	}

	response := converters.ConvertToRentalResponse(rental, car, payment)

	ctx.JSON(http.StatusOK, response)

}

func (h *GatewayHandler) RentCar(ctx *gin.Context) {
	usernameRaw, exists := ctx.Get("username")
	if !exists {
		log.Println("POST /rental, Need username for rentals")
		ctx.JSON(http.StatusBadRequest, models.ErrorResponse{Message: "Username is required"})
		return
	}
	username, ok := usernameRaw.(string)
	if !ok {
		ctx.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Username should be string"})
		return
	}

	bodyBytes, err := io.ReadAll(ctx.Request.Body)
	if err != nil {
		log.Println("POST /rental, invalid body")
		ctx.JSON(http.StatusBadRequest, models.ErrorResponse{Message: "Fail during reading of request body for car rent"})
		return
	}

	ctx.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

	var rentReq models.RentCreationRequest
	if err := json.Unmarshal(bodyBytes, &rentReq); err != nil {
		log.Println("POST /rental, body parsing error, ", err.Error())
		ctx.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Rent request parsing error"})
		return
	}

	// 1. Проверка, что автомобиль существует
	checkCarUrl := fmt.Sprintf("%s/cars/%s?isFull=true", h.config.CarUrl, rentReq.CarUID)

	carStatus, carBody, _, err := forwardRequest(ctx, "GET", checkCarUrl, nil, nil)
	if err != nil {
		log.Println("POST /rental, can't get car with uid = " + rentReq.CarUID + " ", err.Error())
		ctx.JSON(http.StatusServiceUnavailable, models.ErrorResponse{ Message: "Car Service unavailable" })
		return
	}

	if carStatus != http.StatusOK {
		log.Println("POST /rental, car getting error with uid = " + rentReq.CarUID + " ")
		ctx.Data(carStatus, "application/json", carBody)
		return
	}

	var carResponse models.FullCarResponse
	if err := json.Unmarshal(carBody, &carResponse); err != nil {
		log.Println("POST /rental, car parsing error with uid = " + rentReq.CarUID)
		ctx.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Car parsing error"})
		return
	}

	// 2. Проверка, не забронирован ли автомобиль на эти даты
	bookedUrl := fmt.Sprintf("%s/rental/booked?dateFrom=%s&dateTo=%s",
		h.config.RentalUrl, rentReq.DateFrom, rentReq.DateTo)

	bookedStatus, bookedBody, _, bookedErr := h.forwardRequestWithCB(
		ctx, "GET", bookedUrl, nil, nil, h.rentalCB, false,
	)

	if bookedErr != nil || bookedStatus != http.StatusOK {
		log.Printf("WARNING: Rental Service unavailable during booking check. Error: %v", bookedErr)
		ctx.JSON(http.StatusServiceUnavailable, models.ErrorResponse{Message: "Rental Service unavailable, cannot verify car availability"})
		return
	}

	var bookedCarUIDs []string
	if len(bookedBody) > 2 && string(bookedBody) != "{}" {
		if err := json.Unmarshal(bookedBody, &bookedCarUIDs); err != nil {
			log.Println("POST /rental, booked cars parsing error: ", err.Error())
			ctx.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Failed to parse booked cars"})
			return
		}
	}

	for _, bookedUID := range bookedCarUIDs {
		if bookedUID == rentReq.CarUID {
			log.Println("POST /rental, car with uid = " + rentReq.CarUID + " is already booked for these dates")
			ctx.JSON(http.StatusBadRequest, models.ErrorResponse{
				Message: "Car is already booked for the selected dates",
			})
			return
		}
	}

	// 3. Создание оплаты
	payCreateReq := models.PaymentCreateRequest{
		DateFrom: rentReq.DateFrom,
		DateTo:   rentReq.DateTo,
		PricePerDay: carResponse.Price,
	}

	payCreateBytes, err := json.Marshal(payCreateReq)
	if err != nil {
		log.Println("POST /rental, payment request marshaling error, ", err.Error())
		ctx.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Payment Creation request marshaling error"})
		return
	}

	payStatus, payBody, _, err := forwardRequest(ctx, "POST", h.config.PaymentUrl+"/payment", nil, payCreateBytes)
	if err != nil {
		log.Println("POST /rental, can't create payment, ", err.Error())
		ctx.JSON(http.StatusServiceUnavailable, models.ErrorResponse{Message: "Payment Service unavailable"})
		return
	}

	if payStatus != http.StatusOK {
		log.Println("POST /rental, payment creation error")
		ctx.Data(payStatus, "application/json", payBody)
		return
	}

	var paymentResponse models.PaymentCreationResponse
	if err := json.Unmarshal(payBody, &paymentResponse); err != nil {
		log.Println("POST /rental, payment parsing, ", err.Error())
		ctx.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Payment response parsing error"})
		return
	}

	// 4. Создание аренды
	rentCreation := models.RentCreation{
		DateFrom:   rentReq.DateFrom,
		DateTo:     rentReq.DateTo,
		CarUID:     rentReq.CarUID,
		PaymentUID: paymentResponse.PaymentUID,
		Username:   username,
	}

	rentBytes, err := json.Marshal(rentCreation)
	if err != nil {
		log.Println("POST /rental, rental marshaling error, ", err.Error())
		ctx.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Rental Creation request marshaling error"})
		return
	}

	rentStatus, rentBody, _, err := forwardRequest(ctx, "POST", h.config.RentalUrl+"/rental", nil, rentBytes)
	if err != nil {
		log.Println("POST /rental, can't create rental, ", err.Error())
		h.rollbackPayment(ctx, paymentResponse.PaymentUID)
		ctx.JSON(http.StatusServiceUnavailable, models.ErrorResponse{Message: "Rental Service unavailable"})
		return
	}

	if rentStatus != http.StatusOK {
		log.Println("POST /rental, rental creation error")
		h.rollbackPayment(ctx, paymentResponse.PaymentUID)
		ctx.Data(rentStatus, "application/json", rentBody)
		return
	}

	var rentalCreationResponse models.RentalInfo
	if err := json.Unmarshal(rentBody, &rentalCreationResponse); err != nil {
		log.Println("POST /rental, can't parse rental, ", err.Error())
		ctx.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Rental Creation response parsing error"})
		return
	}

	rentResponse := converters.ConvertToCreateRentalResponse(rentalCreationResponse, paymentResponse)
	ctx.JSON(http.StatusOK, rentResponse)
}

func (h *GatewayHandler) FinishCarRent(ctx *gin.Context) {
	rentalUid := ctx.Param("rentalUid")

	if rentalUid == "" {
		ctx.JSON(http.StatusBadRequest, models.ErrorResponse{Message: "RentalUid is required"})
	}

	checkRentalUrl := h.config.RentalUrl + "/rental/" + rentalUid
	
	status, body, _, err := forwardRequest(ctx, "GET", checkRentalUrl, nil, nil)

	if err != nil {
		log.Println("POST /rental/:id/finish, can't get rental with id = " + rentalUid + ", ", err.Error())
		ctx.JSON(http.StatusServiceUnavailable, models.ErrorResponse{Message: "Rental Service unavailable"})
		return
	}

	if status != http.StatusOK {
		log.Println("POST /rental/:id/finish, rental getting error with uid = " + rentalUid)
		ctx.Data(status, "application/json", body)
		return
	}

	var rental models.RentalInfo
	if err := json.Unmarshal(body, &rental); err != nil {
		log.Println("POST /rental/:id/finish, rental parsing error")
		ctx.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Rental parsing error"})
		return
	}

	if rental.Status != "IN_PROGRESS" {
		log.Println("POST /rental/:id/finish, rental with id = ", rental.RentalUID, " is not active")
		ctx.JSON(http.StatusBadRequest, models.ErrorResponse{Message: "Rental with id = " + rental.RentalUID + " is not active"})
		return
	}

	// carStatusUpsert := models.CarStatusUpsert{
	// 	Availability: true,
	// }

	// carStatusBytes, err := json.Marshal(carStatusUpsert)

	// if err != nil {
	// 	ctx.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Car upsert marshalling error"})
	// 	return
	// }

	// carUrl := h.config.CarUrl + "/cars/" + rental.CarUID

	// carStatus, _, _, err := forwardRequest(ctx, "PATCH", carUrl, nil, carStatusBytes)
	// if err != nil || carStatus != http.StatusOK {
	// 	headers := make(map[string]string)
	// 	token, _ := ctx.Get("raw_token")

	// 	if token != nil {
	// 		headers["Authorization"] = "Bearer " + token.(string)
	// 	}

	// 	queue.EnqueueRetry(queue.RetryRequest{
	// 		Method:  "PATCH",
	// 		URL:    carUrl,
	// 		Headers: headers,
	// 		Body:    carStatusBytes,
	// 	})
	// }

	rentalReq := models.RentalUpsert{
		Status: "FINISHED",
	}

	rentalBytes, err := json.Marshal(rentalReq)

	if err != nil {
		ctx.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Payment Creation request marshaling error"})
		return
	}

	rentalUrl := h.config.RentalUrl + "/rental/" + rentalUid
	
	status, rentBody, _, err := forwardRequest(ctx, "PATCH", rentalUrl, nil, rentalBytes)

	if err != nil || status != http.StatusOK {
		headers := make(map[string]string)
		token, _ := ctx.Get("raw_token")

		if token != nil {
			headers["Authorization"] = "Bearer " + token.(string)
		}

		queue.EnqueueRetry(queue.RetryRequest{
			Method:  "PATCH",
			URL:    rentalUrl,
			Headers: headers,
			Body:    rentalBytes,
		})
	}

	var rentalResponse models.RentalInfo

	if err := json.Unmarshal(rentBody, &rentalResponse); err != nil {
		ctx.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Rental Deletion response parsing error"})
		return
	}

	ctx.Status(http.StatusNoContent)
}

func (h *GatewayHandler) RevokeRent(ctx *gin.Context) {
	// username, exists := ctx.Get("username")
	// if !exists {
	// 	log.Println("GET /rentals, Need username for rentals")
	// 	ctx.JSON(http.StatusBadRequest, models.ErrorResponse{Message: "Username is required"})
	// 	return
	// }

	rentalUid := ctx.Param("rentalUid")

	if rentalUid == "" {
		ctx.JSON(http.StatusBadRequest, models.ErrorResponse{Message: "RentalUid is required"})
	}

	checkRentalUrl := h.config.RentalUrl + "/rental/" + rentalUid
	
	status, body, _, err := forwardRequest(ctx, "GET", checkRentalUrl, nil, nil)

	if err != nil {
		log.Println("DELETE /rental/:id, can't get rental with id = " + rentalUid + ", ", err.Error())
		ctx.JSON(http.StatusServiceUnavailable, models.ErrorResponse{Message: "Rental Service unavailable"})
		return
	}

	if status != http.StatusOK {
		log.Println("DELETE /rental/:id, rental getting error with uid = " + rentalUid)
		ctx.Data(status, "application/json", body)
		return
	}

	var rental models.RentalInfo
	if err := json.Unmarshal(body, &rental); err != nil {
		log.Println("DELETE /rental/:id, rental parsing error")
		ctx.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Rental parsing error"})
		return
	}

	if rental.Status != "IN_PROGRESS" {
		log.Println("DELETE /rental/:id, rental with id = ", rental.RentalUID, " is not active")
		ctx.JSON(http.StatusBadRequest, models.ErrorResponse{Message: "Rental with id = " + rental.RentalUID + " is not active"})
		return
	}

	// carStatusUpsert := models.CarStatusUpsert{
	// 	Availability: true,
	// }

	// carStatusBytes, err := json.Marshal(carStatusUpsert)

	// if err != nil {
	// 	ctx.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Car upsert marshalling error"})
	// 	return
	// }

	// carUrl := h.config.CarUrl + "/cars/" + rental.CarUID

	// carStatus, _, _, err := forwardRequest(ctx, "PATCH", carUrl, nil, carStatusBytes)

	// if err != nil || carStatus != http.StatusOK {
	// 	headers := make(map[string]string)
	// 	token, _ := ctx.Get("raw_token")

	// 	if token != nil {
	// 		headers["Authorization"] = "Bearer " + token.(string)
	// 	}

	// 	queue.EnqueueRetry(queue.RetryRequest{
	// 		Method:  "PATCH",
	// 		URL:     carUrl,
	// 		Headers: headers,
	// 		Body:    carStatusBytes,
	// 	})
	// 	log.Printf("Car upsert queued for retry: %s", rentalUid)
	// }

	rentalReq := models.RentalUpsert{
		Status: "CANCELED",
	}

	rentalBytes, err := json.Marshal(rentalReq)

	if err != nil {
		ctx.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Rental request marshaling error"})
		return
	}

	rentalUrl := h.config.RentalUrl + "/rental/" + rentalUid
	
	status, rentBody, _, err := forwardRequest(ctx, "PATCH", rentalUrl, nil, rentalBytes)

	if err != nil || status != http.StatusOK  {
		headers := make(map[string]string)
		token, _ := ctx.Get("raw_token")

		if token != nil {
			headers["Authorization"] = "Bearer " + token.(string)
		}

		queue.EnqueueRetry(queue.RetryRequest{
			Method:  "PATCH",
			URL:    rentalUrl,
			Headers: headers,
			Body:    rentalBytes,
		})
	}

	var rentalResponse models.RentalInfo

	if err := json.Unmarshal(rentBody, &rentalResponse); err != nil {
		ctx.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Rental Deletion response parsing error"})
		return
	}

	paymentStatusUpsert := models.PaymentUpsert{
		Status: "CANCELED",
	}

	paymentStatusBytes, err := json.Marshal(paymentStatusUpsert)

	if err != nil {
		ctx.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Payment upsert marshalling error"})
		return
	}

	paymentUrl := h.config.PaymentUrl + "/payment/" + rentalResponse.PaymentUID

	paymentStatus, _, _, err := forwardRequest(ctx, "PATCH", paymentUrl, nil, paymentStatusBytes)
	if err != nil || paymentStatus != http.StatusOK {
		headers := make(map[string]string)
		token, _ := ctx.Get("raw_token")

		if token != nil {
			headers["Authorization"] = "Bearer " + token.(string)
		}

		queue.EnqueueRetry(queue.RetryRequest{
			Method:  	"PATCH",
			URL:    	paymentUrl,
			Headers: 	headers,
			Body:    	paymentStatusBytes,
		})
	}

	ctx.Status(http.StatusNoContent)
}

func (h *GatewayHandler) StatsRentals(ctx *gin.Context) {
	statsUrl := h.config.StatsUrl + "/stats/rentals"

	status, body, headers, err := h.forwardRequestWithCB(ctx, "GET", statsUrl, nil, nil, h.statsCB, true)
	if err != nil {
		log.Println("GET /stats/rentals, ", err.Error())
		ctx.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Stats Service unavailable"})
		return
	}

	ctx.Data(status, headers.Get("Content-Type"), body)
}

func (h *GatewayHandler) StatsPayments(ctx *gin.Context) {
	statsUrl := h.config.StatsUrl + "/stats/payments"

	status, body, headers, err := h.forwardRequestWithCB(ctx, "GET", statsUrl, nil, nil, h.statsCB, true)
	if err != nil {
		log.Println("GET /stats/payments, ", err.Error())
		ctx.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Stats Service unavailable"})
		return
	}

	ctx.Data(status, headers.Get("Content-Type"), body)
}

func (h *GatewayHandler) StatsCars(ctx *gin.Context) {
	statsUrl := h.config.StatsUrl + "/stats/cars"

	status, body, headers, err := h.forwardRequestWithCB(ctx, "GET", statsUrl, nil, nil, h.statsCB, true)
	if err != nil {
		log.Println("GET /stats/cars, ", err.Error())
		ctx.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Stats Service unavailable"})
		return
	}

	ctx.Data(status, headers.Get("Content-Type"), body)
}

func (h *GatewayHandler) StatsUsers(ctx *gin.Context) {
	statsUrl := h.config.StatsUrl + "/stats/users"

	status, body, headers, err := h.forwardRequestWithCB(ctx, "GET", statsUrl, nil, nil, h.statsCB, true)
	if err != nil {
		log.Println("GET /stats/users, ", err.Error())
		ctx.JSON(http.StatusInternalServerError, models.ErrorResponse{Message: "Stats Service unavailable"})
		return
	}

	ctx.Data(status, headers.Get("Content-Type"), body)
}

func (h *GatewayHandler) GetCurrentUser(ctx *gin.Context) {
	username, exists := ctx.Get("username")
	if !exists {
		ctx.JSON(http.StatusUnauthorized, models.ErrorResponse{Message: "Not authenticated"})
		return
	}

	var roles []string
	if r, ok := ctx.Get("roles"); ok {
		if roleSlice, ok := r.([]string); ok {
			roles = roleSlice
		}
	}

	email, _ := ctx.Get("email")
	userId, _ := ctx.Get("user_id")

	ctx.JSON(http.StatusOK, gin.H{
		"username": username,
		"user_id":  userId,
		"email":    email,
		"roles":    roles,
	})
}