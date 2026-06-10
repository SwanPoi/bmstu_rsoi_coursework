package handler

import (
	"bytes"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"time"
	"io"

	"github.com/gin-gonic/gin"
)

func generateRandomString(n int) string {
	b := make([]byte, n)
	rand.Read(b)
	return base64.RawURLEncoding.EncodeToString(b)
}

func (h *GatewayHandler) Authorize(c *gin.Context) {
	state := generateRandomString(32)
	c.SetCookie("oauth_state", state, 300, "/", "", false, true)

	authorizeURL := fmt.Sprintf("%s/api/v1/authorize?client_id=%s&redirect_uri=%s&response_type=code&scope=openid+profile+email&state=%s",
		h.config.IdpPublicURL,
        // h.config.IssuerURL,
		h.config.ClientID,
		url.QueryEscape("http://"+c.Request.Host+"/api/v1/callback"),
		state,
	)

	// Убрать после теста
	if username := c.Query("username"); username != "" {
        authorizeURL += "&username=" + url.QueryEscape(username)
    }
    if password := c.Query("password"); password != "" {
        authorizeURL += "&password=" + url.QueryEscape(password)
    }

	c.Redirect(http.StatusTemporaryRedirect, authorizeURL)
}

func (h *GatewayHandler) Callback(c *gin.Context) {
	code := c.Query("code")
	state := c.Query("state")

	if code == "" || state == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Missing code or state"})
		return
	}

	savedState, err := c.Cookie("oauth_state")
	c.SetCookie("oauth_state", "", -1, "/", "", false, true) 
	if err != nil || state != savedState {
		c.JSON(http.StatusForbidden, gin.H{"message": "Invalid state parameter (CSRF protection)"})
		return
	}

	redirectURI := "http://" + c.Request.Host + "/api/v1/callback"
	tokenURL := fmt.Sprintf("%s/oauth/token", h.config.IssuerURL)

	formData := url.Values{}
	formData.Set("grant_type", "authorization_code")
	formData.Set("code", code)
	formData.Set("redirect_uri", redirectURI)
	formData.Set("client_id", h.config.ClientID)
	formData.Set("client_secret", h.config.ClientSecret)

	req, _ := http.NewRequest("POST", tokenURL, bytes.NewBufferString(formData.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil || resp.StatusCode != http.StatusOK {
		c.JSON(http.StatusServiceUnavailable, gin.H{"message": "Failed to exchange code for token"})
		return
	}
	defer resp.Body.Close()

	var tokenResp struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int    `json:"expires_in"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to parse token response"})
		return
	}

	c.SetCookie("access_token", tokenResp.AccessToken, tokenResp.ExpiresIn, "/", "", false, true)

	c.Redirect(http.StatusTemporaryRedirect, h.config.FrontendURL+"/post-login")
}

func (h *GatewayHandler) Logout(c *gin.Context) {
	c.SetCookie("access_token", "", -1, "/", "", false, true)
	c.Redirect(http.StatusTemporaryRedirect, h.config.FrontendURL)
}

func (h *GatewayHandler) RegisterPageRedirect(c *gin.Context) {
    redirectURI := url.QueryEscape(h.config.FrontendURL + "/login?registered=true")
    
    targetURL := fmt.Sprintf("%s/api/v1/register-page?redirect_uri=%s", 
        h.config.IdpPublicURL, 
        redirectURI,
    )
    
    c.Redirect(http.StatusTemporaryRedirect, targetURL)
}

func (h *GatewayHandler) RegisterUser(c *gin.Context) {
    bodyBytes, err := io.ReadAll(c.Request.Body)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"message": "Failed to read request body"})
        return
    }

    targetURL := fmt.Sprintf("%s/api/v1/register", h.config.IssuerURL)
    req, err := http.NewRequest("POST", targetURL, bytes.NewReader(bodyBytes))
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to create proxy request"})
        return
    }

    req.Header.Set("Content-Type", "application/json")

    client := &http.Client{Timeout: 10 * time.Second}
    resp, err := client.Do(req)
    if err != nil {
        c.JSON(http.StatusServiceUnavailable, gin.H{"message": "Identity Provider unavailable"})
        return
    }
    defer resp.Body.Close()

    respBody, _ := io.ReadAll(resp.Body)
    
    c.Data(resp.StatusCode, resp.Header.Get("Content-Type"), respBody)
}

func (h *GatewayHandler) CreateUser(c *gin.Context) {
    bodyBytes, err := io.ReadAll(c.Request.Body)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"message": "Failed to read request body"})
        return
    }

    targetURL := fmt.Sprintf("%s/api/v1/users", h.config.IssuerURL)
    req, err := http.NewRequest("POST", targetURL, bytes.NewReader(bodyBytes))
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to create proxy request"})
        return
    }

    req.Header.Set("Content-Type", "application/json")
    
    if token, exists := c.Get("raw_token"); exists {
        req.Header.Set("Authorization", "Bearer "+token.(string))
    }

    client := &http.Client{Timeout: 10 * time.Second}
    resp, err := client.Do(req)
    if err != nil {
        c.JSON(http.StatusServiceUnavailable, gin.H{"message": "Identity Provider unavailable"})
        return
    }
    defer resp.Body.Close()

    respBody, _ := io.ReadAll(resp.Body)
    c.Data(resp.StatusCode, resp.Header.Get("Content-Type"), respBody)
}

func (h *GatewayHandler) CreateUserPageRedirect(c *gin.Context) {
    token, err := c.Cookie("access_token")
    if err != nil || token == "" {
        c.JSON(http.StatusUnauthorized, gin.H{"message": "Authentication required"})
        return
    }

    redirectURI := url.QueryEscape(h.config.FrontendURL + "/admin/users")

    targetURL := fmt.Sprintf(
        "%s/api/v1/users/create-page?admin_token=%s&redirect_uri=%s",
        h.config.IdpPublicURL,
        url.QueryEscape(token),
        redirectURI,
    )

    c.Redirect(http.StatusTemporaryRedirect, targetURL)
}