package handler

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/coreos/go-oidc/v3/oidc"
	"github.com/gin-gonic/gin"

	config "github.com/SwanPoi/bmstu_rsoi_lab2/src/car/config"
	services "github.com/SwanPoi/bmstu_rsoi_lab2/src/car/services"
)

type CarHandler struct {
	services 	*services.CarService
	verifier 	*oidc.IDTokenVerifier
}

func NewHandler(services *services.CarService, config *config.Config) *CarHandler {
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
	
	return &CarHandler{services: services, verifier: verifier}
}

func (h *CarHandler) SetupRoutes() *gin.Engine {
	router := gin.New()

	router.GET("/manage/health", func (c *gin.Context) {
		c.Status(http.StatusOK)
	})

	api := router.Group("/api/v1")
	api.Use(h.AuthMiddleware()) 
	{
		
		cars := api.Group("/cars")
		{
			cars.GET("", h.GetCars)
			cars.POST("", h.CreateCar) 
			cars.GET("/:uid", h.GetCarById)
			cars.POST("/query", h.GetCarsBatch)
			cars.PATCH("/:uid", h.UpdateCar)
		}
	}

	return router
}