package models

import "time"

type BaseModel struct {
	Id      string    `json:"id,omitempty"`
	Created time.Time `json:"created,omitempty"`
	Updated time.Time `json:"updated,omitempty"`
}
