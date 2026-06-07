package handler

import (
	"net/http"

	"github.com/SwanPoi/bmstu_rsoi_lab2/src/gateway/models"
	"github.com/gin-gonic/gin"
)

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
			c.AbortWithStatusJSON(http.StatusUnauthorized, models.ErrorResponse{Message: "Authentication required (cookie missing)"})
			return
		}

		idToken, err := h.verifier.Verify(c.Request.Context(), token)
		if err != nil {
			c.SetCookie("access_token", "", -1, "/", "", false, true) 
			c.AbortWithStatusJSON(http.StatusUnauthorized, models.ErrorResponse{Message: "Invalid or expired token: " + err.Error()})
			return
		}

		var claims CustomClaims
		if err := idToken.Claims(&claims); err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, models.ErrorResponse{Message: "Failed to parse token claims"})
			return
		}

		c.Set("username", claims.Username)
        c.Set("user_id", claims.UserId)
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
			c.AbortWithStatusJSON(http.StatusForbidden, models.ErrorResponse{Message: "Access denied: positions or roles not found"})
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

// package handler

// import (
// 	"net/http"
// 	"strings"

// 	"github.com/SwanPoi/bmstu_rsoi_lab2/src/gateway/models"
// 	"github.com/gin-gonic/gin"
// )

// func (h *GatewayHandler) AuthMiddleware() gin.HandlerFunc {
//     return func(c *gin.Context) {
//         authHeader := c.GetHeader("Authorization")
//         if !strings.HasPrefix(authHeader, "Bearer ") {
//             c.AbortWithStatusJSON(http.StatusUnauthorized, models.ErrorResponse{Message: "Token required"})
//             return
//         }
//         token := strings.TrimPrefix(authHeader, "Bearer ")

//         idToken, err := h.verifier.Verify(c.Request.Context(), token)
//         if err != nil {
//             c.AbortWithStatusJSON(http.StatusUnauthorized, models.ErrorResponse{Message: "Invalid or expired token: " + err.Error()})
//             return
//         }

//         var claims struct {
//             Username string `json:"preferred_username"`
//         }
//         idToken.Claims(&claims)

//         c.Set("username", claims.Username)
//         c.Set("raw_token", token)
//         c.Next()
//     }
// }