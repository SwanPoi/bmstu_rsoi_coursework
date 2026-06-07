package handler

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/coreos/go-oidc/v3/oidc"
	"github.com/gin-gonic/gin"

	config "github.com/SwanPoi/bmstu_rsoi_lab2/src/payment/config"
	services "github.com/SwanPoi/bmstu_rsoi_lab2/src/payment/services"
)

type PaymentHandler struct {
	services 	*services.Services
	verifier 	*oidc.IDTokenVerifier
}

func NewHandler(services *services.Services, config *config.Config) *PaymentHandler {
	var provider *oidc.Provider
	var err error
	for i := 0; i < 20; i++ {
		provider, err = oidc.NewProvider(context.Background(), config.IssuerURL)
		if err == nil {
			break
		}
		log.Printf("Waiting for Identity Provider... (attempt %d)", i+1)
		time.Sleep(5 * time.Second)
	}
	if err != nil {
		log.Fatalf("Identity Provider is unavailable: %v", err)
	}

	verifier := provider.Verifier(&oidc.Config{ClientID: config.ClientID})

	return &PaymentHandler{services: services, verifier: verifier}
}

func (h *PaymentHandler) SetupRoutes() *gin.Engine {
	router := gin.New()

	router.GET("/manage/health", func (c *gin.Context) {
		c.Status(http.StatusOK)
	})

	api := router.Group("/api/v1") 
	api.Use(h.AuthMiddleware())
	{
		payments := api.Group("/payment")
		{
			payments.POST("", h.CreatePayment)
			payments.GET("/:uid", h.GetPaymentByUid)
			payments.POST("/query", h.GetPaymensBatch)
			payments.PATCH("/:uid", h.UpdatePayment)
		}
	}

	return router
}