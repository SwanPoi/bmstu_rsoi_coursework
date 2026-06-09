package handler

import (
	"net/http"
	"strings"

	"github.com/SwanPoi/bmstu_rsoi_lab2/src/gateway/models"
	"github.com/gin-gonic/gin"
)

// CustomClaims описывает структуру данных внутри вашего JWT токена
type CustomClaims struct {
	Username string   `json:"preferred_username"`
	UserId   string   `json:"user_id"`
	Email    string   `json:"email"`
	Roles    []string `json:"roles"`
}

func (h *GatewayHandler) AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		token, err := c.Cookie("access_token")
		if err != nil || token == "" {
			authHeader := c.GetHeader("Authorization")
			if strings.HasPrefix(authHeader, "Bearer ") {
				token = strings.TrimPrefix(authHeader, "Bearer ")
			} else {
				c.AbortWithStatusJSON(http.StatusUnauthorized, models.ErrorResponse{Message: "Authentication required"})
				return
			}
		}

		idToken, err := h.verifier.Verify(c.Request.Context(), token)
		if err != nil {
			c.SetCookie("access_token", "", -1, "/", "", false, true) // Очистка невалидной куки
			c.AbortWithStatusJSON(http.StatusUnauthorized, models.ErrorResponse{Message: "Invalid or expired token"})
			return
		}

		var claims CustomClaims
		if err := idToken.Claims(&claims); err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, models.ErrorResponse{Message: "Failed to parse token claims"})
			return
		}

		c.Set("username", claims.Username)
		c.Set("user_id", claims.UserId)
		c.Set("email", claims.Email)
		c.Set("roles", claims.Roles)
		c.Set("raw_token", token)

		c.Request.Header.Set("Authorization", "Bearer "+token)

		c.Next()
	}
}

func (h *GatewayHandler) RolesMiddleware(allowedRoles []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRolesInterface, exists := c.Get("roles")
		if !exists {
			c.AbortWithStatusJSON(http.StatusForbidden, models.ErrorResponse{Message: "Access denied: roles not found"})
			return
		}

		userRoles, ok := userRolesInterface.([]string)
		if !ok {
			c.AbortWithStatusJSON(http.StatusForbidden, models.ErrorResponse{Message: "Access denied: invalid internal roles structure"})
			return
		}

		for _, allowed := range allowedRoles {
			for _, userRole := range userRoles {
				if userRole == allowed {
					c.Next()
					return
				}
			}
		}

		c.AbortWithStatusJSON(http.StatusForbidden, models.ErrorResponse{Message: "Access denied: insufficient privileges"})
	}
}

// func (h *GatewayHandler) AuthMiddleware() gin.HandlerFunc {
// 	return func(c *gin.Context) {
// 		token, err := c.Cookie("access_token")
// 		if err != nil || token == "" {
// 			c.AbortWithStatusJSON(http.StatusUnauthorized, models.ErrorResponse{Message: "Authentication required (cookie missing)"})
// 			return
// 		}

// 		idToken, err := h.verifier.Verify(c.Request.Context(), token)
// 		if err != nil {
// 			c.SetCookie("access_token", "", -1, "/", "", false, true) 
// 			c.AbortWithStatusJSON(http.StatusUnauthorized, models.ErrorResponse{Message: "Invalid or expired token: " + err.Error()})
// 			return
// 		}

// 		var claims CustomClaims
// 		if err := idToken.Claims(&claims); err != nil {
// 			c.AbortWithStatusJSON(http.StatusUnauthorized, models.ErrorResponse{Message: "Failed to parse token claims"})
// 			return
// 		}

// 		c.Set("username", claims.Username)
//         c.Set("user_id", claims.UserId)
// 		c.Set("roles", claims.Roles)
// 		c.Set("raw_token", token)

// 		c.Request.Header.Set("Authorization", "Bearer "+token)

// 		c.Next()
// 	}
// }

