package main

import (
	"log"

	handler "github.com/SwanPoi/bmstu_rsoi_lab2/src/gateway/handler"
	config "github.com/SwanPoi/bmstu_rsoi_lab2/src/gateway/config"
	server "github.com/SwanPoi/bmstu_rsoi_lab2/src/gateway/server"
	services "github.com/SwanPoi/bmstu_rsoi_lab2/src/gateway/services"
	redis 	"github.com/SwanPoi/bmstu_rsoi_lab2/src/gateway/queue"
)

func main() {
	handlerConfig := config.Load()

	redis.InitRedis(handlerConfig.RedisAddr(), handlerConfig.RedisPassword)
	redis.StartRetryWorker()
	
	services := services.NewServices()

	handler := handler.NewHandler(services, &handlerConfig)

	srv := new(server.CommonServer)


	if err := srv.Run(handlerConfig.Addr(), handler.SetupRoutes()); err != nil {
		log.Fatal("Fail during gateway server start: ", err)
		return
	}
}