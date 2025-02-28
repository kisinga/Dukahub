package models

import validation "github.com/go-ozzo/ozzo-validation/v4"

type LoginFormValue struct {
	Username string
	Password string
}

func (lfv LoginFormValue) Validate() error {
	return validation.ValidateStruct(&lfv,
		validation.Field(&lfv.Username, validation.Required, validation.Length(3, 50)),
		validation.Field(&lfv.Password, validation.Required),
	)
}
