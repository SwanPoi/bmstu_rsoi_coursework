package event

import "errors"

var ErrInvalidTransaction = errors.New("invalid transaction type: expected *gorm.DB")